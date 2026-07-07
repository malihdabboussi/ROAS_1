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
import { BrainPermissionsService } from './brain-permissions.service'
import { BrainRerankerService } from './brain-reranker.service'
import { BrainRetrievalServiceBase01 } from './brain-retrieval-service-01.base'
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

export abstract class BrainRetrievalServiceBase02 extends BrainRetrievalServiceBase01 {
  protected async searchSkCandidates(
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
    const vectorPromise = input.embedding
      ? this.retrievalArtifactsRepository.searchSkVector(
          supabase,
          input.brain.id,
          input.embedding,
          input.candidateLimit,
        )
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.retrievalArtifactsRepository.searchSkText(
      supabase,
      input.brain.id,
      input.query,
      input.candidateLimit,
    )
    const keywordPromise = this.searchSkKeywordRows(supabase, input)
    const [vector, text, keyword] = await Promise.all([vectorPromise, textPromise, keywordPromise])
    if (vector.error) throw new Error(`SK vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`SK text search failed: ${text.error.message}`)
    return this.mergeRankedRows(
      this.mergeRankedRows(vector.data ?? [], text.data ?? []),
      keyword,
    ).map((row) => this.skCandidate(input, row))
  }

  protected async searchSkKeywordRows(
    supabase: SupabaseClient,
    input: SearchInput & {
      query: string
      limit: number
      candidateLimit: number
      brain: BrainRow
    },
  ): Promise<Array<Record<string, unknown>>> {
    const terms = this.importantQueryTerms(input.query)
    if (terms.length === 0) return []
    return this.retrievalArtifactsRepository.searchSkKeywordRows(
      supabase,
      input.brain.id,
      terms,
      input.candidateLimit,
    )
  }

  protected async searchCompanyObjectCandidates(
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
    const vectorPromise = input.embedding
      ? this.retrievalArtifactsRepository.searchCompanyObjectVector(
          supabase,
          input.brain.id,
          input.brain.org_id,
          input.embedding,
          input.candidateLimit,
        )
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.retrievalArtifactsRepository.searchCompanyObjectText(
      supabase,
      input.brain.id,
      input.brain.org_id,
      input.query,
      input.candidateLimit,
    )
    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error) throw new Error(`Company vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Company text search failed: ${text.error.message}`)
    return this.mergeRankedRows(vector.data ?? [], text.data ?? []).map((row) =>
      this.companyCandidate(input, row),
    )
  }

  protected async searchCompanySignalCandidates(
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
    if (!input.brain.org_id) return []
    const vectorPromise = input.embedding
      ? this.retrievalArtifactsRepository.searchCompanySignalVector(
          supabase,
          input.brain.id,
          input.brain.org_id,
          input.embedding,
          input.candidateLimit,
        )
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.retrievalArtifactsRepository.searchCompanySignalText(
      supabase,
      input.brain.id,
      input.brain.org_id,
      input.query,
      input.candidateLimit,
    )
    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error)
      throw new Error(`Company signal vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Company signal lexical search failed: ${text.error.message}`)
    return this.mergeRankedRows(vector.data ?? [], text.data ?? []).map((row) =>
      this.companySignalCandidate(input, row),
    )
  }

  protected async searchCustomerBrainArtifactCandidates(
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
    const avatarVectorPromise = input.embedding
      ? this.retrievalArtifactsRepository.searchCustomerAvatarVector(
          supabase,
          input.brain.id,
          input.embedding,
          input.candidateLimit,
        )
      : Promise.resolve({ data: [], error: null })
    const avatarTextPromise = this.retrievalArtifactsRepository.searchCustomerAvatarText(
      supabase,
      input.brain.id,
      input.query,
      input.candidateLimit,
    )
    const axisVectorPromise =
      input.embedding && input.brain.org_id
        ? this.retrievalArtifactsRepository.searchAvatarAxisVector(
            supabase,
            input.brain.org_id,
            input.embedding,
            input.candidateLimit,
          )
        : Promise.resolve({ data: [], error: null })
    const axisTextPromise = input.brain.org_id
      ? this.retrievalArtifactsRepository.searchAvatarAxisText(
          supabase,
          input.brain.org_id,
          input.query,
          input.candidateLimit,
        )
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
      ...this.mergeRankedRows(avatarVector.data ?? [], avatarText.data ?? []).map((row) =>
        this.customerAvatarCandidate(input, row),
      ),
      ...this.mergeRankedRows(axisVector.data ?? [], axisText.data ?? []).map((row) =>
        this.avatarAxisCandidate(input, row),
      ),
    ]
  }

  protected async searchTimelineCandidates(
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
    const limit = Math.min(input.candidateLimit, 50)
    const vectorPromise = input.embedding
      ? this.retrievalRepository.searchTimelineItemVector(
          supabase,
          input.brain.id,
          input.embedding,
          limit,
          input,
        )
      : Promise.resolve({ data: [], error: null })
    const textPromise = this.retrievalRepository.searchTimelineItemLexical(
      supabase,
      input.brain.id,
      input.query,
      limit,
      input,
    )
    const [vector, text] = await Promise.all([vectorPromise, textPromise])
    if (vector.error)
      throw new Error(`Timeline item vector search failed: ${vector.error.message}`)
    if (text.error) throw new Error(`Timeline item lexical search failed: ${text.error.message}`)
    return this.mergeRankedRows(vector.data ?? [], text.data ?? []).map((row) =>
      this.timelineItemCandidate(input, row),
    )
  }

  protected memoryCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'memory',
      title: String(row.content ?? '').slice(0, 80),
      content: String(row.content ?? ''),
      sourceType: (row.source_type as string | null) ?? null,
      sourceId: (row.source_id as string | null) ?? null,
      sourceTitle: (row.source_title as string | null) ?? null,
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, String(row.content ?? ''), row),
      matchReason: 'Matched memory content',
    })
  }

  protected snapshotCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'snapshot',
      title: String(row.name ?? ''),
      content: String(row.core ?? ''),
      sourceType: (row.source_type as string | null) ?? null,
      sourceId: (row.source_id as string | null) ?? null,
      sourceTitle: (row.source as string | null) ?? null,
      semantic: Number(row.similarity ?? 0),
      graph: Number(row.graph_score ?? 0),
      lexical: this.lexicalScore(input.query, `${row.name ?? ''} ${row.core ?? ''}`, row),
      matchReason: 'Matched neural snapshot',
    })
  }

  protected skCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'agent',
      kind: 'sk_entry',
      title: String(row.title ?? ''),
      content: String(row.content ?? ''),
      sourceType: 'sk_source',
      sourceId: (row.source_id as string | null) ?? null,
      sourceTitle: (row.source_title as string | null) ?? null,
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, `${row.title ?? ''} ${row.content ?? ''}`, row),
      matchReason: 'Matched agent Brain knowledge',
    })
  }

  protected companyCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'company',
      kind: 'company_object',
      title: String(row.title ?? ''),
      content: String(row.truth ?? ''),
      sourceType: 'company_cortex_object',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.title ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, `${row.title ?? ''} ${row.truth ?? ''}`, row),
      matchReason: 'Matched company Brain object',
    })
  }

  protected narrativePageCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'narrative_page',
      title: String(row.title ?? ''),
      content: String(row.summary ?? row.content_md ?? ''),
      sourceType: 'narrative_page',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.title ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, `${row.title ?? ''} ${row.summary ?? ''}`, row),
      matchReason: 'Matched Brain narrative page',
    })
  }

  protected beliefCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'belief_pattern',
      title: String(row.pattern_name ?? ''),
      content: String(row.description ?? ''),
      sourceType: 'belief_pattern',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.pattern_name ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.pattern_name ?? ''} ${row.description ?? ''}`,
        row,
      ),
      matchReason: 'Matched Brain belief pattern',
    })
  }

  protected perspectiveCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'perspective',
      title: String(row.name ?? ''),
      content: String(row.description ?? row.narrative_md ?? ''),
      sourceType: 'perspective',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.name ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, `${row.name ?? ''} ${row.description ?? ''}`, row),
      matchReason: 'Matched Brain perspective',
    })
  }

  protected companySignalCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'company',
      kind: 'company_signal',
      title: String(row.signal_type ?? 'Company signal'),
      content: String(row.truth ?? ''),
      sourceType: 'company_cortex_signal',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.signal_type ?? 'Company signal'),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.signal_type ?? ''} ${row.truth ?? ''} ${row.reason ?? ''}`,
        row,
      ),
      matchReason: 'Matched company Brain signal',
    })
  }

  protected customerAvatarCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'customer',
      kind: 'customer_avatar',
      title: String(row.name ?? 'Customer avatar'),
      content: String(row.summary ?? row.narrative_md ?? ''),
      sourceType: 'customer_avatar',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.name ?? 'Customer avatar'),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.name ?? ''} ${row.summary ?? ''} ${row.narrative_md ?? ''}`,
        row,
      ),
      matchReason: 'Matched Customer Brain avatar',
    })
  }

  protected avatarAxisCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'customer',
      kind: 'avatar_axis',
      title: String(row.name ?? 'Avatar discriminator axis'),
      content: String(row.description ?? ''),
      sourceType: 'avatar_discriminator_axis',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.name ?? 'Avatar discriminator axis'),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.name ?? ''} ${row.description ?? ''} ${row.high_end_signature ?? ''} ${row.low_end_signature ?? ''}`,
        row,
      ),
      matchReason: 'Matched Customer Brain avatar discriminator axis',
    })
  }

  protected evidenceChunkCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'evidence_chunk',
      title: String(row.source_title ?? row.source_type ?? 'Evidence chunk'),
      content: String(row.content ?? ''),
      sourceType: (row.source_type as string | null) ?? null,
      sourceId: (row.source_id as string | null) ?? null,
      sourceTitle: (row.source_title as string | null) ?? null,
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.contextual_prefix ?? ''} ${row.content ?? ''}`,
        row,
      ),
      matchReason: 'Matched original Brain evidence chunk',
    })
  }

  protected timelineItemCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'timeline_item',
      title: String(row.title ?? ''),
      content: String(row.description ?? row.title ?? ''),
      sourceType: (row.source_type as string | null) ?? 'brain_timeline_item',
      sourceId: (row.source_id as string | null) ?? String(row.id ?? ''),
      sourceTitle: (row.source_title as string | null) ?? String(row.timeline_title ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.timeline_title ?? ''} ${row.title ?? ''} ${row.description ?? ''}`,
        row,
      ),
      matchReason: 'Matched Brain timeline milestone',
    })
  }
}
