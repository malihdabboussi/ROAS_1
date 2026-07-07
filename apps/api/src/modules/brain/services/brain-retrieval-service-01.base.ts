import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BrainAccessSource,
  BrainCandidateKind,
  BrainRetrievalCandidate,
  BrainRetrievalSearchInput,
  BrainRetrievalSearchResult,
  BrainSearchFamily,
  OrgRole,
} from '@vibey/api-shared'
import { BrainRetrievalArtifactsRepository } from '../repositories/brain-retrieval-artifacts.repository'
import { BrainRetrievalRepository } from '../repositories/brain-retrieval.repository'
import { BrainPermissionsService } from './brain-permissions.service'
import { BrainRerankerService } from './brain-reranker.service'
import { BrainSufficiencyService } from './brain-sufficiency.service'
import { EmbeddingService } from './embedding.service'

type BrainRow = {
  id: string
  owner_id: string
  org_id: string | null
  scope: string
  agent_id: string | null
  created_by: string | null
}

type SearchInput = BrainRetrievalSearchInput & {
  agentKey?: string
  orgRole?: string | null
}

type AccessMetadata = {
  effective_access: 'query' | 'train'
  access_source: BrainAccessSource
}

const SNAPSHOT_GRAPH_MAX_DEPTH = 2
const SNAPSHOT_GRAPH_MIN_STRENGTH = 0.3
const SNAPSHOT_SEMANTIC_WEIGHT = 0.7
const SNAPSHOT_GRAPH_WEIGHT = 0.3
const RRF_K = 60
const RRF_SCORE_SCALE = 30

export abstract class BrainRetrievalServiceBase01 {
  // Abstract declarations for methods implemented by later base classes.
  protected abstract searchSkCandidates(...args: any[]): any
  protected abstract searchSkKeywordRows(...args: any[]): any
  protected abstract searchCompanyObjectCandidates(...args: any[]): any
  protected abstract searchCompanySignalCandidates(...args: any[]): any
  protected abstract searchCustomerBrainArtifactCandidates(...args: any[]): any
  protected abstract memoryCandidate(...args: any[]): any
  protected abstract snapshotCandidate(...args: any[]): any
  protected abstract skCandidate(...args: any[]): any
  protected abstract companyCandidate(...args: any[]): any
  protected abstract narrativePageCandidate(...args: any[]): any
  protected abstract beliefCandidate(...args: any[]): any
  protected abstract perspectiveCandidate(...args: any[]): any
  protected abstract companySignalCandidate(...args: any[]): any
  protected abstract customerAvatarCandidate(...args: any[]): any
  protected abstract avatarAxisCandidate(...args: any[]): any
  protected abstract evidenceChunkCandidate(...args: any[]): any
  protected abstract timelineItemCandidate(...args: any[]): any
  protected abstract baseCandidate(...args: any[]): any
  protected abstract expandRelatedContext(...args: any[]): any
  protected abstract attachMemoryConnections(...args: any[]): any
  protected abstract attachBeliefRelations(...args: any[]): any
  protected abstract searchCognitionCandidates(...args: any[]): any
  protected abstract searchTimelineCandidates(...args: any[]): any
  protected abstract attachCompanyObjectEdges(...args: any[]): any
  protected abstract evidenceRefs(...args: any[]): any
  protected abstract metadataForCandidate(...args: any[]): any
  protected abstract applyTextSearch(...args: any[]): any
  protected abstract mergeRankedRows(...args: any[]): any
  protected abstract rrfScore(...args: any[]): any
  protected abstract metadataTieBreaker(...args: any[]): any
  protected abstract normalizedNumber(...args: any[]): any
  protected abstract balanceLaneCandidates(...args: any[]): any
  protected abstract logRetrieval(...args: any[]): any
  protected abstract lexicalScore(...args: any[]): any
  protected abstract importantQueryTerms(...args: any[]): any
  // End generated abstract declarations.

  protected readonly logger = new Logger('BrainRetrievalService')
  constructor(
    protected readonly brainPermissions: BrainPermissionsService,
    protected readonly embedding: EmbeddingService,
    protected readonly reranker: BrainRerankerService,
    protected readonly sufficiency: BrainSufficiencyService,
    protected readonly retrievalRepository: BrainRetrievalRepository,
    protected readonly retrievalArtifactsRepository: BrainRetrievalArtifactsRepository,
  ) {}

