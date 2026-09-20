import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { temporalCandidateMetadata, type BrainRetrievalCandidate } from '@vibey/api-shared'
import { BrainRerankerService } from '../../brain/services/brain-reranker.service'
import { BrainSufficiencyService } from '../../brain/services/brain-sufficiency.service'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { SpacesRetrievalRepository } from '../repositories/spaces-retrieval.repository'
import type {
  SpaceRetrievalCandidate,
  SpaceRetrievalSearchInput,
  SpaceRetrievalSearchResult,
  SpaceSemanticSourceType,
} from '../types/space-retrieval.types'
import { SpaceGraphExpansionService } from './space-graph-expansion.service'

const RRF_K = 60
const RRF_SCORE_SCALE = 30

@Injectable()
export class SpaceRetrievalService {
  private readonly logger = new Logger(SpaceRetrievalService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly reranker: BrainRerankerService,
    private readonly sufficiency: BrainSufficiencyService,
    @Optional() private readonly graphExpansion?: SpaceGraphExpansionService,
    private readonly repository: SpacesRetrievalRepository = new SpacesRetrievalRepository(),
  ) {}

  async search(
    supabase: SupabaseClient,
    input: SpaceRetrievalSearchInput,
  ): Promise<SpaceRetrievalSearchResult> {
    const startedAt = Date.now()
    const query = input.query.trim()
    if (!query) return this.emptyResult(query, 'No query provided.')

    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)
    const candidateLimit = Math.min(Math.max(20, limit * 3), 100)
    const queryEmbedding = await this.embedding.getEmbedding(query, {
      taskType: 'RETRIEVAL_QUERY',
      billing: { userId: input.userId, orgId: input.orgId },
    })

    const [semanticRows, lexicalRows] = await Promise.all([
      queryEmbedding
        ? this.searchVectorRows(supabase, input, queryEmbedding, candidateLimit)
        : Promise.resolve([]),
      this.searchLexicalRows(supabase, input, query, candidateLimit),
    ])
    const candidates = this.mergeRankedRows(semanticRows, lexicalRows).map((row) =>
      this.candidate(query, row),
    )
    const balanced = this.balanceLaneCandidates(candidates, candidateLimit)
    const graphExpanded = this.graphExpansion
      ? await this.graphExpansion.expandCandidates(supabase, input, balanced, candidateLimit)
      : balanced
    const billing = { userId: input.userId, orgId: input.orgId }
    const rankedBrain = await this.reranker.rerank(
      query,
      graphExpanded.map((candidate) => this.toBrainCandidate(candidate)),
      limit,
      billing,
    )
    const byId = new Map(graphExpanded.map((candidate) => [candidate.id, candidate]))
    const ranked = rankedBrain
      .map((candidate) => {
        const original = byId.get(candidate.id)
        return original
          ? {
              ...original,
              scores: candidate.scores,
              match_reasons: candidate.match_reasons,
            }
          : null
      })
      .filter((candidate): candidate is SpaceRetrievalCandidate => candidate !== null)
    const sufficiency = await this.sufficiency.evaluate(
      query,
      ranked.map((candidate) => this.toBrainCandidate(candidate)),
      billing,
    )

    this.logger.log(
      JSON.stringify({
        feature: 'space_retrieval',
        query,
        space_id: input.spaceId ?? null,
        campaign_id: input.campaignId ?? null,
        mode: input.mode ?? 'current_space',
        candidates: candidates.length,
        graph_expanded_candidates: graphExpanded.length,
        final_count: ranked.length,
        context_sufficient: sufficiency.sufficient,
        latency_ms: Date.now() - startedAt,
      }),
    )

