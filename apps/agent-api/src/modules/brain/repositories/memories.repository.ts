import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface MemoryListFilters {
  memory_type?: string
  source_type?: string
  tags?: string[]
  search?: string
  limit?: number
  offset?: number
  brain_id?: string
}

export interface SearchOptions {
  limit?: number
  threshold?: number
  memory_type?: string
  source_type?: string
  tags?: string[]
  min_significance?: number
  owner_id?: string
  brain_id?: string
}

@Injectable()
export class MemoriesRepository {
  private async resolveDefaultBrainId(client: SupabaseClient, ownerId: string): Promise<string> {
    const { data: existing } = await client
      .from('ns_brains')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
    if (existing?.[0]?.id) return existing[0].id

    const { data: created, error } = await client
      .from('ns_brains')
      .insert({
        owner_id: ownerId,
        org_id: null,
        name: 'Default Brain',
        is_default: true,
        scope: 'user',
        color: '#8B85C8',
        icon: 'brain',
        tags: [],
      })
      .select('id')
      .maybeSingle()
    if (created?.id) return created.id

    if (error) {
      const { data: fallback } = await client
        .from('ns_brains')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('is_default', true)
        .eq('scope', 'user')
        .is('org_id', null)
        .limit(1)
        .maybeSingle()
      if (fallback?.id) return fallback.id
    }

    throw new Error('Failed creating or finding default brain')
  }

  private extractOwnerId(record: Record<string, unknown>): string {
    const metadata = (record.metadata as Record<string, unknown> | undefined) ?? {}
    const fromMetadata = metadata.user_id
    if (typeof fromMetadata === 'string' && fromMetadata.length > 0) return fromMetadata

    const speaker = record.speaker
    if (typeof speaker === 'string' && speaker.length > 0 && speaker !== 'assistant') return speaker

    throw new Error('Missing owner id for NeuralSnap brain resolution')
  }

