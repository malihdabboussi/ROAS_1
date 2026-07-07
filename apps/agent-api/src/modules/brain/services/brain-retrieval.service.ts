import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BrainAccessSource,
  BrainRetrievalCandidate,
  BrainRetrievalSearchResult,
  BrainSearchFamily,
} from '@vibey/api-shared'
import { BrainRetrievalAccessRepository } from '../repositories/brain-retrieval-access.repository'
import { BrainRetrievalContextRepository } from '../repositories/brain-retrieval-context.repository'
import { BrainRetrievalRelationRepository } from '../repositories/brain-retrieval-relation.repository'
import { BrainRetrievalSearchRepository } from '../repositories/brain-retrieval-search.repository'
import { BrainRerankerService } from './brain-reranker.service'
import { BrainRetrievalQueryExpansionService } from './brain-retrieval-query-expansion.service'
import { BrainRetrievalRelatedContextService } from './brain-retrieval-related-context.service'
import { BrainRetrievalSearchLaneService } from './brain-retrieval-search-lane.service'
import { BrainRetrievalTimingService } from './brain-retrieval-timing.service'
import type {
  AccessMetadata,
  BrainRetrievalExpansionInput,
  BrainRetrievalLaneSearchInput,
  BrainRow,
  SearchInput,
} from './brain-retrieval.types'
import { BrainSufficiencyService } from './brain-sufficiency.service'
import { EmbeddingService } from './embedding.service'

type QueryEmbeddingResolution = {
  vector: number[] | null
  source: 'computed' | 'computed_after_empty_precompute' | 'precomputed' | 'provided_null'
}

@Injectable()
export class BrainRetrievalService {
  private readonly logger = new Logger(BrainRetrievalService.name)
  private fallbackSearchLane?: BrainRetrievalSearchLaneService
  private fallbackRelatedContext?: BrainRetrievalRelatedContextService
  private fallbackQueryExpansion?: BrainRetrievalQueryExpansionService
  private fallbackTiming?: BrainRetrievalTimingService

  constructor(
    private readonly embedding: EmbeddingService,
    @Optional() private readonly reranker?: BrainRerankerService,
    @Optional() private readonly sufficiency?: BrainSufficiencyService,
    private readonly accessRepository: BrainRetrievalAccessRepository = new BrainRetrievalAccessRepository(),
    private readonly searchRepository: BrainRetrievalSearchRepository = new BrainRetrievalSearchRepository(),
    private readonly contextRepository: BrainRetrievalContextRepository = new BrainRetrievalContextRepository(),
    private readonly relationRepository: BrainRetrievalRelationRepository = new BrainRetrievalRelationRepository(),
    @Optional() private readonly searchLaneService?: BrainRetrievalSearchLaneService,
    @Optional() private readonly relatedContextService?: BrainRetrievalRelatedContextService,
    @Optional() private readonly queryExpansionService?: BrainRetrievalQueryExpansionService,
    @Optional() private readonly timingService?: BrainRetrievalTimingService,
  ) {}

  private getQueryExpansionService(): BrainRetrievalQueryExpansionService {
    if (this.queryExpansionService) return this.queryExpansionService
    this.fallbackQueryExpansion ??= new BrainRetrievalQueryExpansionService()
    return this.fallbackQueryExpansion
  }

  private getSearchLaneService(): BrainRetrievalSearchLaneService {
    if (this.searchLaneService) return this.searchLaneService
    this.fallbackSearchLane ??= new BrainRetrievalSearchLaneService(
      this.searchRepository,
      this.contextRepository,
      this.getQueryExpansionService(),
    )
    return this.fallbackSearchLane
  }

  private getRelatedContextService(): BrainRetrievalRelatedContextService {
    if (this.relatedContextService) return this.relatedContextService
    this.fallbackRelatedContext ??= new BrainRetrievalRelatedContextService(this.relationRepository)
    return this.fallbackRelatedContext
  }

  private getTimingService(): BrainRetrievalTimingService {
    if (this.timingService) return this.timingService
    this.fallbackTiming ??= new BrainRetrievalTimingService()
    return this.fallbackTiming
  }

