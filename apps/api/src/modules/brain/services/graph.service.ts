import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainGraphRepository } from '../repositories/brain-graph.repository'
import { MemoriesRepository } from '../repositories/memories.repository'
import { SNAPSHOT_GRAPH_SELECT, SnapshotsRepository } from '../repositories/snapshots.repository'
import type { GraphEdge } from '../types/brain.types'
import { sumBrainConnectionCounts } from '../utils/brain-connection-stats'
import {
  buildCognitionNodes,
  buildCompanyGraphPayload,
  buildExperienceNodes,
  computeGraphStats,
  emptyGraphStats,
  enrichMemoryNodes,
  mapSnapshotNodes,
} from './graph-node-builders'

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface GraphFilters {
  agent_id?: string
  owner_id?: string
  org_id?: string | null
  brain_id?: string
  limit?: number
  min_significance?: number
  memory_type?: string
}

export interface GraphStats {
  total_memories: number
  total_experiences: number
  total_snapshots: number
  total_connections: number
  by_type: Record<string, number>
  by_snapshot_type: Record<string, number>
  hub_nodes: Array<{ id: string; connection_count: number }>
  /**
   * True when the node window was capped by the request `limit` — the client
   * uses this to skip its full-graph follow-up fetch when the first load
   * already contains every node.
   */
  nodes_truncated?: boolean
}

// ── Service ─────────────────────────────────────────────────────────────────

/**
 * Graph Service (US-006)
 *
 * Builds the complete ForceGraph visualization payload:
 * memories → enriched nodes, document grouping nodes, snapshot nodes,
 * all connections, and aggregate stats.
 */
