import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SearchRepository } from '../repositories/search.repository'
import { EmbeddingService, type BrainGeminiBillingContext } from './embedding.service'
import { FeedbackService } from './feedback.service'

type SearchMode = 'semantic' | 'graph' | 'hybrid' | 'summary' | 'chain' | 'auto'

export interface SnapshotRow {
  id: string
  name: string
  type: string
  core: string
  confidence: number
  significance_score: number
  tags: string[]
}

export interface ScoredSnapshot extends SnapshotRow {
  score: number
  node_type?: 'memory' | 'snapshot'
  memory_type?: string
  snapshot_type?: string
  content?: string
}

interface SummaryRow {
  id: string
  name: string
  type: string
  core: string
  confidence: number
  significance_score: number
  tags: string[]
  rank: number
}

@Injectable()
export class SearchService {
  constructor(
    private readonly embedding: EmbeddingService,
    private readonly feedback: FeedbackService,
    private readonly searchRepository: SearchRepository,
  ) {}

  async search(
    supabase: SupabaseClient,
    userId: string,
    input: {
      query: string
      mode?: SearchMode
      limit?: number
      brainId?: string
      agentId?: string
      orgId?: string | null
    },
  ): Promise<{
    mode: SearchMode
    query?: string
    count: number
    results: ScoredSnapshot[]
  }> {
    const mode = input.mode ?? 'hybrid'
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)
    const brainId = await this.searchRepository.resolveBrainId(
      supabase,
      userId,
      input.brainId,
      input.agentId,
      input.orgId,
    )
    if (!brainId) return { mode, results: [], count: 0 }

    const billing: BrainGeminiBillingContext = { userId, orgId: input.orgId }
    const [memories, skResults] = await Promise.all([
      this.memorySearch(supabase, brainId, input.query, limit, billing),
      this.skSearch(supabase, brainId, input.query, limit, billing),
    ])

    let snapshotResults: ScoredSnapshot[]
    if (mode === 'semantic') {
      snapshotResults = await this.semanticSearch(supabase, brainId, input.query, limit, billing)
    } else if (mode === 'graph') {
      snapshotResults = await this.graphSearch(supabase, brainId, input.query, limit, billing)
    } else if (mode === 'hybrid') {
      const semantic = await this.semanticSearch(supabase, brainId, input.query, limit, billing)
      const graph = await this.graphSearch(supabase, brainId, input.query, limit, billing)
      snapshotResults = this.mergeWeighted(semantic, graph, 0.7, 0.3, limit)
    } else if (mode === 'summary') {
      snapshotResults = await this.summarySearch(supabase, brainId, input.query, limit)
    } else if (mode === 'chain') {
      snapshotResults = await this.chainSearch(supabase, brainId, input.query, limit, billing)
    } else {
      const autoMode = await this.pickAutoMode(input.query, billing)
      if (autoMode === 'auto') throw new Error('Auto mode resolver returned auto')
      return this.search(supabase, userId, { ...input, mode: autoMode })
    }