  async search(input: SearchInput): Promise<BrainRetrievalSearchResult> {
    const startedAt = Date.now()
    const query = input.query.trim()
    if (!query) return this.emptyResult(query, input.family, 'No query provided.')

    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)
    const candidateLimit = Math.min(Math.max(20, limit * 2), 50)
    const timingBase = {
      family: input.family,
      user_id: input.userId,
      org_id: input.orgId ?? null,
      agent_key: input.agentKey ?? null,
      query_chars: query.length,
      limit,
      candidate_limit: candidateLimit,
    }
    const brain = await this.timeRetrievalStage(
      'resolve_brain',
      timingBase,
      () => this.resolveBrain(input),
      (resolvedBrain) => ({
        brain_id: resolvedBrain?.id ?? null,
        brain_scope: resolvedBrain?.scope ?? null,
      }),
    )
    if (!brain) return this.emptyResult(query, input.family, 'No accessible Brain found.')

    const brainTimingBase = { ...timingBase, brain_id: brain.id, brain_scope: brain.scope }
    const access = await this.timeRetrievalStage('assert_access', brainTimingBase, () =>
      this.assertCanQueryBrain(input.userClient, brain.id),
    )
    const accessMetadata = await this.timeRetrievalStage(
      'resolve_access_metadata',
      brainTimingBase,
      () => this.resolveAccessMetadata(input.supabase, brain, input.userId),
      (metadata) => ({
        effective_access: metadata?.effective_access ?? access.effective_access,
        access_source: metadata?.access_source ?? access.access_source,
      }),
    )
    const embeddingResult = await this.timeRetrievalStage(
      'embedding',
      brainTimingBase,
      () => this.resolveQueryEmbedding(input, query),
      (result) => ({
        embedding_present: Array.isArray(result.vector),
        dimensions: Array.isArray(result.vector) ? result.vector.length : 0,
        embedding_source: result.source,
      }),
    )
    const embedding = embeddingResult.vector

    const searchInput = {
      ...input,
      query,
      limit,
      candidateLimit,
      brain,
      accessMetadata: accessMetadata ?? access,
      embedding,
    }

    const candidates = await this.timeRetrievalStage(
      'initial_candidate_search',
      brainTimingBase,
      () => this.searchFamilyCandidates(searchInput),
      (rows) => this.candidateTiming(rows),
    )

    const expansionInput = {
      ...input,
      query,
      limit,
      candidateLimit,
      brain,
      accessMetadata: accessMetadata ?? access,
    }

    let expanded = await this.timeRetrievalStage(
      'initial_related_expansion',
      brainTimingBase,
      () => this.expandRelatedContext(expansionInput, candidates),
      (rows) => this.candidateTiming(rows),
    )
    const deferLlmRerank = this.multiQueryEnabled()
    let balanced = this.timeRetrievalSyncStage(
      'initial_balance_lanes',
      brainTimingBase,
      () => this.balanceLaneCandidates(expanded, candidateLimit),
      (rows) => this.candidateTiming(rows),
    )
    const billing = { userId: input.userId, orgId: input.orgId }
    let ranked = deferLlmRerank
      ? this.timeRetrievalSyncStage(
          'initial_deterministic_rerank',
          brainTimingBase,
          () => this.rerankCandidatesDeterministic(query, balanced, limit),
          (rows) => this.candidateTiming(rows),
        )
      : await this.timeRetrievalStage(
          'initial_llm_rerank',
          brainTimingBase,
          () => this.rerankCandidates(query, balanced, limit, billing),
          (rows) => this.candidateTiming(rows),
        )
    let sufficiency = await this.timeRetrievalStage(
      'initial_sufficiency',
      brainTimingBase,
      () => this.evaluateSufficiency(query, ranked, billing),
      (result) => ({
        context_sufficient: result.sufficient,
        confidence: result.confidence,
        missing_count: result.missing.length,
      }),
    )

    const shouldRunMultiQuery = this.shouldRunMultiQuery(query, ranked, sufficiency.sufficient)
    this.logRetrievalTiming('multi_query_decision', brainTimingBase, 0, {
      should_run: shouldRunMultiQuery,
      defer_llm_rerank: deferLlmRerank,
      top_score: ranked[0]?.scores.final ?? 0,
      context_sufficient: sufficiency.sufficient,
    })

