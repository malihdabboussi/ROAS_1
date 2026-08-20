import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SupabaseServiceClient,
  type BrainCandidateKind,
  type BrainRetrievalCandidate,
  type BrainRetrievalSearchResult,
  type BrainSearchFamily,
} from '@vibey/api-shared'
import { BrainContextRepository } from '../repositories/brain-context.repository'
import {
  toBrainRetrievalReceipt,
  type BrainRetrievalReceipt,
  type BrainRetrievalReceiptScope,
} from './brain-retrieval-receipt'
import { BrainRetrievalService } from './brain-retrieval.service'
import { CompanyContextCompilerService } from './company-context-compiler.service'
import { EmbeddingService } from './embedding.service'

export const PRELOAD_RETRIEVAL_LIMIT = 20
export const MEMORY_LIMIT = 10
export const SNAPSHOT_LIMIT = 10
export const SK_LIMIT = 10
export const WIKI_PAGE_LIMIT = 3
export const WIKI_MATCH_THRESHOLD = 0.3
const GRAPH_MAX_DEPTH = 2
const GRAPH_MIN_STRENGTH = 0.3
const SEMANTIC_WEIGHT = 0.7
const GRAPH_WEIGHT = 0.3
export const INSUFFICIENT_CONTEXT_STATUS =
  'BRAIN CONTEXT STATUS: Related information found, but not enough evidence to answer definitively.'

const AUTO_CUSTOMER_CONTEXT_KINDS: BrainCandidateKind[] = [
  'memory',
  'evidence_chunk',
  'customer_avatar',
  'narrative_page',
  'belief_pattern',
  'perspective',
]

export interface MemoryRow {
  id: string
  content: string
  memory_type: string
  significance: number
  tags: string[]
  updated_at?: string
  last_recalled_at?: string
}

export interface SnapshotRow {
  id: string
  name: string
  core: string
  confidence: number
  updated_at?: string
  source: 'semantic' | 'graph'
  score: number
}

export interface SkRow {
  id: string
  title: string
  content: string
  entry_type: string
  domain: string | null
  mastery: number
  tags: string[]
  updated_at?: string
  last_recalled_at?: string
}

export type BrainContextTimingMeta = {
  userId: string
  orgId?: string | null
  agentKey?: string
  queryChars: number
  useWikiContext?: boolean
}

export type PrecomputedEmbedding = number[] | null | Promise<number[] | null>

