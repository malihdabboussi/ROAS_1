import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { temporalCandidateMetadata } from '@vibey/api-shared'
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
import { BrainRetrievalServiceBase02 } from './brain-retrieval-service-02.base'
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

export abstract class BrainRetrievalServiceBase03 extends BrainRetrievalServiceBase02 {
  protected baseCandidate(
    input: SearchInput & { brain: BrainRow; accessMetadata: AccessMetadata },
    row: Record<string, unknown>,
    data: {
      family: BrainSearchFamily
      kind: BrainCandidateKind
      title: string
      content: string
      sourceType: string | null
      sourceId: string | null
      sourceTitle: string | null
      semantic: number
      graph?: number
      lexical: number
      matchReason: string
    },
  ): BrainRetrievalCandidate {
    const graph = data.graph ?? 0
    const graphAdjusted =
      data.semantic > 0 || graph > 0
        ? data.semantic * SNAPSHOT_SEMANTIC_WEIGHT + graph * SNAPSHOT_GRAPH_WEIGHT
        : 0
    const rrf =
      this.rrfScore(row.semantic_rank) +
      this.rrfScore(row.lexical_rank) +
      this.rrfScore(row.graph_rank)
    const strongest = Math.max(data.semantic, data.lexical, graphAdjusted)
    const final = Math.min(
      1,
      Math.max(strongest, rrf * RRF_SCORE_SCALE) + this.metadataTieBreaker(row),
    )
    return {
      id: String(row.id),
      brain_id: input.brain.id,
      brain_scope: input.brain.scope,
      brain_owner_id: input.brain.owner_id,
      org_id: input.brain.org_id,
      effective_access: input.accessMetadata.effective_access,
      access_source: input.accessMetadata.access_source,
      family: data.family,
      kind: data.kind,
      title: data.title,
      content: data.content,
      snippet: data.content.slice(0, 240),
      source_type: data.sourceType,
      source_id: data.sourceId,
      source_title: data.sourceTitle,
      metadata: this.metadataForCandidate(row),
      temporal: temporalCandidateMetadata(row),
      lane: data.kind,
      scores: {
        ...(data.semantic > 0 ? { semantic: data.semantic } : {}),
        ...(data.lexical > 0 ? { lexical: data.lexical } : {}),
        ...(graph > 0 ? { graph } : {}),
        final,
      },
      match_reasons: [data.matchReason],
      evidence_refs: this.evidenceRefs(row),
      related: [],
    }
  }

  protected async expandRelatedContext(
    supabase: SupabaseClient,
    input: SearchInput & {
      query: string
      limit: number
      candidateLimit: number
      brain: BrainRow
      accessMetadata: AccessMetadata
    },
    candidates: BrainRetrievalCandidate[],
  ): Promise<BrainRetrievalCandidate[]> {
    const withRelated = candidates.map((candidate) => ({
      ...candidate,
      related: [...candidate.related],
    }))
    if (input.family === 'company') {
      await this.attachCompanyObjectEdges(supabase, input, withRelated)
      return withRelated
    }
    await this.attachMemoryConnections(supabase, input, withRelated)
    await this.attachBeliefRelations(supabase, input, withRelated)
    return withRelated
  }