    if (shouldRunMultiQuery) {
      const variants = this.timeRetrievalSyncStage(
        'multi_query_build_variants',
        brainTimingBase,
        () => this.buildDeterministicQueryVariants(query),
        (rows) => ({ variant_count: rows.length }),
      )
      if (variants.length > 0) {
        const variantCandidates = await this.timeRetrievalStage(
          'multi_query_candidate_search',
          { ...brainTimingBase, variant_count: variants.length },
          () => this.searchQueryVariants(expansionInput, variants),
          (rows) => this.candidateTiming(rows),
        )
        const mergedCandidates = this.timeRetrievalSyncStage(
          'multi_query_merge_candidates',
          brainTimingBase,
          () => this.mergeCandidatesByBestScore([...candidates, ...variantCandidates]),
          (rows) => this.candidateTiming(rows),
        )
        expanded = await this.timeRetrievalStage(
          'multi_query_related_expansion',
          brainTimingBase,
          () => this.expandRelatedContext(expansionInput, mergedCandidates),
          (rows) => this.candidateTiming(rows),
        )
        balanced = this.timeRetrievalSyncStage(
          'multi_query_balance_lanes',
          brainTimingBase,
          () => this.balanceLaneCandidates(expanded, candidateLimit),
          (rows) => this.candidateTiming(rows),
        )
        ranked = await this.timeRetrievalStage(
          'multi_query_llm_rerank',
          brainTimingBase,
          () => this.rerankCandidates(query, balanced, limit, billing),
          (rows) => this.candidateTiming(rows),
        )
        sufficiency = await this.timeRetrievalStage(
          'multi_query_sufficiency',
          brainTimingBase,
          () => this.evaluateSufficiency(query, ranked, billing),
          (result) => ({
            context_sufficient: result.sufficient,
            confidence: result.confidence,
            missing_count: result.missing.length,
          }),
        )
      }
    } else if (deferLlmRerank) {
      ranked = await this.timeRetrievalStage(
        'deferred_llm_rerank',
        brainTimingBase,
        () => this.rerankCandidates(query, balanced, limit, billing),
        (rows) => this.candidateTiming(rows),
      )
      sufficiency = await this.timeRetrievalStage(
        'deferred_sufficiency',
        brainTimingBase,
        () => this.evaluateSufficiency(query, ranked, billing),
        (result) => ({
          context_sufficient: result.sufficient,
          confidence: result.confidence,
          missing_count: result.missing.length,
        }),
      )
    }

