import { Injectable } from '@nestjs/common'
import type { BrainCandidateKind, BrainRetrievalCandidate } from '@vibey/api-shared'
import { BrainRetrievalContextRepository } from '../repositories/brain-retrieval-context.repository'
import { BrainRetrievalSearchRepository } from '../repositories/brain-retrieval-search.repository'
import { BrainRetrievalCandidateBuilder } from './brain-retrieval-candidate-builder'
import { BrainRetrievalQueryExpansionService } from './brain-retrieval-query-expansion.service'
import type {
  BrainRetrievalExpansionInput,
  BrainRetrievalLaneSearchInput,
} from './brain-retrieval.types'

const SNAPSHOT_GRAPH_MAX_DEPTH = 2
const SNAPSHOT_GRAPH_MIN_STRENGTH = 0.3

@Injectable()
export class BrainRetrievalSearchLaneService {
  private readonly candidateBuilder = new BrainRetrievalCandidateBuilder()

  constructor(
    private readonly searchRepository: BrainRetrievalSearchRepository = new BrainRetrievalSearchRepository(),
    private readonly contextRepository: BrainRetrievalContextRepository = new BrainRetrievalContextRepository(),
    private readonly queryExpansion: BrainRetrievalQueryExpansionService = new BrainRetrievalQueryExpansionService(),
  ) {}