@Injectable()
export class BrainContextSupportService {
  private readonly logger = new Logger(BrainContextSupportService.name)
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly embedding: EmbeddingService,
    private readonly companyContext: CompanyContextCompilerService,
    private readonly repository: BrainContextRepository = new BrainContextRepository(),
  ) {
    this.supabase = svc.client
  }

  contextStringTiming(value: string): Record<string, unknown> {
    return {
      chars: value.length,
      present: value.length > 0,
    }
  }

  async timeContextPart<T>(
    stage: string,
    meta: BrainContextTimingMeta,
    operation: () => Promise<T>,
    resultMeta?: (value: T) => Record<string, unknown>,
  ): Promise<T> {
    const startedAt = Date.now()
    try {
      const value = await operation()
      this.logContextTiming(stage, meta, Date.now() - startedAt, resultMeta?.(value))
      return value
    } catch (err) {
      this.logContextTiming(stage, meta, Date.now() - startedAt, {
        status: 'error',
        error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      })
      throw err
    }
  }

  async buildCustomerBrainContext(input: {
    retrieval?: BrainRetrievalService
    userId: string
    query?: string
    orgId?: string | null
    agentKey?: string
    precomputedEmbedding?: PrecomputedEmbedding
    onRetrievalReceipt?: (receipt: BrainRetrievalReceipt) => void
  }): Promise<string> {
    const trimmedQuery = input.query?.trim()
    if (!trimmedQuery || !input.retrieval) return ''

    return this.buildRetrievalContext({
      retrieval: input.retrieval,
      family: 'customer',
      heading: 'CUSTOMER BRAIN — Retrieved Context:',
      userId: input.userId,
      orgId: input.orgId,
      query: trimmedQuery,
      agentKey: input.agentKey,
      embedding: this.retrievalEmbeddingInput(input.precomputedEmbedding),
      limit: PRELOAD_RETRIEVAL_LIMIT,
      includeKinds: AUTO_CUSTOMER_CONTEXT_KINDS,
      onRetrievalReceipt: input.onRetrievalReceipt,
    }).catch((err) => {
      this.logger.warn(`Customer brain retrieval context failed: ${err}`)
      return INSUFFICIENT_CONTEXT_STATUS
    })
  }

  async buildCompanyBrainContext(input: {
    retrieval?: BrainRetrievalService
    userId: string
    query?: string
    orgId?: string | null
    agentKey?: string
    precomputedEmbedding?: PrecomputedEmbedding
    onRetrievalReceipt?: (receipt: BrainRetrievalReceipt) => void
  }): Promise<string> {
    const trimmedQuery = input.query?.trim()
    if (trimmedQuery && input.retrieval) {
      return this.buildRetrievalContext({
        retrieval: input.retrieval,
        family: 'company',
        heading: 'COMPANY OPERATING CONTEXT',
        userId: input.userId,
        orgId: input.orgId,
        query: trimmedQuery,
        agentKey: input.agentKey,
        embedding: this.retrievalEmbeddingInput(input.precomputedEmbedding),
        limit: PRELOAD_RETRIEVAL_LIMIT,
        onRetrievalReceipt: input.onRetrievalReceipt,
      }).catch((err) => {
        this.logger.warn(`Company Brain retrieval context failed: ${err}`)
        return INSUFFICIENT_CONTEXT_STATUS
      })
    }

    return this.companyContext
      .buildCompanyContext({
        orgId: input.orgId ?? null,
        userId: input.userId,
        query: input.query,
        agentKey: input.agentKey,
      })
      .catch((err) => {
        this.logger.warn(`Company Cortex context failed: ${err}`)
        return ''
      })
  }

  async buildRetrievalContext(input: {
    retrieval?: BrainRetrievalService
    family: BrainSearchFamily
    heading: string
    brainId?: string
    userId: string
    orgId?: string | null
    query: string
    agentKey?: string
    embedding?: number[] | Promise<number[] | null>
    limit: number
    includeKinds?: BrainCandidateKind[]
    receiptScope?: BrainRetrievalReceiptScope
    brainName?: string | null
    onRetrievalReceipt?: (receipt: BrainRetrievalReceipt) => void
  }): Promise<string> {
    if (!input.retrieval) return ''
    const result = await input.retrieval.search({
      supabase: this.supabase,
      userClient: this.supabase,
      family: input.family,
      brainId: input.brainId,
      query: input.query,
      userId: input.userId,
      orgId: input.orgId,
      requiredAccess: 'query',
      agentKey: input.agentKey,
      embedding: input.embedding,
      limit: input.limit,
      includeKinds: input.includeKinds,
    })
    input.onRetrievalReceipt?.(
      toBrainRetrievalReceipt({
        brainId: result.results[0]?.brain_id ?? input.brainId,
        brainName: input.brainName,
        scope: input.receiptScope ?? input.family,
        query: input.query,
        resultsCount: result.count,
        results: result.results,
      }),
    )
    return this.formatRetrievalContext(input.heading, result)
  }

  retrievalEmbeddingInput(
    precomputedEmbedding?: PrecomputedEmbedding,
  ): number[] | Promise<number[] | null> | undefined {
    if (Array.isArray(precomputedEmbedding)) return precomputedEmbedding
    if (this.isEmbeddingPromise(precomputedEmbedding)) return precomputedEmbedding
    return undefined
  }

  async resolvePrecomputedEmbedding(
    precomputedEmbedding?: PrecomputedEmbedding,
  ): Promise<number[] | null | undefined> {
    if (precomputedEmbedding === undefined) return undefined
    return precomputedEmbedding
  }

  async getQueryEmbedding(
    query: string,
    billing: { userId: string; orgId?: string | null },
    precomputedEmbedding?: PrecomputedEmbedding,
  ): Promise<number[] | null | undefined> {
    return precomputedEmbedding !== undefined
      ? this.resolvePrecomputedEmbedding(precomputedEmbedding)
      : this.embedding.getEmbedding(query, {
          taskType: 'RETRIEVAL_QUERY',
          billing,
        })
  }

  async expandSnapshotsWithGraph(
    brainId: string,
    semanticSeeds: Array<{ id: string; score: number }>,
  ): Promise<{ direct: SnapshotRow[]; graph: SnapshotRow[] }> {
    if (!semanticSeeds.length) return { direct: [], graph: [] }

    const seedIds = semanticSeeds.map((s) => s.id)
    const seedScoreMap = new Map(semanticSeeds.map((s) => [s.id, s.score]))

    const { data: traversalData, error } = await this.repository.traverseSnapshotEdges(
      this.supabase,
      {
        snapshotIds: seedIds,
        maxDepth: GRAPH_MAX_DEPTH,
        minStrength: GRAPH_MIN_STRENGTH,
      },
    )

    if (error) {
      this.logger.warn(`traverse_edges failed: ${error.message}`)
      const directRows = await this.fetchSnapshotsWithRecency(brainId, seedIds)
      return {
        direct: directRows.map((r) => ({
          ...r,
          source: 'semantic' as const,
          score: seedScoreMap.get(r.id) ?? 0,
        })),
        graph: [],
      }
    }

    const graphScoreMap = new Map<string, number>()
    const graphSourceMap = new Map<string, 'semantic' | 'graph'>()
    for (const id of seedIds) {
      graphScoreMap.set(id, seedScoreMap.get(id) ?? 0)
      graphSourceMap.set(id, 'semantic')
    }
    for (const row of (traversalData ?? []) as Array<{
      snapshot_id: string
      depth: number
      strength: number
    }>) {
      if (seedIds.includes(row.snapshot_id)) continue
      const depthPenalty = row.depth === 1 ? 1 : 0.7
      const score = Number(row.strength ?? 0) * depthPenalty
      const existing = graphScoreMap.get(row.snapshot_id) ?? 0
      if (score > existing) {
        graphScoreMap.set(row.snapshot_id, score)
        graphSourceMap.set(row.snapshot_id, 'graph')
      }
    }

    const allIds = Array.from(graphScoreMap.keys())
    const allRows = await this.fetchSnapshotsWithRecency(brainId, allIds)

    const semanticScores = new Map<string, number>()
    const graphScores = new Map<string, number>()
    for (const row of allRows) {
      if (seedIds.includes(row.id)) semanticScores.set(row.id, seedScoreMap.get(row.id) ?? 0)
      if (graphScoreMap.has(row.id) && graphSourceMap.get(row.id) === 'graph') {
        graphScores.set(row.id, graphScoreMap.get(row.id) ?? 0)
      }
    }

    const hybridScores = new Map<string, number>()
    const allScoredIds = new Set([...semanticScores.keys(), ...graphScores.keys()])
    for (const id of allScoredIds) {
      const s = semanticScores.get(id) ?? 0
      const g = graphScores.get(id) ?? 0
      hybridScores.set(id, s * SEMANTIC_WEIGHT + g * GRAPH_WEIGHT)
    }

    const directRows: SnapshotRow[] = []
    const graphRows: SnapshotRow[] = []

    for (const row of allRows) {
      const finalScore = hybridScores.get(row.id) ?? seedScoreMap.get(row.id) ?? 0
      const enriched: SnapshotRow = {
        ...row,
        score: finalScore,
        source: graphSourceMap.get(row.id) ?? 'semantic',
      }
      if (seedIds.includes(row.id)) directRows.push(enriched)
      else graphRows.push(enriched)
    }

    directRows.sort(sortByScoreThenRecency)
    graphRows.sort(sortByScoreThenRecency)

    return {
      direct: directRows.slice(0, SNAPSHOT_LIMIT),
      graph: graphRows.slice(0, SNAPSHOT_LIMIT),
    }
  }

  async fetchMemoriesWithRecency(ids: string[], brainId?: string): Promise<MemoryRow[]> {
    if (!ids.length) return []
    const { data } = await this.repository.listMemoriesByIds(this.supabase, ids, brainId)
    if (!data?.length) return []
    const order = new Map(ids.map((id, i) => [id, i]))
    return (data as unknown as MemoryRow[]).sort(
      (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
    )
  }

  async fetchSkWithRecency(ids: string[], brainId?: string): Promise<SkRow[]> {
    if (!ids.length) return []
    const { data } = await this.repository.listSkEntriesByIds(this.supabase, ids, brainId)
    if (!data?.length) return []
    const order = new Map(ids.map((id, i) => [id, i]))
    return (data as unknown as SkRow[]).sort(
      (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
    )
  }

  async fetchSnapshotsWithRecency(
    brainId: string,
    ids: string[],
  ): Promise<
    Array<{ id: string; name: string; core: string; confidence: number; updated_at?: string }>
  > {
    if (!ids.length) return []
    const { data } = await this.repository.listSnapshotsByIds(this.supabase, brainId, ids)
    return (data ?? []) as Array<{
      id: string
      name: string
      core: string
      confidence: number
      updated_at?: string
    }>
  }

  async fetchUserBrainTopNMemories(brainId: string): Promise<MemoryRow[]> {
    const { data } = await this.repository.listTopUserMemories(this.supabase, brainId, MEMORY_LIMIT)
    return (data ?? []) as unknown as MemoryRow[]
  }

  async fetchUserBrainTopNSnapshots(brainId: string): Promise<SnapshotRow[]> {
    const { data } = await this.repository.listTopUserSnapshots(
      this.supabase,
      brainId,
      SNAPSHOT_LIMIT,
    )
    return (
      (data ?? []) as Array<{
        id: string
        name: string
        core: string
        confidence: number
        updated_at?: string
      }>
    ).map((r) => ({ ...r, source: 'semantic' as const, score: r.confidence }))
  }

  async fetchAgentBrainTopNSk(brainId: string): Promise<SkRow[]> {
    const { data } = await this.repository.listTopAgentSk(this.supabase, brainId, SK_LIMIT)
    return (data ?? []) as unknown as SkRow[]
  }

  async fetchAgentBrainTopNSnapshots(brainId: string): Promise<SnapshotRow[]> {
    const { data } = await this.repository.listTopAgentSnapshots(
      this.supabase,
      brainId,
      SNAPSHOT_LIMIT,
    )
    return (
      (data ?? []) as Array<{
        id: string
        name: string
        core: string
        confidence: number
        updated_at?: string
      }>
    ).map((r) => ({ ...r, source: 'semantic' as const, score: r.confidence }))
  }

  appendSnapshotSections(
    parts: string[],
    prefix: string,
    direct: SnapshotRow[],
    graph: SnapshotRow[],
  ): void {
    if (direct.length && graph.length) {
      parts.push(`\n${prefix} — Neural Snapshots (direct matches):`)
      for (const s of direct) parts.push(`- ${s.name}: ${s.core}`)
      parts.push(`\n${prefix} — Neural Snapshots (related via connections):`)
      for (const s of graph) parts.push(`- ${s.name}: ${s.core}`)
    } else if (direct.length) {
      parts.push(`\n${prefix} — Neural Snapshots:`)
      for (const s of direct) parts.push(`- ${s.name}: ${s.core}`)
    }
  }

  logContextTiming(
    stage: string,
    meta: BrainContextTimingMeta,
    latencyMs: number,
    extra?: Record<string, unknown>,
  ): void {
    if (!this.contextTimingLogsEnabled()) return
    this.logger.log(
      JSON.stringify({
        feature: 'brain_context_timing_v1',
        stage,
        user_id: meta.userId,
        org_id: meta.orgId ?? null,
        agent_key: meta.agentKey ?? null,
        query_chars: meta.queryChars,
        use_wiki_context: meta.useWikiContext === true,
        latency_ms: latencyMs,
        ...(extra ?? {}),
      }),
    )
  }

  private contextTimingLogsEnabled(): boolean {
    const setting = process.env.BRAIN_CONTEXT_TIMING_LOGS
    if (setting === undefined) return false
    return !['0', 'false', 'off', 'no'].includes(setting.toLowerCase())
  }

  private isEmbeddingPromise(
    value: PrecomputedEmbedding | undefined,
  ): value is Promise<number[] | null> {
    const maybePromise = value as { then?: unknown } | null | undefined
    return typeof maybePromise?.then === 'function'
  }

  private formatRetrievalContext(heading: string, result: BrainRetrievalSearchResult): string {
    const parts: string[] = []
    if (!result.context_sufficient) {
      parts.push(INSUFFICIENT_CONTEXT_STATUS)
      if (result.missing.length) parts.push(`Missing: ${result.missing.join('; ')}`)
      if (result.suggested_next_queries.length) {
        parts.push(`Suggested next Brain searches: ${result.suggested_next_queries.join('; ')}`)
      }
    }

    if (result.results.length === 0) return parts.join('\n')

    parts.push(heading)
    for (const candidate of result.results) parts.push(this.formatRetrievalCandidate(candidate))
    return parts.join('\n')
  }

  private formatRetrievalCandidate(candidate: BrainRetrievalCandidate): string {
    const source = candidate.source_title
      ? ` Source: ${candidate.source_title}`
      : candidate.source_type
        ? ` Source: ${candidate.source_type}`
        : ''
    const related =
      candidate.related.length > 0
        ? ` Related: ${candidate.related.map((item) => `${item.relation} ${item.title}`).join('; ')}`
        : ''
    return `- [${candidate.kind}] ${candidate.title}: ${candidate.snippet}${source}${related}`
  }
}

function recencyTs(row: { updated_at?: string; last_recalled_at?: string }): number {
  const ts = row.updated_at ?? row.last_recalled_at
  return ts ? new Date(ts).getTime() : 0
}

export function sortByRecency<T extends { updated_at?: string; last_recalled_at?: string }>(
  a: T,
  b: T,
): number {
  return recencyTs(b) - recencyTs(a)
}

function sortByScoreThenRecency(a: SnapshotRow, b: SnapshotRow): number {
  const scoreDiff = b.score - a.score
  if (Math.abs(scoreDiff) > 0.01) return scoreDiff
  return recencyTs(b) - recencyTs(a)
}