    const combined = this.mergeMemoriesAndSnapshots(
      [...memories, ...skResults],
      snapshotResults,
      limit,
    )
    return this.withFeedbackBoost(supabase, userId, mode, input.query, combined)
  }

  async searchByImage(
    supabase: SupabaseClient,
    userId: string,
    input: {
      base64: string
      mimeType: string
      caption?: string
      limit?: number
      brainId?: string
      agentId?: string
      orgId?: string | null
    },
  ) {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)
    const brainId = await this.searchRepository.resolveBrainId(
      supabase,
      userId,
      input.brainId,
      input.agentId,
      input.orgId,
    )
    if (!brainId) return { mode: 'image', query: input.caption ?? '', count: 0, results: [] }

    const billing: BrainGeminiBillingContext = { userId, orgId: input.orgId }
    const queryEmbedding = await this.embedding.getImageEmbedding(
      input.base64,
      input.mimeType,
      input.caption,
      { taskType: 'RETRIEVAL_QUERY', billing },
    )
    if (!queryEmbedding) {
      return { mode: 'image', query: input.caption ?? '', count: 0, results: [] }
    }

    const [memories, skResults] = await Promise.all([
      this.memorySearchByEmbedding(supabase, brainId, queryEmbedding, limit),
      this.skSearchByEmbedding(supabase, brainId, queryEmbedding, limit),
    ])
    const combined = this.mergeMemoriesAndSnapshots([...memories, ...skResults], [], limit)
    return this.withFeedbackBoost(supabase, userId, 'semantic', input.caption ?? '', combined)
  }

  private async withFeedbackBoost(
    supabase: SupabaseClient,
    userId: string,
    mode: SearchMode,
    query: string,
    baseResults: ScoredSnapshot[],
  ) {
    const boosts = await this.feedback.getBoostMap(
      supabase,
      userId,
      baseResults.map((r) => r.id),
    )
    const boosted = baseResults
      .map((row) => ({
        ...row,
        feedback_boost: boosts[row.id] ?? 0,
        score: row.score + (boosts[row.id] ?? 0) * 0.05,
      }))
      .sort((a, b) => b.score - a.score)
    return {
      mode,
      query,
      count: boosted.length,
      results: boosted,
    }
  }

  private async memorySearch(
    supabase: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
    billing: BrainGeminiBillingContext,
  ): Promise<ScoredSnapshot[]> {
    const toResult = (row: Record<string, unknown>, score: number): ScoredSnapshot => ({
      id: row.id as string,
      name: (row.content as string)?.slice(0, 80) ?? '',
      type: (row.memory_type as string) ?? 'memory',
      core: (row.content as string) ?? '',
      confidence: Number(row.confidence ?? 0),
      significance_score: Number(row.significance ?? 0),
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      score,
      node_type: 'memory' as const,
      memory_type: (row.memory_type as string) ?? 'fact',
      content: (row.content as string) ?? '',
    })

    const [vectorResults, textResults] = await Promise.all([
      (async () => {
        const embedding = await this.embedding.getEmbedding(query, {
          taskType: 'RETRIEVAL_QUERY',
          billing,
        })
        if (!embedding) return []
        return this.searchMemoryRpc(supabase, brainId, embedding, limit, toResult)
      })(),
      (async () => {
        const { data, error } = await this.searchRepository.findMemoryTextMatches(
          supabase,
          brainId,
          query,
          limit,
        )
        if (error) return []
        return ((data ?? []) as Array<Record<string, unknown>>).map((row) => toResult(row, 0.6))
      })(),
    ])

    const seen = new Set<string>()
    const merged: ScoredSnapshot[] = []
    for (const r of [...vectorResults, ...textResults]) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      merged.push(r)
    }
    merged.sort((a, b) => b.score - a.score)
    return merged.slice(0, limit)
  }

  private mergeMemoriesAndSnapshots(
    memories: ScoredSnapshot[],
    snapshots: ScoredSnapshot[],
    limit: number,
  ): ScoredSnapshot[] {
    const all = [...memories, ...snapshots]
    all.sort((a, b) => b.score - a.score)
    return all.slice(0, limit)
  }

  private async skSearch(
    supabase: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
    billing: BrainGeminiBillingContext,
  ): Promise<ScoredSnapshot[]> {
    const embedding = await this.embedding.getEmbedding(query, {
      taskType: 'RETRIEVAL_QUERY',
      billing,
    })
    if (!embedding) return []
    return this.skSearchByEmbedding(supabase, brainId, embedding, limit)
  }

  private async skSearchByEmbedding(
    supabase: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ): Promise<ScoredSnapshot[]> {
    const { data, error } = await this.searchRepository.searchSkEntries(
      supabase,
      brainId,
      embedding,
      limit,
    )
    if (error || !data?.length) return []

    return (data as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      name: (row.title as string) ?? '',
      type: (row.entry_type as string) ?? 'concept',
      core: (row.content as string) ?? '',
      confidence: Number(row.confidence ?? 0.8),
      significance_score: Number(row.mastery ?? 0.3),
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      score: Number(row.similarity ?? 0),
      node_type: 'memory' as const,
      memory_type: `sk:${(row.entry_type as string) ?? 'concept'}`,
      content: `[${(row.entry_type as string) ?? 'concept'}] ${(row.title as string) ?? ''}: ${(row.content as string) ?? ''}`,
    }))
  }

  private async memorySearchByEmbedding(
    supabase: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ): Promise<ScoredSnapshot[]> {
    const toResult = (row: Record<string, unknown>, score: number): ScoredSnapshot => ({
      id: row.id as string,
      name: (row.content as string)?.slice(0, 80) ?? '',
      type: (row.memory_type as string) ?? 'memory',
      core: (row.content as string) ?? '',
      confidence: Number(row.confidence ?? 0),
      significance_score: Number(row.significance ?? 0),
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      score,
      node_type: 'memory' as const,
      memory_type: (row.memory_type as string) ?? 'fact',
      content: (row.content as string) ?? '',
    })
    return this.searchMemoryRpc(supabase, brainId, embedding, limit, toResult)
  }

  private async searchMemoryRpc(
    supabase: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
    toResult: (row: Record<string, unknown>, score: number) => ScoredSnapshot,
  ): Promise<ScoredSnapshot[]> {
    const { data, error } = await this.searchRepository.searchMemories(
      supabase,
      brainId,
      embedding,
      limit,
    )
    if (error) return []
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
      toResult(row, Number(row.similarity ?? 0)),
    )
  }

  private async semanticSearch(
    supabase: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
    billing: BrainGeminiBillingContext,
  ): Promise<ScoredSnapshot[]> {
    const embedding = await this.embedding.getEmbedding(query, {
      taskType: 'RETRIEVAL_QUERY',
      billing,
    })
    if (!embedding) return []

    const data = await this.searchRepository.findSimilarSnapshots(
      supabase,
      brainId,
      embedding,
      limit,
    )

    const ids = (data ?? []).map((r: { id: string }) => r.id)
    if (!ids.length) return []
    const snapshotRows = await this.fetchSnapshotsByIds(supabase, ids)
    const scoreMap = new Map<string, number>(
      (data ?? []).map((r: { id: string; similarity: number }) => [
        r.id,
        Number(r.similarity ?? 0),
      ]),
    )
    return snapshotRows
      .map((row) => ({ ...row, score: scoreMap.get(row.id) ?? 0 }))
      .sort((a, b) => b.score - a.score)
  }

  private async graphSearch(
    supabase: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
    billing: BrainGeminiBillingContext,
  ): Promise<ScoredSnapshot[]> {
    const seeds = await this.semanticSearch(supabase, brainId, query, Math.max(limit, 8), billing)
    if (!seeds.length) return []

    const data = await this.searchRepository.traverseEdges(
      supabase,
      seeds.map((s) => s.id),
    )

    const graphScore = new Map<string, number>()
    for (const seed of seeds) {
      graphScore.set(seed.id, Math.max(graphScore.get(seed.id) ?? 0, seed.score))
    }
    for (const row of data ?? []) {
      const depthPenalty = row.depth === 1 ? 1 : 0.7
      const score = Number(row.strength ?? 0) * depthPenalty
      graphScore.set(row.snapshot_id, Math.max(graphScore.get(row.snapshot_id) ?? 0, score))
    }

    const ids = Array.from(graphScore.keys()).slice(0, limit * 2)
    const snapshots = await this.fetchSnapshotsByIds(supabase, ids)
    return snapshots
      .map((row) => ({ ...row, score: graphScore.get(row.id) ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  private async summarySearch(
    supabase: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
  ): Promise<ScoredSnapshot[]> {
    const data = await this.searchRepository.searchSnapshotsFts(supabase, brainId, query, limit)
    return ((data ?? []) as SummaryRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      core: row.core,
      confidence: Number(row.confidence ?? 0),
      significance_score: Number(row.significance_score ?? 0),
      tags: Array.isArray(row.tags) ? row.tags : [],
      score: Number(row.rank ?? 0),
    }))
  }

  private async chainSearch(
    supabase: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
    billing: BrainGeminiBillingContext,
  ): Promise<ScoredSnapshot[]> {
    const prompt = `Decompose this query into 2-3 short sub-questions for knowledge retrieval.\nReturn ONLY JSON: {"questions":["...","..."]}\nQuery: ${query}`
    const raw = await this.embedding.callGemini(prompt, undefined, billing)
    const parsed = JSON.parse(raw) as { questions?: string[] }
    const questions = (parsed.questions ?? []).filter((q) => q.trim().length > 0).slice(0, 3)
    if (!questions.length) return []

    const partials = await Promise.all(
      questions.map((q) => this.semanticSearch(supabase, brainId, q, Math.max(5, limit), billing)),
    )

    const merged = new Map<string, ScoredSnapshot & { hitCount: number }>()
    for (const list of partials) {
      for (const row of list) {
        const current = merged.get(row.id)
        if (!current) {
          merged.set(row.id, { ...row, hitCount: 1 })
        } else {
          current.score = Math.max(current.score, row.score)
          current.hitCount += 1
          merged.set(row.id, current)
        }
      }
    }

    return Array.from(merged.values())
      .map((row) => ({ ...row, score: row.score + (row.hitCount - 1) * 0.1 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  private async pickAutoMode(
    query: string,
    billing: BrainGeminiBillingContext,
  ): Promise<SearchMode> {
    const prompt = `Pick the best search mode for this query. Allowed: semantic, graph, hybrid, summary, chain.\nReturn ONLY JSON: {"mode":"hybrid"}\nQuery: ${query}`
    const raw = await this.embedding.callGemini(prompt, undefined, billing)
    const parsed = JSON.parse(raw) as { mode?: SearchMode }
    const mode = parsed.mode
    if (!mode) return 'hybrid'
    if (
      mode === 'semantic' ||
      mode === 'graph' ||
      mode === 'hybrid' ||
      mode === 'summary' ||
      mode === 'chain'
    ) {
      return mode
    }
    return 'hybrid'
  }

  private mergeWeighted(
    semantic: ScoredSnapshot[],
    graph: ScoredSnapshot[],
    semanticWeight: number,
    graphWeight: number,
    limit: number,
  ): ScoredSnapshot[] {
    const merged = new Map<string, ScoredSnapshot>()
    const semanticMap = new Map(semantic.map((s) => [s.id, s]))
    const graphMap = new Map(graph.map((s) => [s.id, s]))
    const allIds = new Set([...semanticMap.keys(), ...graphMap.keys()])

    for (const id of allIds) {
      const s = semanticMap.get(id)
      const g = graphMap.get(id)
      const base = s ?? g
      if (!base) continue
      const score = (s?.score ?? 0) * semanticWeight + (g?.score ?? 0) * graphWeight
      merged.set(id, { ...base, score })
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  private async fetchSnapshotsByIds(
    supabase: SupabaseClient,
    ids: string[],
  ): Promise<SnapshotRow[]> {
    if (!ids.length) return []
    const data = await this.searchRepository.findSnapshotsByIds(supabase, ids)

    const order = new Map(ids.map((id, i) => [id, i]))
    return ((data ?? []) as SnapshotRow[])
      .map((row) => ({
        ...row,
        node_type: 'snapshot' as const,
        snapshot_type: row.type,
        content: row.core,
      }))
      .sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999))
  }
}