  async searchFamilyCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    let candidates: BrainRetrievalCandidate[]
    if (input.family === 'agent') {
      const [sk, cognition, timeline] = await Promise.all([
        this.searchSkCandidates(input),
        this.searchCognitionCandidates(input),
        this.searchTimelineCandidates(input),
      ])
      candidates = [...sk, ...cognition, ...timeline]
    } else if (input.family === 'company') {
      const [objects, signals, timeline] = await Promise.all([
        this.searchCompanyObjectCandidates(input),
        this.searchCompanySignalCandidates(input),
        this.searchTimelineCandidates(input),
      ])
      candidates = [...objects, ...signals, ...timeline]
    } else {
      // Training writes Specific Knowledge (techniques, principles) into user
      // and customer brains too, so those brains get the SK lane as well.
      const [core, sk, cognition, customer, timeline] = await Promise.all([
        this.searchMemoryAndSnapshotCandidates(input),
        this.searchSkCandidates(input),
        this.searchCognitionCandidates(input),
        input.family === 'customer'
          ? this.searchCustomerBrainArtifactCandidates(input)
          : Promise.resolve([]),
        this.searchTimelineCandidates(input),
      ])
      candidates = [...core, ...sk, ...cognition, ...customer, ...timeline]
    }
    return this.filterIncludedKinds(input, candidates)
  }

  async searchQueryVariants(
    input: BrainRetrievalExpansionInput,
    variants: string[],
  ): Promise<BrainRetrievalCandidate[]> {
    const results = await Promise.all(
      variants.map((variant) =>
        this.searchFamilyCandidates({
          ...input,
          query: variant,
          embedding: null,
        }),
      ),
    )
    return results.flat()
  }

  private filterIncludedKinds(
    input: Pick<BrainRetrievalLaneSearchInput, 'includeKinds'>,
    candidates: BrainRetrievalCandidate[],
  ): BrainRetrievalCandidate[] {
    if (!input.includeKinds?.length) return candidates
    const allowedKinds = new Set<BrainCandidateKind>(input.includeKinds)
    return candidates.filter((candidate) => allowedKinds.has(candidate.kind))
  }

  private async searchMemoryAndSnapshotCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    const [memoryRows, snapshotRows] = await Promise.all([
      this.searchMemoryRows(input),
      input.family === 'customer' ? Promise.resolve([]) : this.searchSnapshotRows(input),
    ])
    const evidenceRows = await this.searchEvidenceChunkRows(input)
    return [
      ...memoryRows.map((row) => this.candidateBuilder.memoryCandidate(input, row)),
      ...snapshotRows.map((row) => this.candidateBuilder.snapshotCandidate(input, row)),
      ...evidenceRows.map((row) => this.candidateBuilder.evidenceChunkCandidate(input, row)),
    ]
  }

  private async searchMemoryRows(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<Array<Record<string, unknown>>> {
    const vectorPromise = input.embedding
      ? this.searchRepository.searchMemoryVectorRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          embedding: `[${input.embedding.join(',')}]`,
          candidateLimit: input.candidateLimit,
        })
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.searchRepository.searchMemoryLexicalRows(input.supabase, {
      ...input,
      brainId: input.brain.id,
      query: input.query,
      candidateLimit: input.candidateLimit,
    })

    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error) throw new Error(`Memory vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Memory lexical search failed: ${text.error.message}`)
    return this.candidateBuilder.mergeRankedRows(vector.data ?? [], text.data ?? [])
  }

  private async searchSnapshotRows(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<Array<Record<string, unknown>>> {
    const textPromise = this.searchRepository.searchSnapshotLexicalRows(input.supabase, {
      brainId: input.brain.id,
      query: input.query,
      candidateLimit: input.candidateLimit,
    })
    if (!input.embedding) {
      const textOnly = await textPromise
      if (textOnly.error)
        throw new Error(`Snapshot lexical search failed: ${textOnly.error.message}`)
      return textOnly.data ?? []
    }
    const { data, error } = await this.searchRepository.findSimilarSnapshots(input.supabase, {
      brainId: input.brain.id,
      embedding: `[${input.embedding.join(',')}]`,
      candidateLimit: input.candidateLimit,
    })
    if (error) throw new Error(`Snapshot search failed: ${error.message}`)
    const text = await textPromise
    if (text.error) throw new Error(`Snapshot lexical search failed: ${text.error.message}`)
    const semanticSeeds = ((data ?? []) as Array<{ id: string; similarity: number }>).map(
      (row) => ({
        id: row.id,
        score: Number(row.similarity ?? 0),
      }),
    )
    if (semanticSeeds.length === 0) return text.data ?? []

    const expandedScores = await this.expandSnapshotGraph(input, semanticSeeds)
    const ids = [...expandedScores.keys()]
    const { data: rows, error: rowsError } = await this.searchRepository.listSnapshotRows(
      input.supabase,
      {
        brainId: input.brain.id,
        ids,
      },
    )
    if (rowsError) throw new Error(`Snapshot fetch failed: ${rowsError.message}`)
    const semanticRankById = new Map(semanticSeeds.map((seed, index) => [seed.id, index + 1]))
    const graphRankById = new Map(
      [...expandedScores.entries()]
        .filter(([, score]) => score.graph > 0)
        .sort((a, b) => b[1].graph - a[1].graph)
        .map(([id], index) => [id, index + 1]),
    )
    const semanticRows = ((rows ?? []) as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      similarity: expandedScores.get(String(row.id))?.semantic ?? 0,
      graph_score: expandedScores.get(String(row.id))?.graph ?? 0,
      semantic_rank: semanticRankById.get(String(row.id)),
      graph_rank: graphRankById.get(String(row.id)),
    }))
    return this.candidateBuilder.mergeRankedRows(semanticRows, text.data ?? [])
  }

  private async expandSnapshotGraph(
    input: BrainRetrievalExpansionInput,
    semanticSeeds: Array<{ id: string; score: number }>,
  ): Promise<Map<string, { semantic: number; graph: number }>> {
    const seedIds = semanticSeeds.map((seed) => seed.id)
    const scores = new Map<string, { semantic: number; graph: number }>()
    for (const seed of semanticSeeds) scores.set(seed.id, { semantic: seed.score, graph: 0 })

    const { data, error } = await this.searchRepository.traverseSnapshotEdges(input.supabase, {
      snapshotIds: seedIds,
      maxDepth: SNAPSHOT_GRAPH_MAX_DEPTH,
      minStrength: SNAPSHOT_GRAPH_MIN_STRENGTH,
    })
    if (error) return scores

    for (const row of (data ?? []) as Array<{
      snapshot_id: string
      depth: number
      strength: number
    }>) {
      if (seedIds.includes(row.snapshot_id)) continue
      const depthPenalty = row.depth === 1 ? 1 : 0.7
      const graph = Number(row.strength ?? 0) * depthPenalty
      const current = scores.get(row.snapshot_id) ?? { semantic: 0, graph: 0 }
      scores.set(row.snapshot_id, {
        semantic: current.semantic,
        graph: Math.max(current.graph, graph),
      })
    }

    return scores
  }

  private async searchEvidenceChunkRows(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<Array<Record<string, unknown>>> {
    if (process.env.BRAIN_EVIDENCE_CHUNKS !== '1') return []
    const vectorPromise = input.embedding
      ? this.contextRepository.searchEvidenceChunkVectorRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          embedding: `[${input.embedding.join(',')}]`,
          candidateLimit: input.candidateLimit,
        })
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.contextRepository.searchEvidenceChunkTextRows(input.supabase, {
      ...input,
      brainId: input.brain.id,
      query: input.query,
      candidateLimit: input.candidateLimit,
    })

    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error)
      throw new Error(`Evidence chunk vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Evidence chunk text search failed: ${text.error.message}`)
    return this.candidateBuilder.mergeRankedRows(vector.data ?? [], text.data ?? [])
  }

  private async searchSkCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    const vectorPromise = input.embedding
      ? this.contextRepository.searchSkVectorRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          embedding: `[${input.embedding.join(',')}]`,
          candidateLimit: input.candidateLimit,
        })
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.contextRepository.searchSkTextRows(input.supabase, {
      ...input,
      brainId: input.brain.id,
      query: input.query,
      candidateLimit: input.candidateLimit,
    })

    const keywordPromise = this.searchSkKeywordRows(input)
    const [vector, text, keyword] = await Promise.all([vectorPromise, textPromise, keywordPromise])
    if (vector.error) throw new Error(`SK vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`SK text search failed: ${text.error.message}`)
    return this.candidateBuilder
      .mergeRankedRows(
        this.candidateBuilder.mergeRankedRows(vector.data ?? [], text.data ?? []),
        keyword,
      )
      .map((row) => this.candidateBuilder.skCandidate(input, row))
  }

  private async searchTimelineCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    const limit = Math.min(input.candidateLimit, 50)
    const vectorPromise = input.embedding
      ? this.contextRepository.searchTimelineVectorRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          embedding: `[${input.embedding.join(',')}]`,
          limit,
        })
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.contextRepository.searchTimelineLexicalRows(input.supabase, {
      ...input,
      brainId: input.brain.id,
      query: input.query,
      limit,
    })
    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error) throw new Error(`Timeline item vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Timeline item lexical search failed: ${text.error.message}`)
    return this.candidateBuilder
      .mergeRankedRows(vector.data ?? [], text.data ?? [])
      .map((row) => this.candidateBuilder.timelineItemCandidate(input, row))
  }

  private async searchSkKeywordRows(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<Array<Record<string, unknown>>> {
    const terms = this.queryExpansion.importantQueryTerms(input.query)
    if (terms.length === 0) return []
    const { data, error } = await this.contextRepository.searchSkKeywordRows(input.supabase, {
      ...input,
      brainId: input.brain.id,
      terms,
      candidateLimit: input.candidateLimit,
    })
    if (error) return []
    return (data ?? []) as Array<Record<string, unknown>>
  }

  private async searchCompanyObjectCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    const vectorPromise = input.embedding
      ? this.searchRepository.searchCompanyObjectVectorRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          orgId: input.brain.org_id,
          embedding: `[${input.embedding.join(',')}]`,
          candidateLimit: input.candidateLimit,
        })
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.searchRepository.searchCompanyObjectTextRows(input.supabase, {
      ...input,
      brainId: input.brain.id,
      orgId: input.brain.org_id,
      query: input.query,
      candidateLimit: input.candidateLimit,
    })

    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error) throw new Error(`Company vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Company text search failed: ${text.error.message}`)
    return this.candidateBuilder
      .mergeRankedRows(vector.data ?? [], text.data ?? [])
      .map((row) => this.candidateBuilder.companyCandidate(input, row))
  }

  private async searchCompanySignalCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    if (!input.brain.org_id) return []
    const vectorPromise = input.embedding
      ? this.contextRepository.searchCompanySignalVectorRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          orgId: input.brain.org_id,
          embedding: `[${input.embedding.join(',')}]`,
          candidateLimit: input.candidateLimit,
        })
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.contextRepository.searchCompanySignalLexicalRows(input.supabase, {
      ...input,
      brainId: input.brain.id,
      orgId: input.brain.org_id,
      query: input.query,
      candidateLimit: input.candidateLimit,
    })
    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error)
      throw new Error(`Company signal vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Company signal lexical search failed: ${text.error.message}`)
    return this.candidateBuilder
      .mergeRankedRows(vector.data ?? [], text.data ?? [])
      .map((row) => this.candidateBuilder.companySignalCandidate(input, row))
  }

  private async searchCustomerBrainArtifactCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    const avatarVectorPromise = input.embedding
      ? this.searchRepository.searchCustomerAvatarVectorRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          embedding: `[${input.embedding.join(',')}]`,
          candidateLimit: input.candidateLimit,
        })
      : Promise.resolve({ data: [], error: null })
    const avatarTextPromise = this.searchRepository.searchCustomerAvatarLexicalRows(
      input.supabase,
      {
        ...input,
        brainId: input.brain.id,
        query: input.query,
        candidateLimit: input.candidateLimit,
      },
    )
    const axisVectorPromise =
      input.embedding && input.brain.org_id
        ? this.searchRepository.searchAvatarAxisVectorRows(input.supabase, {
            orgId: input.brain.org_id,
            embedding: `[${input.embedding.join(',')}]`,
            candidateLimit: input.candidateLimit,
          })
        : Promise.resolve({ data: [], error: null })
    const axisTextPromise = input.brain.org_id
      ? this.searchRepository.searchAvatarAxisLexicalRows(input.supabase, {
          orgId: input.brain.org_id,
          query: input.query,
          candidateLimit: input.candidateLimit,
        })
      : Promise.resolve({ data: [], error: null })
    const [avatarVector, avatarText, axisVector, axisText] = await Promise.all([
      avatarVectorPromise,
      avatarTextPromise,
      axisVectorPromise,
      axisTextPromise,
    ])
    if (avatarVector.error)
      throw new Error(`Customer avatar vector search failed: ${avatarVector.error.message}`)
    if (avatarText.error)
      throw new Error(`Customer avatar lexical search failed: ${avatarText.error.message}`)
    if (axisVector.error)
      throw new Error(`Avatar axis vector search failed: ${axisVector.error.message}`)
    if (axisText.error)
      throw new Error(`Avatar axis lexical search failed: ${axisText.error.message}`)
    return [
      ...this.candidateBuilder
        .mergeRankedRows(avatarVector.data ?? [], avatarText.data ?? [])
        .map((row) => this.candidateBuilder.customerAvatarCandidate(input, row)),
      ...this.candidateBuilder
        .mergeRankedRows(axisVector.data ?? [], axisText.data ?? [])
        .map((row) => this.candidateBuilder.avatarAxisCandidate(input, row)),
    ]
  }

  private async searchCognitionCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    const limit = Math.min(input.candidateLimit, 50)
    const vector = input.embedding
      ? {
          pages: this.contextRepository.searchNarrativePageVectorRows(input.supabase, {
            ...input,
            brainId: input.brain.id,
            embedding: `[${input.embedding.join(',')}]`,
            limit,
          }),
          beliefs: this.contextRepository.searchBeliefPatternVectorRows(input.supabase, {
            ...input,
            brainId: input.brain.id,
            embedding: `[${input.embedding.join(',')}]`,
            limit,
          }),
          perspectives: this.contextRepository.searchPerspectiveVectorRows(input.supabase, {
            ...input,
            brainId: input.brain.id,
            embedding: `[${input.embedding.join(',')}]`,
            limit,
          }),
        }
      : {
          pages: Promise.resolve({ data: [], error: null }),
          beliefs: Promise.resolve({ data: [], error: null }),
          perspectives: Promise.resolve({ data: [], error: null }),
        }
    const [pageVector, beliefVector, perspectiveVector, pageText, beliefText, perspectiveText] =
      await Promise.all([
        vector.pages,
        vector.beliefs,
        vector.perspectives,
        this.contextRepository.searchNarrativePageTextRows(input.supabase, {
          brainId: input.brain.id,
          query: input.query,
          limit,
        }),
        this.contextRepository.searchBeliefPatternLexicalRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          query: input.query,
          limit,
        }),
        this.contextRepository.searchPerspectiveLexicalRows(input.supabase, {
          ...input,
          brainId: input.brain.id,
          query: input.query,
          limit,
        }),
      ])
    if (pageVector.error)
      throw new Error(`Narrative page vector search failed: ${pageVector.error.message}`)
    if (beliefVector.error)
      throw new Error(`Belief pattern vector search failed: ${beliefVector.error.message}`)
    if (perspectiveVector.error)
      throw new Error(`Perspective vector search failed: ${perspectiveVector.error.message}`)
    if (pageText.error)
      throw new Error(`Narrative page lexical search failed: ${pageText.error.message}`)
    if (beliefText.error)
      throw new Error(`Belief pattern lexical search failed: ${beliefText.error.message}`)
    if (perspectiveText.error)
      throw new Error(`Perspective lexical search failed: ${perspectiveText.error.message}`)

    return [
      ...this.candidateBuilder
        .mergeRankedRows(
          (pageVector.data ?? []) as Array<Record<string, unknown>>,
          (pageText.data ?? []) as Array<Record<string, unknown>>,
        )
        .map((row) => this.candidateBuilder.narrativePageCandidate(input, row)),
      ...this.candidateBuilder
        .mergeRankedRows(
          (beliefVector.data ?? []) as Array<Record<string, unknown>>,
          (beliefText.data ?? []) as Array<Record<string, unknown>>,
        )
        .map((row) => this.candidateBuilder.beliefCandidate(input, row)),
      ...this.candidateBuilder
        .mergeRankedRows(
          (perspectiveVector.data ?? []) as Array<Record<string, unknown>>,
          (perspectiveText.data ?? []) as Array<Record<string, unknown>>,
        )
        .map((row) => this.candidateBuilder.perspectiveCandidate(input, row)),
    ]
  }
}
