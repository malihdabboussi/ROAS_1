import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { sumBrainConnectionCounts } from '../utils/brain-connection-stats'
import { MemoryBrainResolver } from './memory-brain-resolver'

export type MemoryConnectionRow = {
  id?: string
  source_memory_id: string
  target_memory_id: string
  relationship?: string
  strength?: number
}

export type BrainHealthBatchRow = {
  brain_id: string
  total_memories: number
  total_connections: number
  embedding_queue: number
  last_capture: string | null
  connections_by_type: Record<string, number>
  memory_counts_by_type: Record<string, number>
  sk_entries_by_type: Record<string, number>
  experience_sources: number
}

@Injectable()
export class MemoryStatsRepository {
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly brainResolver: MemoryBrainResolver,
  ) {}

  async findConnectionsBetween(
    client: SupabaseClient,
    memoryIds: string[],
  ): Promise<MemoryConnectionRow[]> {
    if (!memoryIds.length) return []
    const pageSize = 1000
    const all: MemoryConnectionRow[] = []
    let offset = 0
    while (true) {
      const { data, error } = await client
        .rpc('find_connections_between', {
          p_memory_ids: memoryIds,
        })
        .range(offset, offset + pageSize - 1)
      if (error) throw new Error(`DB error: ${error.message}`)
      const batch = (data ?? []) as MemoryConnectionRow[]
      all.push(...batch)
      if (batch.length < pageSize) break
      offset += pageSize
    }
    return all
  }

  async findConnectionsForBrain(
    client: SupabaseClient,
    brainId: string,
  ): Promise<MemoryConnectionRow[]> {
    const pageSize = 1000
    const all: MemoryConnectionRow[] = []
    let offset = 0
    while (true) {
      const { data, error } = await client.rpc('find_connections_for_brain', {
        p_brain_id: brainId,
        p_limit: pageSize,
        p_offset: offset,
      })
      if (error) throw new Error(`DB error: ${error.message}`)
      const batch = (data ?? []) as MemoryConnectionRow[]
      all.push(...batch)
      if (batch.length < pageSize) break
      offset += pageSize
    }
    return all
  }

  async countMemoryConnectionsForBrain(client: SupabaseClient, brainId: string): Promise<number> {
    const { data, error } = await client.rpc('count_brain_memory_connections', {
      p_brain_id: brainId,
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    return Number(data ?? 0)
  }

  async getLegendStatsForBrain(client: SupabaseClient, brainId: string) {
    const [connectionsByType, skEntriesByType, memoryCountsByType, experienceSources] =
      await Promise.all([
        client.rpc('brain_legend_connection_counts', { p_brain_id: brainId }),
        client.rpc('brain_sk_entry_counts_by_type', { p_brain_id: brainId }),
        client.rpc('brain_memory_counts_by_type', { p_brain_id: brainId }),
        client.rpc('count_brain_experience_sources', { p_brain_id: brainId }),
      ])
    if (connectionsByType.error) throw new Error(`DB error: ${connectionsByType.error.message}`)
    if (skEntriesByType.error) throw new Error(`DB error: ${skEntriesByType.error.message}`)
    if (memoryCountsByType.error) throw new Error(`DB error: ${memoryCountsByType.error.message}`)
    if (experienceSources.error) throw new Error(`DB error: ${experienceSources.error.message}`)

    return {
      connections_by_type: (connectionsByType.data ?? {}) as Record<string, number>,
      sk_entries_by_type: (skEntriesByType.data ?? {}) as Record<string, number>,
      memory_counts_by_type: (memoryCountsByType.data ?? {}) as Record<string, number>,
      experience_sources: Number(experienceSources.data ?? 0),
    }
  }

  async getStats(
    client: SupabaseClient,
    ownerId?: string,
    agentId?: string,
    orgId?: string | null,
  ) {
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.brainResolver.resolveBrainId(client, ownerId, agentId, orgId)
    if (!brainId) {
      return {
        total: 0,
        connections: 0,
        this_week: 0,
        by_type: {},
        by_source: {},
        most_recalled: [],
        most_connected: [],
      }
    }

    const {
      data: rows,
      count: total,
      error: rowsErr,
    } = await client
      .from('ns_memories')
      .select('memory_type, source_type', { count: 'exact' })
      .eq('brain_id', brainId)
      .limit(10000)
    if (rowsErr) throw new Error(`DB error: ${rowsErr.message}`)

    const byType: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    for (const row of rows ?? []) {
      byType[row.memory_type] = (byType[row.memory_type] || 0) + 1
      const src = row.source_type ?? 'unknown'
      bySource[src] = (bySource[src] || 0) + 1
    }

    const connections = await this.countMemoryConnectionsForBrain(client, brainId)

    const { data: memoryRows, error: memoryRowsErr } = await client
      .from('ns_memories')
      .select('id')
      .eq('brain_id', brainId)
      .limit(10000)
    if (memoryRowsErr) throw new Error(`DB error: ${memoryRowsErr.message}`)
    const memoryIds = (memoryRows ?? []).map((m) => m.id)

    const allConnections =
      memoryIds.length > 0 ? await this.findConnectionsBetween(client, memoryIds) : []

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: thisWeek, error: weekErr } = await client
      .from('ns_memories')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)
      .gte('created_at', weekAgo.toISOString())
    if (weekErr) throw new Error(`DB error: ${weekErr.message}`)

    const { data: recalled, error: recalledErr } = await client
      .from('ns_memories')
      .select('id, content, memory_type, recalled_count')
      .eq('brain_id', brainId)
      .order('recalled_count', { ascending: false })
      .gt('recalled_count', 0)
      .limit(5)
    if (recalledErr) throw new Error(`DB error: ${recalledErr.message}`)

    let mostConnected: Array<{ id: string; content: string; connection_count: number }> = []
    if (allConnections.length > 0) {
      const connCounts: Record<string, number> = {}
      for (const c of allConnections) {
        connCounts[c.source_memory_id] = (connCounts[c.source_memory_id] || 0) + 1
        connCounts[c.target_memory_id] = (connCounts[c.target_memory_id] || 0) + 1
      }

      const topConnIds = Object.entries(connCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
      if (topConnIds.length) {
        const topIds = topConnIds.map(([id]) => id)
        const { data: connMems } = await client
          .from('ns_memories')
          .select('id, content')
          .in('id', topIds)
        mostConnected = topConnIds.map(([id, count]) => {
          const mem = (connMems ?? []).find((m) => m.id === id)
          return { id, content: mem?.content ?? '', connection_count: count }
        })
      }
    }

    return {
      total: total ?? 0,
      connections,
      this_week: thisWeek ?? 0,
      by_type: byType,
      by_source: bySource,
      most_recalled: recalled ?? [],
      most_connected: mostConnected,
    }
  }

  async getHealthStats(
    client: SupabaseClient,
    ownerId?: string,
    agentId?: string,
    explicitBrainId?: string,
    orgId?: string | null,
  ) {
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    let brainId: string | null = null
    let brainScope: string | null = null
    if (explicitBrainId?.trim()) {
      const { data: brainRow } = await client
        .from('ns_brains')
        .select('id, scope, org_id')
        .eq('id', explicitBrainId.trim())
        .maybeSingle()
      brainId = brainRow?.id ?? null
      brainScope = (brainRow?.scope as string | undefined) ?? null
    } else {
      brainId = await this.brainResolver.resolveBrainId(client, ownerId, agentId, orgId)
      brainScope = agentId?.trim() ? 'agent' : 'user'
    }
    if (!brainId) {
      return {
        total_memories: 0,
        total_connections: 0,
        embedding_queue: 0,
        last_capture: null as string | null,
      }
    }

    const aggClient = this.svc.client

    if (brainScope === 'company') {
      const [
        { count: objects },
        { count: signals },
        { count: edges },
        objectCountsByType,
        relationCountsByType,
        { data: settings, error: settingsError },
      ] = await Promise.all([
        aggClient
          .from('company_cortex_objects')
          .select('*', { count: 'exact', head: true })
          .eq('brain_id', brainId)
          .neq('status', 'retired'),
        aggClient
          .from('company_cortex_signals')
          .select('*', { count: 'exact', head: true })
          .eq('brain_id', brainId)
          .in('status', ['proposed', 'active', 'merged']),
        aggClient
          .from('company_cortex_object_edges')
          .select('*', { count: 'exact', head: true })
          .eq('brain_id', brainId),
        aggClient.rpc('company_cortex_object_counts_by_type', { p_brain_id: brainId }),
        aggClient.rpc('company_cortex_relation_counts_by_type', { p_brain_id: brainId }),
        aggClient
          .from('company_cortex_settings')
          .select('last_successful_dream_at')
          .eq('brain_id', brainId)
          .maybeSingle(),
      ])
      if (objectCountsByType.error) throw new Error(`DB error: ${objectCountsByType.error.message}`)
      if (relationCountsByType.error)
        throw new Error(`DB error: ${relationCountsByType.error.message}`)
      if (settingsError) throw new Error(`DB error: ${settingsError.message}`)
      return {
        total_memories: objects ?? 0,
        total_connections: edges ?? 0,
        embedding_queue: 0,
        last_capture: (settings?.last_successful_dream_at as string | null | undefined) ?? null,
        connections_by_type: (relationCountsByType.data ?? {}) as Record<string, number>,
        memory_counts_by_type: (objectCountsByType.data ?? {}) as Record<string, number>,
        sk_entries_by_type: {},
        experience_sources: signals ?? 0,
      }
    }

    const legendStats = await this.getLegendStatsForBrain(aggClient, brainId)

    const memories = Object.values(legendStats.memory_counts_by_type).reduce((sum, n) => sum + n, 0)
    const skEntries = Object.values(legendStats.sk_entries_by_type).reduce((sum, n) => sum + n, 0)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: embeddingQueueMem } = await aggClient
      .from('ns_memories')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)
      .is('embedding', null)
      .gte('created_at', oneHourAgo)

    const { count: embeddingQueueSk } = await aggClient
      .from('ns_sk_entries')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)
      .is('embedding', null)
      .gte('created_at', oneHourAgo)

    const pendingImportJobs = await this.countPendingImportJobsForBrain(
      aggClient,
      ownerId,
      brainId,
      brainScope,
    )

    const { data: lastMem } = await aggClient
      .from('ns_memories')
      .select('created_at')
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: lastSk } = await aggClient
      .from('ns_sk_entries')
      .select('created_at')
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const memIso = lastMem?.created_at as string | undefined
    const skIso = lastSk?.created_at as string | undefined
    let lastCapture: string | null = null
    if (memIso && skIso) {
      lastCapture = new Date(memIso).getTime() >= new Date(skIso).getTime() ? memIso : skIso
    } else {
      lastCapture = memIso ?? skIso ?? null
    }

    return {
      total_memories: memories + skEntries,
      total_connections: sumBrainConnectionCounts(legendStats.connections_by_type),
      embedding_queue: (embeddingQueueMem ?? 0) + (embeddingQueueSk ?? 0) + pendingImportJobs,
      last_capture: lastCapture,
      connections_by_type: legendStats.connections_by_type,
      memory_counts_by_type: legendStats.memory_counts_by_type,
      sk_entries_by_type: legendStats.sk_entries_by_type,
      experience_sources: legendStats.experience_sources,
    }
  }

  async getHealthStatsBatch(client: SupabaseClient, ownerId: string, brainIds: string[]) {
    const ids = [...new Set(brainIds.map((id) => id.trim()).filter(Boolean))]
    if (ids.length === 0) return []

    const CHUNK_SIZE = 15
    const rows: BrainHealthBatchRow[] = []
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE)
      const { data, error } = await client.rpc('brain_home_health_batch', {
        p_brain_ids: chunk,
        p_owner_id: ownerId,
      })
      if (error) throw new Error(`RPC error: ${error.message}`)
      rows.push(...((data ?? []) as BrainHealthBatchRow[]))
    }
    return rows
  }

  private async countPendingImportJobsForBrain(
    client: SupabaseClient,
    ownerId: string,
    brainId: string,
    brainScope?: string | null,
  ): Promise<number> {
    let query = client
      .from('brain_import_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ownerId)
      .in('status', ['queued', 'processing', 'retry'])

    if (brainScope === 'user') {
      query = query
        .in('job_type', [
          'document_remember',
          'user_link_import',
          'fathom_meeting_import',
          'fireflies_transcript_import',
        ])
        .is('payload->>brainId', null)
    } else {
      query = query.eq('payload->>brainId', brainId)
    }

    const { count, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return count ?? 0
  }
}