    this.logRetrieval({
      family: input.family,
      brainId: brain.id,
      effectiveAccess: accessMetadata?.effective_access ?? access.effective_access,
      accessSource: accessMetadata?.access_source ?? access.access_source,
      candidates: expanded,
      finalCount: ranked.length,
      contextSufficient: sufficiency.sufficient,
      latencyMs: Date.now() - startedAt,
    })
    return {
      success: true,
      query,
      family: input.family,
      count: ranked.length,
      context_sufficient: sufficiency.sufficient,
      sufficiency,
      missing: sufficiency.missing,
      suggested_next_queries: sufficiency.suggested_next_queries,
      results: ranked,
    }
  }

  private async resolveQueryEmbedding(
    input: SearchInput,
    query: string,
  ): Promise<QueryEmbeddingResolution> {
    if (input.embedding === null) {
      return { vector: null, source: 'provided_null' }
    }

    if (input.embedding !== undefined) {
      const supplied = await input.embedding
      if (Array.isArray(supplied)) {
        return { vector: supplied, source: 'precomputed' }
      }
    }

    const vector = await this.embedding.getEmbedding(query, {
      taskType: 'RETRIEVAL_QUERY',
      billing: { userId: input.userId, orgId: input.orgId },
    })
    return {
      vector,
      source: input.embedding === undefined ? 'computed' : 'computed_after_empty_precompute',
    }
  }

  private emptyResult(
    query: string,
    family: BrainSearchFamily,
    reason: string,
  ): BrainRetrievalSearchResult {
    const sufficiency = this.evaluateSufficiencyFallback(query, [])
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

  async resolveUserBrainId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const row = await this.resolveUserBrainRow(supabase, userId, orgId)
    return row?.id ?? null
  }

  private async resolveUserBrainRow(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<BrainRow | null> {
    return this.accessRepository.findDefaultUserBrain(supabase, { userId, orgId })
  }

  private async resolveBrain(input: SearchInput): Promise<BrainRow | null> {
    if (input.brainId?.trim()) {
      return this.accessRepository.loadBrain(input.supabase, input.brainId.trim())
    }

    if (input.family === 'user') {
      return this.resolveUserBrainRow(input.supabase, input.userId, input.orgId)
    }

    if (input.family === 'agent' && input.agentKey?.trim()) {
      return this.accessRepository.findAgentBrain(input.supabase, {
        agentKey: input.agentKey.trim(),
        userId: input.userId,
        orgId: input.orgId,
      })
    }

    if (input.family === 'customer' || input.family === 'company') {
      return this.accessRepository.findScopedBrain(input.supabase, {
        family: input.family,
        userId: input.userId,
        orgId: input.orgId,
      })
    }

    return null
  }

  private async assertCanQueryBrain(
    userClient: SupabaseClient,
    brainId: string,
  ): Promise<AccessMetadata> {
    const canAccess = await this.accessRepository.canQueryBrain(userClient, brainId)
    if (!canAccess) throw new Error('Insufficient brain permissions')
    return { effective_access: 'query', access_source: 'org_baseline' }
  }

  private async resolveAccessMetadata(
    supabase: SupabaseClient,
    brain: BrainRow,
    userId: string,
  ): Promise<AccessMetadata | null> {
    if (brain.owner_id === userId || brain.created_by === userId) {
      return { effective_access: 'train', access_source: 'owner' }
    }

    const share = await this.resolveMatchingShareSource(supabase, brain, userId)
    if (share) return { effective_access: 'query', access_source: share }

    if (brain.org_id) return { effective_access: 'query', access_source: 'org_baseline' }
    return null
  }

  private async resolveMatchingShareSource(
    supabase: SupabaseClient,
    brain: BrainRow,
    userId: string,
  ): Promise<BrainAccessSource | null> {
    const userShare = await this.accessRepository.findUserShare(supabase, {
      brainId: brain.id,
      userId,
    })
    if (userShare?.id) return 'user_share'

    if (brain.org_id) {
      const orgShare = await this.accessRepository.findOrgShare(supabase, {
        brainId: brain.id,
        orgId: brain.org_id,
      })
      if (orgShare?.id) return 'org_share'

      const teamIds = await this.accessRepository.listUserTeamIds(supabase, userId)
      if (teamIds.length > 0) {
        const teamShare = await this.accessRepository.findTeamShare(supabase, {
          brainId: brain.id,
          teamIds,
        })
        if (teamShare?.id) return 'team_share'
      }
    }

    return null
  }

  private async searchFamilyCandidates(
    input: BrainRetrievalLaneSearchInput,
  ): Promise<BrainRetrievalCandidate[]> {
    return this.getSearchLaneService().searchFamilyCandidates(input)
  }

  private async searchQueryVariants(
    input: BrainRetrievalExpansionInput,
    variants: string[],
  ): Promise<BrainRetrievalCandidate[]> {
    return this.getSearchLaneService().searchQueryVariants(input, variants)
  }

  private async expandRelatedContext(
    input: BrainRetrievalExpansionInput,
    candidates: BrainRetrievalCandidate[],
  ): Promise<BrainRetrievalCandidate[]> {
    return this.getRelatedContextService().expandRelatedContext(input, candidates)
  }

  private async rerankCandidates(
    query: string,
    candidates: BrainRetrievalCandidate[],
    limit: number,
    billing?: { userId: string; orgId?: string | null },
  ): Promise<BrainRetrievalCandidate[]> {
    if (this.reranker) return this.reranker.rerank(query, candidates, limit, billing)
    return candidates.sort((a, b) => b.scores.final - a.scores.final).slice(0, limit)
  }

  private rerankCandidatesDeterministic(
    query: string,
    candidates: BrainRetrievalCandidate[],
    limit: number,
  ): BrainRetrievalCandidate[] {
    if (this.reranker) return this.reranker.rerankDeterministic(query, candidates, limit)
    return candidates.sort((a, b) => b.scores.final - a.scores.final).slice(0, limit)
  }

  private async evaluateSufficiency(
    query: string,
    candidates: BrainRetrievalCandidate[],
    billing?: { userId: string; orgId?: string | null },
  ) {
    if (this.sufficiency) return this.sufficiency.evaluate(query, candidates, billing)
    return this.evaluateSufficiencyFallback(query, candidates)
  }

  private evaluateSufficiencyFallback(query: string, candidates: BrainRetrievalCandidate[]) {
    const sufficient = candidates.length > 0 && (candidates[0]?.scores.final ?? 0) >= 0.45
    return {
      sufficient,
      confidence: candidates[0]?.scores.final ?? 0,
      reason: sufficient
        ? 'Retrieved context appears sufficient.'
        : 'Retrieved context is not enough to answer definitively.',
      missing: sufficient ? [] : ['No strong direct evidence found.'],
      suggested_next_queries: sufficient || !query ? [] : [query, `${query} source evidence`],
    }
  }

  private shouldRunMultiQuery(
    query: string,
    ranked: BrainRetrievalCandidate[],
    contextSufficient: boolean,
  ): boolean {
    return this.getQueryExpansionService().shouldRunMultiQuery(query, ranked, contextSufficient)
  }

  private multiQueryEnabled(): boolean {
    return this.getQueryExpansionService().multiQueryEnabled()
  }

  private buildDeterministicQueryVariants(query: string): string[] {
    return this.getQueryExpansionService().buildDeterministicQueryVariants(query)
  }

  private mergeCandidatesByBestScore(
    candidates: BrainRetrievalCandidate[],
  ): BrainRetrievalCandidate[] {
    return this.getQueryExpansionService().mergeCandidatesByBestScore(candidates)
  }

  private balanceLaneCandidates(
    candidates: BrainRetrievalCandidate[],
    candidateLimit: number,
  ): BrainRetrievalCandidate[] {
    return this.getQueryExpansionService().balanceLaneCandidates(candidates, candidateLimit)
  }

  private logRetrieval(input: {
    family: BrainSearchFamily
    brainId: string
    effectiveAccess: string
    accessSource: string
    candidates: BrainRetrievalCandidate[]
    finalCount: number
    contextSufficient: boolean
    latencyMs: number
  }): void {
    if (!this.retrievalTimingLogsEnabled()) return
    const vectorCount = input.candidates.filter((candidate) => candidate.scores.semantic).length
    const lexicalCount = input.candidates.filter((candidate) => candidate.scores.lexical).length
    const graphCount = input.candidates.filter((candidate) => candidate.scores.graph).length
    this.logger.log(
      JSON.stringify({
        feature: 'brain_retrieval_v2',
        family: input.family,
        brain_id: input.brainId,
        effective_access: input.effectiveAccess,
        access_source: input.accessSource,
        vector_count: vectorCount,
        lexical_count: lexicalCount,
        graph_count: graphCount,
        final_count: input.finalCount,
        context_sufficient: input.contextSufficient,
        latency_ms: input.latencyMs,
      }),
    )
  }

  private candidateTiming(candidates: BrainRetrievalCandidate[]): Record<string, unknown> {
    return {
      candidate_count: candidates.length,
      vector_count: candidates.filter((candidate) => candidate.scores.semantic).length,
      lexical_count: candidates.filter((candidate) => candidate.scores.lexical).length,
      graph_count: candidates.filter((candidate) => candidate.scores.graph).length,
      top_score: candidates[0]?.scores.final ?? 0,
    }
  }

  private async timeRetrievalStage<T>(
    stage: string,
    meta: Record<string, unknown>,
    operation: () => Promise<T>,
    resultMeta?: (value: T) => Record<string, unknown>,
  ): Promise<T> {
    return this.getTimingService().timeRetrievalStage(stage, meta, operation, resultMeta)
  }

  private timeRetrievalSyncStage<T>(
    stage: string,
    meta: Record<string, unknown>,
    operation: () => T,
    resultMeta?: (value: T) => Record<string, unknown>,
  ): T {
    return this.getTimingService().timeRetrievalSyncStage(stage, meta, operation, resultMeta)
  }

  private logRetrievalTiming(
    stage: string,
    meta: Record<string, unknown>,
    latencyMs: number,
    extra?: Record<string, unknown>,
  ): void {
    this.getTimingService().logRetrievalTiming(stage, meta, latencyMs, extra)
  }

  private retrievalTimingLogsEnabled(): boolean {
    return this.getTimingService().retrievalTimingLogsEnabled()
  }
}