  async search(supabase: SupabaseClient, input: SearchInput): Promise<BrainRetrievalSearchResult> {
    const startedAt = Date.now()
    const query = input.query.trim()
    if (!query) return this.emptyResult(query, input.family, 'No query provided.')

    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)
    const candidateLimit = Math.min(Math.max(20, limit * 2), 50)
    const brain = await this.resolveBrain(supabase, input)
    if (!brain) return this.emptyResult(query, input.family, 'No accessible Brain found.')

    await this.brainPermissions.assertCanQueryBrain(
      supabase,
      input.userId,
      {
        orgId: input.orgId ?? null,
        orgRole: (input.orgRole as OrgRole | null | undefined) ?? null,
      },
      brain.id,
    )
    const accessMetadata = await this.resolveAccessMetadata(supabase, brain, input.userId)
    const embedding = await this.embedding.getEmbedding(query, {
      taskType: 'RETRIEVAL_QUERY',
      billing: { userId: input.userId, orgId: input.orgId },
    })

    const family = this.familyForBrain(brain, input.family)
    const candidates = await this.searchFamilyCandidates(supabase, {
      ...input,
      family,
      query,
      limit,
      candidateLimit,
      brain,
      accessMetadata,
      embedding,
    })
    const expanded = await this.expandRelatedContext(
      supabase,
      {
        ...input,
        family,
        query,
        limit,
        candidateLimit,
        brain,
        accessMetadata,
      },
      candidates,
    )
    const balanced = this.balanceLaneCandidates(expanded, candidateLimit)
    const billing = { userId: input.userId, orgId: input.orgId }
    const ranked = await this.reranker.rerank(query, balanced, limit, billing)
    const sufficiency = await this.sufficiency.evaluate(query, ranked, billing)
    this.logRetrieval({
      family,
      brainId: brain.id,
      effectiveAccess: accessMetadata.effective_access,
      accessSource: accessMetadata.access_source,
      candidates: expanded,
      finalCount: ranked.length,
      contextSufficient: sufficiency.sufficient,
      latencyMs: Date.now() - startedAt,
    })