  protected async attachMemoryConnections(
    supabase: SupabaseClient,
    input: SearchInput & { brain: BrainRow },
    candidates: BrainRetrievalCandidate[],
  ): Promise<void> {
    const memoryIds = candidates
      .filter((candidate) => candidate.kind === 'memory')
      .map((candidate) => candidate.id)
    if (memoryIds.length === 0) return
    const { source, target } = await this.retrievalRepository.findMemoryConnections(
      supabase,
      memoryIds,
    )
    if (source.error || target.error) return
    const connections = [
      ...((source.data ?? []) as Array<Record<string, unknown>>),
      ...((target.data ?? []) as Array<Record<string, unknown>>),
    ]
    const relatedIds = [
      ...new Set(
        connections
          .flatMap((connection) => [
            String(connection.source_memory_id ?? ''),
            String(connection.target_memory_id ?? ''),
          ])
          .filter((id) => id && !memoryIds.includes(id)),
      ),
    ]
    const relatedRows = await this.retrievalRepository.findRelatedMemories(
      supabase,
      input.brain.id,
      relatedIds,
    )
    const titleById = new Map(candidates.map((candidate) => [candidate.id, candidate.title]))
    for (const row of (relatedRows ?? []) as Array<Record<string, unknown>>)
      titleById.set(String(row.id), String(row.content ?? '').slice(0, 80))
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    for (const connection of connections) {
      const sourceId = String(connection.source_memory_id ?? '')
      const targetId = String(connection.target_memory_id ?? '')
      const relation = String(connection.relationship ?? 'related_to')
      if (candidateById.has(sourceId) && titleById.has(targetId))
        candidateById
          .get(sourceId)!
          .related.push({ kind: 'memory', id: targetId, relation, title: titleById.get(targetId)! })
      if (candidateById.has(targetId) && titleById.has(sourceId))
        candidateById
          .get(targetId)!
          .related.push({ kind: 'memory', id: sourceId, relation, title: titleById.get(sourceId)! })
    }
  }

  protected async attachBeliefRelations(
    supabase: SupabaseClient,
    input: SearchInput & { brain: BrainRow },
    candidates: BrainRetrievalCandidate[],
  ): Promise<void> {
    const memoryCandidates = candidates.filter((candidate) => candidate.kind === 'memory')
    const memoryIds = memoryCandidates.map((candidate) => candidate.id)
    if (memoryIds.length === 0) return
    const { data, error } = await this.retrievalRepository.findBeliefsSupportingMemories(
      supabase,
      input.brain.id,
      memoryIds,
    )
    if (error) return
    for (const belief of (data ?? []) as Array<Record<string, unknown>>) {
      const supported = Array.isArray(belief.supporting_memories)
        ? (belief.supporting_memories as string[])
        : []
      for (const candidate of memoryCandidates) {
        if (!supported.includes(candidate.id)) continue
        candidate.related.push({
          kind: 'belief_pattern',
          id: String(belief.id),
          relation: 'supports_belief',
          title: String(belief.pattern_name ?? ''),
        })
      }
    }
  }

  protected async searchCognitionCandidates(
    supabase: SupabaseClient,
    input: SearchInput & {
      query: string
      candidateLimit: number
      brain: BrainRow
      accessMetadata: AccessMetadata
      embedding?: number[] | null
    },
  ): Promise<BrainRetrievalCandidate[]> {
    const limit = Math.min(input.candidateLimit, 50)
    const vector = input.embedding
      ? {
          pages: this.retrievalRepository.searchNarrativePageVector(
            supabase,
            input.brain.id,
            input.embedding,
            limit,
          ),
          beliefs: this.retrievalRepository.searchBeliefVector(
            supabase,
            input.brain.id,
            input.embedding,
            limit,
          ),
          perspectives: this.retrievalRepository.searchPerspectiveVector(
            supabase,
            input.brain.id,
            input.embedding,
            limit,
          ),
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
        this.retrievalRepository.searchNarrativePageText(
          supabase,
          input.brain.id,
          input.query,
          limit,
        ),
        this.retrievalRepository.searchBeliefLexical(supabase, input.brain.id, input.query, limit),
        this.retrievalRepository.searchPerspectiveLexical(
          supabase,
          input.brain.id,
          input.query,
          limit,
        ),
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
      ...this.mergeRankedRows(
        (pageVector.data ?? []) as Array<Record<string, unknown>>,
        (pageText.data ?? []) as Array<Record<string, unknown>>,
      ).map((row) => this.narrativePageCandidate(input, row)),
      ...this.mergeRankedRows(
        (beliefVector.data ?? []) as Array<Record<string, unknown>>,
        (beliefText.data ?? []) as Array<Record<string, unknown>>,
      ).map((row) => this.beliefCandidate(input, row)),
      ...this.mergeRankedRows(
        (perspectiveVector.data ?? []) as Array<Record<string, unknown>>,
        (perspectiveText.data ?? []) as Array<Record<string, unknown>>,
      ).map((row) => this.perspectiveCandidate(input, row)),
    ]
  }