  async findByUserId(client: SupabaseClient, userId: string, filters: MemoryListFilters = {}) {
    const brainId = filters.brain_id ?? (await this.resolveDefaultBrainId(client, userId))
    let query = client.from('ns_memories').select('*').eq('brain_id', brainId).order('created_at', {
      ascending: false,
    })
    if (filters.memory_type) query = query.eq('memory_type', filters.memory_type)
    if (filters.source_type) query = query.eq('source_type', filters.source_type)
    if (filters.tags?.length) query = query.overlaps('tags', filters.tags)
    if (filters.search) query = query.ilike('content', `%${filters.search}%`)

    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findById(client: SupabaseClient, id: string) {
    const { data, error } = await client.from('ns_memories').select('*').eq('id', id).single()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findByIds(client: SupabaseClient, ids: string[]) {
    if (!ids.length) return []
    const { data, error } = await client
      .from('ns_memories')
      .select('id, content, memory_type, source_type, tags, created_at')
      .in('id', ids)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async create(client: SupabaseClient, record: Record<string, unknown>) {
    const ownerId = this.extractOwnerId(record)
    const brainId =
      (record.brain_id as string | undefined) ?? (await this.resolveDefaultBrainId(client, ownerId))
    const { project_id: _p, owner_id: _o, ...rest } = record
    const { data, error } = await client
      .from('ns_memories')
      .insert({ ...rest, brain_id: brainId })
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async update(client: SupabaseClient, id: string, fields: Record<string, unknown>) {
    const { data, error } = await client
      .from('ns_memories')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async delete(client: SupabaseClient, id: string) {
    const { error } = await client.from('ns_memories').delete().eq('id', id)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async findForGraph(
    client: SupabaseClient,
    filters: {
      owner_id?: string
      limit?: number
      min_significance?: number
      memory_type?: string
    } = {},
  ) {
    const ownerId = filters.owner_id
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.resolveDefaultBrainId(client, ownerId)

    let query = client.from('ns_memories').select('*').eq('brain_id', brainId).order('created_at', {
      ascending: false,
    })
    if (filters.memory_type) query = query.eq('memory_type', filters.memory_type)
    if (filters.min_significance != null)
      query = query.gte('significance', filters.min_significance)
    query = query.limit(filters.limit ?? 200)

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findConnectionsBetween(client: SupabaseClient, memoryIds: string[]) {
    if (!memoryIds.length) return []
    const { data, error } = await client.rpc('find_connections_between', {
      p_memory_ids: memoryIds,
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async search(client: SupabaseClient, queryEmbedding: number[], options: SearchOptions = {}) {
    let brainId = options.brain_id
    if (!brainId) {
      const ownerId = options.owner_id
      if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
      brainId = await this.resolveDefaultBrainId(client, ownerId)
    }
    const { data, error } = await client.rpc('search_ns_memories', {
      p_brain_id: brainId,
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
      p_match_threshold: options.threshold ?? 0.5,
      p_match_count: options.limit ?? 20,
      p_min_significance: options.min_significance ?? 0,
    })
    if (error) throw new Error(`RPC error: ${error.message}`)

    let results = data ?? []
    if (options.memory_type) {
      results = results.filter(
        (r: Record<string, unknown>) => r.memory_type === options.memory_type,
      )
    }
    if (options.source_type) {
      results = results.filter(
        (r: Record<string, unknown>) => r.source_type === options.source_type,
      )
    }
    return results
  }

  async getStats(client: SupabaseClient, ownerId?: string, overrideBrainId?: string) {
    let brainId = overrideBrainId
    if (!brainId) {
      if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
      brainId = await this.resolveDefaultBrainId(client, ownerId)
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

    return {
      total: total ?? 0,
      connections: 0,
      this_week: 0,
      by_type: byType,
      by_source: bySource,
      most_recalled: [],
      most_connected: [],
    }
  }

  async getHealthStats(client: SupabaseClient, ownerId?: string, overrideBrainId?: string) {
    let brainId = overrideBrainId
    if (!brainId) {
      if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
      brainId = await this.resolveDefaultBrainId(client, ownerId)
    }

    const { count: memories } = await client
      .from('ns_memories')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: embeddingQueue } = await client
      .from('ns_memories')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)
      .is('embedding', null)
      .gte('created_at', oneHourAgo)

    return {
      memories: memories ?? 0,
      connections: 0,
      embedding_queue: embeddingQueue ?? 0,
    }
  }

  async getConnections(client: SupabaseClient, memoryId: string) {
    const { data, error } = await client
      .from('ns_memory_connections')
      .select('*')
      .or(`source_memory_id.eq.${memoryId},target_memory_id.eq.${memoryId}`)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async createConnection(client: SupabaseClient, record: Record<string, unknown>) {
    const { data, error } = await client
      .from('ns_memory_connections')
      .insert(record)
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async deleteConnection(client: SupabaseClient, id: string) {
    const { error } = await client.from('ns_memory_connections').delete().eq('id', id)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async getVersions(client: SupabaseClient, memoryId: string) {
    const { data, error } = await client
      .from('ns_memory_versions')
      .select('*')
      .eq('memory_id', memoryId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async createVersion(client: SupabaseClient, record: Record<string, unknown>) {
    const { data, error } = await client.from('ns_memory_versions').insert(record).select().single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async checkDuplicate(client: SupabaseClient, contentHash: string, ownerId?: string) {
    let query = client.from('ns_memories').select('id').eq('content_hash', contentHash).limit(1)
    if (ownerId) {
      const brainId = await this.resolveDefaultBrainId(client, ownerId)
      query = query.eq('brain_id', brainId)
    }
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []).length > 0
  }

  async findSessionByKey(client: SupabaseClient, sessionKey: string) {
    const { data, error } = await client
      .from('ns_memory_sessions')
      .select('*')
      .eq('session_key', sessionKey)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return data
  }

  async createSession(client: SupabaseClient, record: Record<string, unknown>) {
    const ownerId = (record as { owner_id?: string }).owner_id as string | undefined
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId =
      ((record as { brain_id?: string }).brain_id as string | undefined) ??
      (await this.resolveDefaultBrainId(client, ownerId))
    const { data, error } = await client
      .from('ns_memory_sessions')
      .insert({ ...record, brain_id: brainId })
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async updateSession(client: SupabaseClient, id: string, fields: Record<string, unknown>) {
    const { data, error } = await client
      .from('ns_memory_sessions')
      .update(fields)
      .eq('session_key', id)
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }
}