    return {
      success: true,
      query,
      family,
      count: ranked.length,
      context_sufficient: sufficiency.sufficient,
      sufficiency,
      missing: sufficiency.missing,
      suggested_next_queries: sufficiency.suggested_next_queries,
      results: ranked,
    }
  }

  protected emptyResult(
    query: string,
    family: BrainSearchFamily,
    reason: string,
  ): BrainRetrievalSearchResult {
    const sufficiency = this.sufficiency.evaluateDeterministic(query, [])
    return {
      success: true,
      query,
      family,
      count: 0,
      context_sufficient: false,
      sufficiency: { ...sufficiency, reason },
      missing: sufficiency.missing,
      suggested_next_queries: sufficiency.suggested_next_queries,
      results: [],
    }
  }

  protected async resolveBrain(
    supabase: SupabaseClient,
    input: SearchInput,
  ): Promise<BrainRow | null> {
    if (input.brainId?.trim()) return this.loadBrain(supabase, input.brainId.trim())

    if (input.family === 'user') {
      return (await this.retrievalRepository.resolveUserBrain(
        supabase,
        input.userId,
      )) as BrainRow | null
    }

    if (input.family === 'agent' && input.agentKey?.trim()) {
      return (await this.retrievalRepository.resolveAgentBrain(supabase, {
        userId: input.userId,
        agentKey: input.agentKey.trim(),
        orgId: input.orgId,
      })) as BrainRow | null
    }

    if (input.family === 'customer' || input.family === 'company') {
      return (await this.retrievalRepository.resolveScopedBrain(supabase, {
        userId: input.userId,
        family: input.family,
        orgId: input.orgId,
      })) as BrainRow | null
    }

    return null
  }

  protected async loadBrain(supabase: SupabaseClient, brainId: string): Promise<BrainRow | null> {
    return (await this.retrievalRepository.loadBrain(supabase, brainId)) as BrainRow | null
  }

  protected familyForBrain(brain: BrainRow, fallback: BrainSearchFamily): BrainSearchFamily {
    if (
      brain.scope === 'user' ||
      brain.scope === 'agent' ||
      brain.scope === 'customer' ||
      brain.scope === 'company'
    ) {
      return brain.scope
    }
    return fallback
  }

  protected async resolveAccessMetadata(
    supabase: SupabaseClient,
    brain: BrainRow,
    userId: string,
  ): Promise<AccessMetadata> {
    if (brain.owner_id === userId || brain.created_by === userId) {
      return { effective_access: 'train', access_source: 'owner' }
    }
    const share = await this.resolveMatchingShareSource(supabase, brain, userId)
    if (share) return { effective_access: 'query', access_source: share }
    return { effective_access: 'query', access_source: 'org_baseline' }
  }

  protected async resolveMatchingShareSource(
    supabase: SupabaseClient,
    brain: BrainRow,
    userId: string,
  ): Promise<BrainAccessSource | null> {
    const userShare = await this.retrievalRepository.findUserShare(supabase, brain.id, userId)
    if (userShare?.id) return 'user_share'

    if (!brain.org_id) return null
    const orgShare = await this.retrievalRepository.findOrgShare(supabase, brain.id, brain.org_id)
    if (orgShare?.id) return 'org_share'

    const teamIds = await this.retrievalRepository.findAgentTeamIds(supabase, userId)
    if (teamIds.length === 0) return null
    const teamShare = await this.retrievalRepository.findTeamShare(supabase, brain.id, teamIds)
    return teamShare?.id ? 'team_share' : null
  }

  protected async searchFamilyCandidates(
    supabase: SupabaseClient,
    input: SearchInput & {
      query: string
      limit: number
      candidateLimit: number
      brain: BrainRow
      accessMetadata: AccessMetadata
      embedding: number[] | null
    },
  ): Promise<BrainRetrievalCandidate[]> {
    let candidates: BrainRetrievalCandidate[]
    if (input.family === 'agent') {
      const [sk, cognition, timeline] = await Promise.all([
        this.searchSkCandidates(supabase, input),
        this.searchCognitionCandidates(supabase, input),
        this.searchTimelineCandidates(supabase, input),
      ])
      candidates = [...sk, ...cognition, ...timeline]
    } else if (input.family === 'company') {
      const [objects, signals, timeline] = await Promise.all([
        this.searchCompanyObjectCandidates(supabase, input),
        this.searchCompanySignalCandidates(supabase, input),
        this.searchTimelineCandidates(supabase, input),
      ])
      candidates = [...objects, ...signals, ...timeline]
    } else {
      const [core, cognition, customer, timeline] = await Promise.all([
        this.searchMemoryAndSnapshotCandidates(supabase, input),
        this.searchCognitionCandidates(supabase, input),
        input.family === 'customer'
          ? this.searchCustomerBrainArtifactCandidates(supabase, input)
          : Promise.resolve([]),
        this.searchTimelineCandidates(supabase, input),
      ])
      candidates = [...core, ...cognition, ...customer, ...timeline]
    }
    return this.filterIncludedKinds(input, candidates)
  }

  protected filterIncludedKinds(
    input: Pick<SearchInput, 'includeKinds'>,
    candidates: BrainRetrievalCandidate[],
  ): BrainRetrievalCandidate[] {
    if (!input.includeKinds?.length) return candidates
    const allowedKinds = new Set<BrainCandidateKind>(input.includeKinds)
    return candidates.filter((candidate) => allowedKinds.has(candidate.kind))
  }

  protected async searchMemoryAndSnapshotCandidates(
    supabase: SupabaseClient,
    input: SearchInput & {
      query: string
      limit: number
      candidateLimit: number
      brain: BrainRow
      accessMetadata: AccessMetadata
      embedding: number[] | null
    },
  ): Promise<BrainRetrievalCandidate[]> {
    const [memoryRows, snapshotRows, evidenceRows] = await Promise.all([
      this.searchMemoryRows(supabase, input),
      input.family === 'customer' ? Promise.resolve([]) : this.searchSnapshotRows(supabase, input),
      this.searchEvidenceChunkRows(supabase, input),
    ])
    return [
      ...memoryRows.map((row) => this.memoryCandidate(input, row)),
      ...snapshotRows.map((row) => this.snapshotCandidate(input, row)),
      ...evidenceRows.map((row) => this.evidenceChunkCandidate(input, row)),
    ]
  }

  protected async searchMemoryRows(
    supabase: SupabaseClient,
    input: SearchInput & {
      query: string
      limit: number
      candidateLimit: number
      brain: BrainRow
      embedding: number[] | null
    },
  ): Promise<Array<Record<string, unknown>>> {
    const vectorPromise = input.embedding
      ? this.retrievalRepository.searchMemoryVector(
          supabase,
          input.brain.id,
          input.embedding,
          input.candidateLimit,
        )
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.retrievalRepository.searchMemoryLexical(
      supabase,
      input.brain.id,
      input.query,
      input.candidateLimit,
    )

    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error) throw new Error(`Memory vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Memory lexical search failed: ${text.error.message}`)
    return this.mergeRankedRows(vector.data ?? [], text.data ?? [])
  }

  protected async searchSnapshotRows(
    supabase: SupabaseClient,
    input: SearchInput & {
      query: string
      candidateLimit: number
      brain: BrainRow
      embedding: number[] | null
    },
  ): Promise<Array<Record<string, unknown>>> {
    const textPromise = this.retrievalRepository.searchSnapshotLexical(
      supabase,
      input.brain.id,
      input.query,
      input.candidateLimit,
    )
    if (!input.embedding) {
      const textOnly = await textPromise
      if (textOnly.error)
        throw new Error(`Snapshot lexical search failed: ${textOnly.error.message}`)
      return textOnly.data ?? []
    }
    const { data, error } = await this.retrievalRepository.findSimilarSnapshots(
      supabase,
      input.brain.id,
      input.embedding,
      input.candidateLimit,
    )
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
    const expandedScores = await this.expandSnapshotGraph(supabase, semanticSeeds)
    const rows = await this.retrievalRepository.findSnapshotsByIds(supabase, input.brain.id, [
      ...expandedScores.keys(),
    ])
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
    return this.mergeRankedRows(semanticRows, text.data ?? [])
  }

  protected async expandSnapshotGraph(
    supabase: SupabaseClient,
    semanticSeeds: Array<{ id: string; score: number }>,
  ): Promise<Map<string, { semantic: number; graph: number }>> {
    const seedIds = semanticSeeds.map((seed) => seed.id)
    const scores = new Map<string, { semantic: number; graph: number }>()
    for (const seed of semanticSeeds) scores.set(seed.id, { semantic: seed.score, graph: 0 })
    const { data, error } = await this.retrievalRepository.traverseSnapshotEdges(supabase, seedIds)
    if (error) return scores
    for (const row of (data ?? []) as Array<{
      snapshot_id: string
      depth: number
      strength: number
    }>) {
      if (seedIds.includes(row.snapshot_id)) continue
      const graph = Number(row.strength ?? 0) * (row.depth === 1 ? 1 : 0.7)
      const current = scores.get(row.snapshot_id) ?? { semantic: 0, graph: 0 }
      scores.set(row.snapshot_id, {
        semantic: current.semantic,
        graph: Math.max(current.graph, graph),
      })
    }
    return scores
  }

  protected async searchEvidenceChunkRows(
    supabase: SupabaseClient,
    input: SearchInput & {
      query: string
      limit: number
      candidateLimit: number
      brain: BrainRow
      embedding: number[] | null
    },
  ): Promise<Array<Record<string, unknown>>> {
    if (process.env.BRAIN_EVIDENCE_CHUNKS !== '1') return []
    const vectorPromise = input.embedding
      ? this.retrievalRepository.searchEvidenceChunkVector(
          supabase,
          input.brain.id,
          input.embedding,
          input.candidateLimit,
        )
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.retrievalRepository.searchEvidenceChunkText(
      supabase,
      input.brain.id,
      input.query,
      input.candidateLimit,
    )
    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error)
      throw new Error(`Evidence chunk vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Evidence chunk text search failed: ${text.error.message}`)
    return this.mergeRankedRows(vector.data ?? [], text.data ?? [])
  }
}