  protected async attachCompanyObjectEdges(
    supabase: SupabaseClient,
    input: SearchInput & { brain: BrainRow },
    candidates: BrainRetrievalCandidate[],
  ): Promise<void> {
    const objectIds = candidates
      .filter((candidate) => candidate.kind === 'company_object')
      .map((candidate) => candidate.id)
    if (objectIds.length === 0) return
    const { source, target } = await this.retrievalRepository.findCompanyObjectEdges(
      supabase,
      input.brain.id,
      objectIds,
    )
    if (source.error || target.error) return
    const edges = [
      ...((source.data ?? []) as Array<Record<string, unknown>>),
      ...((target.data ?? []) as Array<Record<string, unknown>>),
    ]
    const relatedIds = [
      ...new Set(
        edges
          .flatMap((edge) => [
            String(edge.source_object_id ?? ''),
            String(edge.target_object_id ?? ''),
          ])
          .filter((id) => id && !objectIds.includes(id)),
      ),
    ]
    const relatedRows = await this.retrievalRepository.findCompanyObjects(
      supabase,
      input.brain.id,
      relatedIds,
    )
    const titleById = new Map(candidates.map((candidate) => [candidate.id, candidate.title]))
    for (const row of (relatedRows ?? []) as Array<Record<string, unknown>>)
      titleById.set(String(row.id), String(row.title ?? ''))
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    for (const edge of edges) {
      const sourceId = String(edge.source_object_id ?? '')
      const targetId = String(edge.target_object_id ?? '')
      const relation = String(edge.relation_type ?? 'related')
      if (candidateById.has(sourceId) && titleById.has(targetId))
        candidateById.get(sourceId)!.related.push({
          kind: 'company_object',
          id: targetId,
          relation,
          title: titleById.get(targetId)!,
        })
      if (candidateById.has(targetId) && titleById.has(sourceId))
        candidateById.get(targetId)!.related.push({
          kind: 'company_object',
          id: sourceId,
          relation,
          title: titleById.get(sourceId)!,
        })
    }
  }

  protected evidenceRefs(row: Record<string, unknown>): Array<Record<string, unknown>> {
    const metadata = row.metadata as Record<string, unknown> | undefined
    const fromMetadata = metadata?.evidence_refs
    if (Array.isArray(fromMetadata)) return fromMetadata as Array<Record<string, unknown>>
    if (Array.isArray(row.evidence_refs)) return row.evidence_refs as Array<Record<string, unknown>>
    if (Array.isArray(row.source_refs)) return row.source_refs as Array<Record<string, unknown>>
    const refs: Array<Record<string, unknown>> = []
    if (row.proof) refs.push({ type: 'proof', text: row.proof })
    if (row.challenge) refs.push({ type: 'challenge', text: row.challenge })
    if (row.source) refs.push({ type: 'source', title: row.source })
    if (Array.isArray(row.source_signal_ids))
      for (const id of row.source_signal_ids) refs.push({ type: 'source_signal', id })
    return refs
  }

  protected metadataForCandidate(row: Record<string, unknown>): Record<string, unknown> {
    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? { ...(row.metadata as Record<string, unknown>) }
        : {}
    for (const key of [
      'memory_type',
      'entry_type',
      'object_type',
      'domain',
      'confidence',
      'significance',
      'significance_score',
      'mastery',
      'tags',
      'status',
      'retrieval_rule',
      'source_signal_ids',
    ]) {
      if (row[key] !== undefined && metadata[key] === undefined) metadata[key] = row[key]
    }
    return metadata
  }

  protected applyTextSearch(query: any, rawQuery: string) {
    const websearchQuery = rawQuery.trim().replace(/\s+/g, ' ')
    if (!websearchQuery) return query
    return query.textSearch('search_vector', websearchQuery, {
      type: 'websearch',
      config: 'english',
    })
  }