    return {
      success: true,
      query,
      count: ranked.length,
      context_sufficient: sufficiency.sufficient,
      sufficiency,
      missing: sufficiency.missing,
      suggested_next_queries: sufficiency.suggested_next_queries,
      results: ranked,
    }
  }

  private emptyResult(query: string, reason: string): SpaceRetrievalSearchResult {
    const sufficiency = {
      sufficient: false,
      confidence: 0,
      reason,
      missing: ['No matching Space context found.'],
      suggested_next_queries: query ? [query, `${query} source evidence`] : [],
    }
    return {
      success: true,
      query,
      count: 0,
      context_sufficient: false,
      sufficiency,
      missing: sufficiency.missing,
      suggested_next_queries: sufficiency.suggested_next_queries,
      results: [],
    }
  }

  private async searchVectorRows(
    supabase: SupabaseClient,
    input: SpaceRetrievalSearchInput,
    embedding: number[],
    limit: number,
  ): Promise<Array<Record<string, unknown>>> {
    return this.repository.searchVectorRows(supabase, {
      embedding,
      limit,
      spaceId: this.modeUsesSpace(input) ? (input.spaceId ?? null) : null,
      campaignId: input.mode === 'space_plus_related' ? (input.campaignId ?? null) : null,
      sourceTypes: input.sourceTypes ?? null,
    })
  }

  private async searchLexicalRows(
    supabase: SupabaseClient,
    input: SpaceRetrievalSearchInput,
    query: string,
    limit: number,
  ): Promise<Array<Record<string, unknown>>> {
    const rows = await this.repository.searchLexicalRows(supabase, {
      query,
      limit,
      spaceId: this.modeUsesSpace(input) && input.spaceId ? input.spaceId : null,
      campaignId: input.mode === 'space_plus_related' ? (input.campaignId ?? null) : null,
      sourceTypes: input.sourceTypes ?? null,
    })
    return rows.map((row, index) => ({
      ...row,
      lexical_rank: index + 1,
    }))
  }

  private modeUsesSpace(input: SpaceRetrievalSearchInput): boolean {
    return (input.mode ?? 'current_space') === 'current_space' && Boolean(input.spaceId)
  }

  private candidate(query: string, row: Record<string, unknown>): SpaceRetrievalCandidate {
    const semantic = Number(row.similarity ?? 0)
    const lexical = this.lexicalScore(
      query,
      `${row.title ?? ''} ${row.contextual_prefix ?? ''} ${row.content ?? ''}`,
      row,
    )
    const final = Math.min(
      1,
      Math.max(
        semantic,
        lexical,
        this.rrfScore(row.semantic_rank) * RRF_SCORE_SCALE +
          this.rrfScore(row.lexical_rank) * RRF_SCORE_SCALE,
      ),
    )
    const metadata = this.record(row.metadata) ?? {}
    return {
      id: String(row.id),
      space_object_id: String(row.space_object_id ?? ''),
      source_type: String(row.source_type ?? 'space_doc') as SpaceSemanticSourceType,
      source_id: String(row.source_id ?? ''),
      source_title: (row.source_title as string | null) ?? null,
      title: String(row.title ?? row.source_title ?? 'Space evidence'),
      content: String(row.content ?? ''),
      snippet: String(row.content ?? '').slice(0, 240),
      user_id: String(row.user_id ?? ''),
      org_id: (row.org_id as string | null) ?? null,
      space_id: (row.space_id as string | null) ?? null,
      campaign_id: (row.campaign_id as string | null) ?? null,
      metadata,
      retrieve_via: this.record(metadata.retrieve_via) as SpaceRetrievalCandidate['retrieve_via'],
      lane: String(row.source_type ?? 'space_doc') as SpaceSemanticSourceType,
      scores: {
        ...(semantic > 0 ? { semantic } : {}),
        ...(lexical > 0 ? { lexical } : {}),
        final,
      },
      match_reasons: ['Matched Space retrieval evidence'],
    }
  }

  private toBrainCandidate(candidate: SpaceRetrievalCandidate): BrainRetrievalCandidate {
    return {
      id: candidate.id,
      brain_id: candidate.space_id ?? 'space-retrieval',
      brain_scope: 'space',
      brain_owner_id: candidate.user_id,
      org_id: candidate.org_id,
      effective_access: 'query',
      access_source: candidate.org_id ? 'org_baseline' : 'owner',
      family: 'user',
      kind: 'evidence_chunk',
      title: candidate.title,
      content: candidate.content,
      snippet: candidate.snippet,
      source_type: candidate.source_type,
      source_id: candidate.source_id,
      source_title: candidate.source_title,
      metadata: candidate.metadata,
      temporal: temporalCandidateMetadata(candidate.metadata),
      lane: candidate.lane,
      scores: candidate.scores,
      match_reasons: candidate.match_reasons,
      evidence_refs: [{ type: candidate.source_type, id: candidate.source_id }],
      related: [],
    }
  }

  private mergeRankedRows(
    semantic: Array<Record<string, unknown>>,
    lexical: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    const rows = new Map<string, Record<string, unknown>>()
    semantic.forEach((row, index) => {
      const id = String(row.id ?? '')
      if (!id) return
      rows.set(id, { ...(rows.get(id) ?? {}), ...row, semantic_rank: index + 1 })
    })
    lexical.forEach((row, index) => {
      const id = String(row.id ?? '')
      if (!id) return
      rows.set(id, { ...(rows.get(id) ?? {}), ...row, lexical_rank: index + 1 })
    })
    return [...rows.values()]
  }

  private balanceLaneCandidates(
    candidates: SpaceRetrievalCandidate[],
    candidateLimit: number,
  ): SpaceRetrievalCandidate[] {
    const byLane = new Map<string, SpaceRetrievalCandidate[]>()
    for (const candidate of candidates) {
      byLane.set(candidate.lane, [...(byLane.get(candidate.lane) ?? []), candidate])
    }
    for (const laneCandidates of byLane.values()) {
      laneCandidates.sort((a, b) => b.scores.final - a.scores.final)
    }
    const laneQuota = Math.max(2, Math.ceil(candidateLimit / Math.max(1, byLane.size * 2)))
    const selected = new Map<string, SpaceRetrievalCandidate>()
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

  private lexicalScore(query: string, content: string, row: Record<string, unknown>): number {
    const text = content.toLowerCase()
    const terms = query
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .filter((term) => term.length >= 3)
    if (terms.length === 0) return 0
    const rank = Number(row.lexical_rank ?? 0)
    const rankScore = rank > 0 ? 1 / (60 + rank) : 0
    if (text.includes(query.toLowerCase())) return Math.max(1, rankScore)
    const hits = terms.filter((term) => text.includes(term)).length
    return Math.max(hits / terms.length, rankScore)
  }

  private rrfScore(rank: unknown): number {
    const numericRank = Number(rank ?? 0)
    return numericRank > 0 ? 1 / (RRF_K + numericRank) : 0
  }

  private record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  }
}
