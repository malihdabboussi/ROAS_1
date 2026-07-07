import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MemoriesRepository } from '../repositories/memories.repository'
import { SnapshotsRepository } from '../repositories/snapshots.repository'
import type { GraphEdge } from '../types/brain.types'

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface GraphFilters {
  limit?: number
  min_significance?: number
  memory_type?: string
}

export interface GraphStats {
  total_memories: number
  total_documents: number
  total_snapshots: number
  total_connections: number
  by_type: Record<string, number>
  by_snapshot_type: Record<string, number>
  hub_nodes: Array<{ id: string; connection_count: number }>
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS

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
  ) {}

  async buildGraph(supabase: SupabaseClient, filters: GraphFilters) {
    // 1. Fetch memories
    const memories = await this.memoriesRepo.findForGraph(supabase, {
      limit: filters.limit,
      min_significance: filters.min_significance,
      memory_type: filters.memory_type,
    })

    const memoryIds = memories.map((m: Record<string, unknown>) => m.id as string)

    // 2. Fetch connections between those memories
    const rawConnections = await this.memoriesRepo.findConnectionsBetween(supabase, memoryIds)

    // 3. Enrich memory nodes with age_category, status, node_type
    const memoryNodes = this.enrichMemoryNodes(memories)

    // 4. Build virtual document nodes from source_title grouping
    const { docNodes, docConnections } = this.buildDocumentNodes(memoryNodes)

    // 5. Fetch snapshots and map to graph nodes
    const snapshots = await this.snapshotsRepo.findAll(supabase, { limit: 100 })
    const snapshotNodes = this.mapSnapshotNodes(snapshots)

    // 6. Map raw connections to GraphEdge format
    const memoryEdges: GraphEdge[] = rawConnections.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      source_memory_id: c.source_memory_id as string,
      target_memory_id: c.target_memory_id as string,
      relationship_type: c.relationship as string,
      strength: c.strength as number,
    }))

    const allConnections = [...memoryEdges, ...docConnections]

    // 7. Build stats
    const stats = this.computeStats(memories, snapshots, docNodes, allConnections)

    return {
      nodes: [...memoryNodes, ...docNodes, ...snapshotNodes],
      connections: allConnections,
      stats,
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private enrichMemoryNodes(memories: Record<string, unknown>[]) {
    const now = Date.now()

    return memories.map((m) => {
      const createdAt = new Date(m.created_at as string).getTime()
      const age = now - createdAt
      const significance = m.significance as number

      const age_category = age < ONE_DAY_MS ? 'new' : age < SEVEN_DAYS_MS ? 'recent' : 'older'
      const status = age < ONE_DAY_MS ? 'new' : significance < 0.3 ? 'expiring' : 'active'

      return { ...m, age_category, status, node_type: 'memory' }
    })
  }

  private buildDocumentNodes(memoryNodes: Record<string, unknown>[]) {
    // Group memories by source_type::source_title
    const groups: Record<string, Record<string, unknown>[]> = {}
    for (const m of memoryNodes) {
      if (!m.source_title) continue
      const key = `${(m.source_type as string) ?? 'unknown'}::${m.source_title as string}`
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    }

    const docNodes: Record<string, unknown>[] = []
    const docConnections: GraphEdge[] = []

    for (const [key, members] of Object.entries(groups)) {
      if (members.length < 2) continue

      const id = `doc-${createHash('md5').update(key).digest('hex').slice(0, 12)}`
      const [sourceType, ...titleParts] = key.split('::')
      const title = titleParts.join('::')

      docNodes.push({
        id,
        content: title,
        memory_type: 'document',
        source_type: sourceType,
        source_title: title,
        speaker: null,
        significance: 1,
        confidence: 1,
        tags: [],
        agent_id: null,
        recalled_count: 0,
        created_at: members[0].created_at,
        age_category: 'older',
        status: 'active',
        node_type: 'document',
      })

      for (const member of members) {
        docConnections.push({
          id: `${id}-${member.id as string}`,
          source_memory_id: id,
          target_memory_id: member.id as string,
          relationship_type: 'doc_source',
          strength: 0.8,
        })
      }
    }

    return { docNodes, docConnections }
  }

  private mapSnapshotNodes(snapshots: Record<string, unknown>[]) {
    return snapshots.map((s) => ({
      ...s,
      node_type: 'snapshot',
      age_category: 'older' as const,
      status: 'active' as const,
    }))
  }

  private computeStats(
    memories: Record<string, unknown>[],
    snapshots: Record<string, unknown>[],
    docNodes: Record<string, unknown>[],
    allConnections: GraphEdge[],
  ): GraphStats {
    // Connection counts per node (for hub_nodes)
    const connCount: Record<string, number> = {}
    for (const c of allConnections) {
      connCount[c.source_memory_id] = (connCount[c.source_memory_id] || 0) + 1
      connCount[c.target_memory_id] = (connCount[c.target_memory_id] || 0) + 1
    }

    const hubNodes = Object.entries(connCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ id, connection_count: count }))

    // Breakdown by memory type
    const byType: Record<string, number> = {}
    for (const m of memories) {
      const t = m.memory_type as string
      byType[t] = (byType[t] || 0) + 1
    }

    // Breakdown by snapshot type
    const bySnapshotType: Record<string, number> = {}
    for (const s of snapshots) {
      const t = s.type as string
      bySnapshotType[t] = (bySnapshotType[t] || 0) + 1
    }

    return {
      total_memories: memories.length,
      total_documents: docNodes.length,
      total_snapshots: snapshots.length,
      total_connections: allConnections.length,
      by_type: byType,
      by_snapshot_type: bySnapshotType,
      hub_nodes: hubNodes,
    }
  }
}