  protected mergeRankedRows(
    first: Array<Record<string, unknown>>,
    second: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    const rows = new Map<string, Record<string, unknown>>()
    first.forEach((row, index) => {
      const id = String(row.id ?? '')
      if (!id) return
      rows.set(id, { ...(rows.get(id) ?? {}), ...row, semantic_rank: index + 1 })
    })
    second.forEach((row, index) => {
      const id = String(row.id ?? '')
      if (!id) return
      rows.set(id, { ...(rows.get(id) ?? {}), ...row, lexical_rank: index + 1 })
    })
    return [...rows.values()]
  }

  protected rrfScore(rank: unknown): number {
    const numericRank = Number(rank ?? 0)
    return numericRank > 0 ? 1 / (RRF_K + numericRank) : 0
  }

  protected metadataTieBreaker(row: Record<string, unknown>): number {
    const confidence = this.normalizedNumber(row.confidence)
    const significance = this.normalizedNumber(row.significance ?? row.significance_score)
    const mastery = this.normalizedNumber(row.mastery)
    return confidence * 0.03 + significance * 0.03 + mastery * 0.03
  }

  protected normalizedNumber(value: unknown): number {
    const numeric = Number(value ?? 0)
    if (!Number.isFinite(numeric) || numeric <= 0) return 0
    return Math.min(numeric, 1)
  }

  protected balanceLaneCandidates(
    candidates: BrainRetrievalCandidate[],
    candidateLimit: number,
  ): BrainRetrievalCandidate[] {
    const byLane = new Map<string, BrainRetrievalCandidate[]>()
    for (const candidate of candidates) {
      const lane = candidate.lane ?? candidate.kind
      byLane.set(lane, [...(byLane.get(lane) ?? []), candidate])
    }
    for (const laneCandidates of byLane.values())
      laneCandidates.sort((a, b) => b.scores.final - a.scores.final)
    const laneQuota = Math.max(2, Math.ceil(candidateLimit / Math.max(1, byLane.size * 2)))
    const selected = new Map<string, BrainRetrievalCandidate>()
    for (const laneCandidates of byLane.values()) {
      for (const candidate of laneCandidates.slice(0, laneQuota))
        selected.set(candidate.id, candidate)
    }
    for (const candidate of candidates.sort((a, b) => b.scores.final - a.scores.final)) {
      if (selected.size >= candidateLimit) break
      selected.set(candidate.id, candidate)
    }
    return [...selected.values()].sort((a, b) => b.scores.final - a.scores.final)
  }

  protected logRetrieval(input: {
    family: BrainSearchFamily
    brainId: string
    effectiveAccess: string
    accessSource: string
    candidates: BrainRetrievalCandidate[]
    finalCount: number
    contextSufficient: boolean
    latencyMs: number
  }): void {
    this.logger.log(
      JSON.stringify({
        feature: 'brain_retrieval_v2',
        family: input.family,
        brain_id: input.brainId,
        effective_access: input.effectiveAccess,
        access_source: input.accessSource,
        vector_count: input.candidates.filter((candidate) => candidate.scores.semantic).length,
        lexical_count: input.candidates.filter((candidate) => candidate.scores.lexical).length,
        graph_count: input.candidates.filter((candidate) => candidate.scores.graph).length,
        final_count: input.finalCount,
        context_sufficient: input.contextSufficient,
        latency_ms: input.latencyMs,
      }),
    )
  }

  protected lexicalScore(query: string, content: string, row: Record<string, unknown>): number {
    const q = query.trim().toLowerCase()
    const text = content.toLowerCase()
    if (!q || !text) return 0
    const terms = q.split(/\s+/).filter(Boolean)
    if (terms.length === 0) return 0
    const rank = Number(row.lexical_rank ?? 0)
    const rankScore = rank > 0 ? 1 / (60 + rank) : 0
    if (text.includes(q)) return Math.max(1, rankScore)
    const hits = terms.filter((term) => text.includes(term)).length
    return Math.max(hits / terms.length, rankScore)
  }
}