@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name)

  constructor(
    private readonly memoriesRepo: MemoriesRepository,
    private readonly snapshotsRepo: SnapshotsRepository,
    private readonly graphRepo: BrainGraphRepository,
  ) {}

  async buildSkGraph(
    supabase: SupabaseClient,
    userId: string,
    brainId: string,
    orgId?: string | null,
    limit?: number,
  ): Promise<{
    nodes: Record<string, unknown>[]
    connections: GraphEdge[]
    stats: GraphStats
  }> {
    const brain = await this.graphRepo.findAccessibleBrainForSkGraph(
      supabase,
      userId,
      brainId,
      orgId,
    )
    if (!brain) {
      return { nodes: [], connections: [], stats: emptyGraphStats() }
    }

    const [sources, entries, memories, rawMemoryConnections, cognition] =
      await Promise.all([
        this.graphRepo.findSkSources(supabase, brainId, limit ?? 200),
        this.graphRepo.findSkEntries(supabase, brainId, limit ?? 500),
        this.findMemoriesForBrain(supabase, brainId, limit),
        this.memoriesRepo.findConnectionsForBrain(supabase, brainId),
        this.fetchCognitionByBrain(supabase, brainId),
      ])
    const sourceList = sources
    const entryList = entries
    const memoryNodes = enrichMemoryNodes(memories)
    const { docNodes, docConnections } = buildExperienceNodes(memoryNodes)

    const sourceNodes = sourceList.map((s) => ({
      id: s.id,
      content: s.title || 'Untitled source',
      memory_type: 'sk_source',
      source_type: s.source_type ?? 'unknown',
      source_title: s.title,
      speaker: null,
      significance: 1,
      confidence: 1,
      tags: [],
      project_id: null,
      agent_id: null,
      recalled_count: 0,
      created_at: s.created_at,
      age_category: 'older' as const,
      status: 'active' as const,
      node_type: 'sk_source' as const,
    }))

    const entryNodes = entryList.map((e) => ({
      id: e.id,
      name: e.title || 'Untitled',
      content: e.content || e.title || 'Untitled',
      memory_type: e.entry_type ?? 'concept',
      source_type: 'sk_entry',
      source_title: null,
      source_id: e.source_id,
      speaker: null,
      significance: (e.confidence ?? 0.8) as number,
      confidence: (e.confidence ?? 0.8) as number,
      tags: [],
      project_id: null,
      agent_id: null,
      recalled_count: 0,
      created_at: e.created_at,
      age_category: 'older' as const,
      status: 'active' as const,
      node_type: 'sk_entry' as const,
      entry_type: e.entry_type,
      domain: e.domain,
      mastery: e.mastery,
    }))

    const connections: GraphEdge[] = []
    const sourceIds = new Set(sourceList.map((s) => s.id))
    for (const e of entryList) {
      if (e.source_id && sourceIds.has(e.source_id)) {
        connections.push({
          id: `${e.source_id}-${e.id}`,
          source_memory_id: e.source_id,
          target_memory_id: e.id,
          relationship_type: 'emerged_from',
          strength: 0.8,
        })
      }
    }

    const entryIds = new Set([
      ...memoryNodes.map((n) => n.id as string),
      ...entryNodes.map((n) => n.id as string),
    ])
    const { beliefNodes, perspectiveNodes, cognitionEdges } = buildCognitionNodes(
      cognition.beliefs,
      cognition.perspectives,
      entryIds,
    )
    const memoryEdges: GraphEdge[] = rawMemoryConnections.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      source_memory_id: c.source_memory_id as string,
      target_memory_id: c.target_memory_id as string,
      relationship_type: c.relationship as string,
      strength: c.strength as number,
    }))
    const allConnections = [...memoryEdges, ...docConnections, ...connections, ...cognitionEdges]

    const bySnapshotType: Record<string, number> = {}
    const connCount: Record<string, number> = {}
    for (const c of allConnections) {
      connCount[c.source_memory_id] = (connCount[c.source_memory_id] || 0) + 1
      connCount[c.target_memory_id] = (connCount[c.target_memory_id] || 0) + 1
    }
    const hubNodes = Object.entries(connCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ id, connection_count: count }))

    const [totalEntries, totalSources, legendStats, memoryConnTotal] =
      await Promise.all([
        this.graphRepo.countSkEntries(supabase, brainId),
        this.graphRepo.countSkSources(supabase, brainId),
        this.memoriesRepo.getLegendStatsForBrain(supabase, brainId),
        this.memoriesRepo.countMemoryConnectionsForBrain(supabase, brainId),
      ])

    const emergedFrom = legendStats.connections_by_type.emerged_from ?? 0

    const byType: Record<string, number> = {}
    for (const [key, value] of Object.entries(legendStats.memory_counts_by_type)) {
      byType[key] = (byType[key] ?? 0) + value
    }
    for (const [key, value] of Object.entries(legendStats.sk_entries_by_type)) {
      byType[key] = (byType[key] ?? 0) + value
    }

    // Map by_type to memory-style for backward compat with LegendPanel
    const stats: GraphStats = {
      total_memories:
        Object.values(legendStats.memory_counts_by_type).reduce((sum, value) => sum + value, 0) +
        totalEntries,
      total_experiences: totalSources,
      total_snapshots: 0,
      total_connections: memoryConnTotal + emergedFrom,
      by_type: byType,
      by_snapshot_type: bySnapshotType,
      hub_nodes: hubNodes,
      nodes_truncated:
        sourceList.length >= (limit ?? 200) ||
        entryList.length >= (limit ?? 500) ||
        memoryNodes.length >= (limit ?? 200),
    }

    return {
      nodes: [
        ...memoryNodes,
        ...docNodes,
        ...sourceNodes,
        ...entryNodes,
        ...beliefNodes,
        ...perspectiveNodes,
      ],
      connections: allConnections,
      stats,
    }
  }

  async buildGraph(supabase: SupabaseClient, filters: GraphFilters) {
    if (filters.brain_id) {
      const brainRow = await this.graphRepo.findBrainScope(supabase, filters.brain_id)
      if (brainRow?.scope === 'company') {
        return this.buildCompanyGraph(
          supabase,
          filters.brain_id,
          (brainRow.org_id as string | null) ?? filters.org_id ?? null,
          filters.limit,
        )
      }
    }

    // 1. Fetch memories + snapshots + cognition in PARALLEL (independent queries).
    //    When `brain_id` is supplied, we query each table by brain_id directly.
    //    Otherwise we fall back to the user/agent default-brain
    //    resolution that the memories repo already does internally via owner_id.
    const isUserScope = !filters.agent_id
    const [memories, snapshots, cognition] = await Promise.all([
      filters.brain_id
        ? this.findMemoriesForBrain(
            supabase,
            filters.brain_id,
            filters.limit,
            filters.min_significance,
            filters.memory_type,
          )
        : this.memoriesRepo.findForGraph(
            supabase,
            {
              agent_id: filters.agent_id,
              owner_id: filters.owner_id,
              limit: filters.limit,
              min_significance: filters.min_significance,
              memory_type: filters.memory_type,
            },
            filters.org_id,
          ),
      filters.brain_id
        ? this.findSnapshotsForBrain(supabase, filters.brain_id, filters.limit ?? 100)
        : this.snapshotsRepo.findAll(
            supabase,
            {
              agent_id: filters.agent_id,
              owner_id: filters.owner_id,
              limit: filters.limit ?? 100,
            },
            filters.org_id,
            SNAPSHOT_GRAPH_SELECT,
          ),
      filters.brain_id
        ? this.fetchCognitionByBrain(supabase, filters.brain_id)
        : isUserScope && filters.owner_id
          ? this.fetchCognition(supabase, filters.owner_id)
          : Promise.resolve({ beliefs: [], perspectives: [] }),
    ])

    const memoryIds = memories.map((m: Record<string, unknown>) => m.id as string)

    // 2. Fetch connections (by brain_id when scoped — avoids 1000-row cap on large id lists)
    const rawConnections = filters.brain_id
      ? await this.memoriesRepo.findConnectionsForBrain(supabase, filters.brain_id)
      : await this.memoriesRepo.findConnectionsBetween(supabase, memoryIds)

    // 3. Enrich memory nodes with age_category, status, node_type
    const memoryNodes = enrichMemoryNodes(memories)

    // 4. Build virtual experience nodes from source_title grouping
    const { docNodes, docConnections } = buildExperienceNodes(memoryNodes)

    const snapshotNodes = mapSnapshotNodes(snapshots)

    // 5. Build cognition nodes + edges (user scope only)
    const memoryIdSet = new Set(memoryIds)
    const { beliefNodes, perspectiveNodes, cognitionEdges } = buildCognitionNodes(
      cognition.beliefs,
      cognition.perspectives,
      memoryIdSet,
    )

    // 6. Map raw connections to GraphEdge format
    const memoryEdges: GraphEdge[] = rawConnections.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      source_memory_id: c.source_memory_id as string,
      target_memory_id: c.target_memory_id as string,
      relationship_type: c.relationship as string,
      strength: c.strength as number,
    }))

    const allConnections = [...memoryEdges, ...docConnections, ...cognitionEdges]

    // 7. Build stats (DB totals when brain-scoped so legend/bar are not capped at graph load size)
    let stats = computeGraphStats(memories, snapshots, docNodes, allConnections)
    if (filters.brain_id) {
      const [memCount, skCount, legendStats] = await Promise.all([
        this.graphRepo.countMemories(supabase, filters.brain_id),
        this.graphRepo.countSkEntries(supabase, filters.brain_id),
        this.memoriesRepo.getLegendStatsForBrain(supabase, filters.brain_id),
      ])
      stats = {
        ...stats,
        total_memories: memCount + skCount,
        total_experiences: legendStats.experience_sources,
        total_connections: sumBrainConnectionCounts(legendStats.connections_by_type),
        by_type: {
          ...stats.by_type,
          ...legendStats.sk_entries_by_type,
        },
      }
    }
    // Memories are the only node family the `limit` window caps (snapshots are
    // hard-capped at 100 regardless), so truncation is decided by memories.
    stats = { ...stats, nodes_truncated: memories.length >= (filters.limit ?? 200) }

    return {
      nodes: [...memoryNodes, ...docNodes, ...snapshotNodes, ...beliefNodes, ...perspectiveNodes],
      connections: allConnections,
      stats,
    }
  }

  async buildCompanyGraph(
    supabase: SupabaseClient,
    brainId: string,
    orgId: string | null,
    limit?: number,
  ): Promise<{
    nodes: Record<string, unknown>[]
    connections: GraphEdge[]
    stats: GraphStats
  }> {
    const nodeLimit = limit ?? 200
    const rows = await this.graphRepo.findCompanyGraphRows(supabase, brainId, orgId, nodeLimit)
    return buildCompanyGraphPayload(rows.objects, rows.signals, rows.edges, nodeLimit)
  }

  private async findMemoriesForBrain(
    supabase: SupabaseClient,
    brainId: string,
    limit?: number,
    minSignificance?: number,
    memoryType?: string,
  ): Promise<Array<Record<string, unknown>>> {
    return this.graphRepo.findMemoriesForBrain(
      supabase,
      brainId,
      limit ?? 200,
      minSignificance,
      memoryType,
    )
  }

  private async findSnapshotsForBrain(
    supabase: SupabaseClient,
    brainId: string,
    limit?: number,
  ): Promise<Array<Record<string, unknown>>> {
    return this.graphRepo.findSnapshotsForBrain(supabase, brainId, limit ?? 100)
  }

  private async fetchCognitionByBrain(supabase: SupabaseClient, brainId: string) {
    return this.graphRepo.fetchCognitionByBrain(supabase, brainId)
  }

  private async fetchCognition(supabase: SupabaseClient, subjectId: string) {
    return this.graphRepo.fetchCognition(supabase, subjectId)
  }

}
