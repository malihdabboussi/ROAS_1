import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { MemoryBrainResolver } from './memory-brain-resolver'
import { MemoryStatsRepository, type MemoryConnectionRow } from './memory-stats.repository'

export interface MemoryListFilters {
  memory_type?: string
  source_type?: string
  tags?: string[]
  search?: string
  limit?: number
  offset?: number
}

export interface SearchOptions {
  limit?: number
  threshold?: number
  memory_type?: string
  source_type?: string
  project_id?: string
  tags?: string[]
  min_significance?: number
  owner_id?: string
}

/**
 * Columns the ForceGraph payload actually renders — everything on ns_memories
 * except `embedding` (vector(768), ~8KB serialized per row) and `search_vector`
 * (generated tsvector). At the 10k full-graph load those two columns dominated
 * the response size while the UI never reads them.
 */
export const MEMORY_GRAPH_SELECT =
  'id, brain_id, content, content_hash, memory_type, source_type, source_id, source_title, speaker, confidence, significance, tags, metadata, source_emotion, emotional_valence, emotional_intensity, speaker_intent, recalled_count, last_recalled_at, created_at, updated_at, agent_id, media_type, media_url, media_mime_type, contact_id, surprise_score, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source'

@Injectable()
export class MemoriesRepository {
  constructor(
    private readonly brainResolver: MemoryBrainResolver,
    private readonly statsRepository: MemoryStatsRepository,
  ) {}

  async findByUserId(
    client: SupabaseClient,
    userId: string,
    filters: MemoryListFilters = {},
    orgId?: string | null,
  ) {
    const brainId = await this.brainResolver.resolveDefaultBrainId(client, userId, orgId)

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

  async resolveDefaultBrainId(client: SupabaseClient, ownerId: string, orgId?: string | null) {
    return this.brainResolver.resolveDefaultBrainId(client, ownerId, orgId)
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

  async create(client: SupabaseClient, record: Record<string, unknown>, orgId?: string | null) {
    const ownerId = this.brainResolver.extractOwnerId(record)
    const agentId =
      typeof record.agent_id === 'string' && record.agent_id.trim().length > 0
        ? record.agent_id.trim()
        : undefined
    const brainId =
      (record.brain_id as string | undefined) ??
      (await this.brainResolver.resolveBrainId(client, ownerId, agentId, orgId)) ??
      (await this.brainResolver.resolveDefaultBrainId(client, ownerId, orgId))
    const { project_id: _p, owner_id: _o, ...rest } = record
    const { data, error } = await client
      .from('ns_memories')
      .insert({ ...rest, brain_id: brainId, ...(agentId ? { agent_id: agentId } : {}) })
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
      agent_id?: string
      owner_id?: string
      limit?: number
      min_significance?: number
      memory_type?: string
    } = {},
    orgId?: string | null,
  ) {
    const ownerId = filters.owner_id
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.brainResolver.resolveBrainId(
      client,
      ownerId,
      filters.agent_id,
      orgId,
    )
    if (!brainId) return []

    let query = client
      .from('ns_memories')
      .select(MEMORY_GRAPH_SELECT)
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
    if (filters.memory_type) query = query.eq('memory_type', filters.memory_type)
    if (filters.min_significance != null)
      query = query.gte('significance', filters.min_significance)
    query = query.limit(filters.limit ?? 200)

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findConnectionsBetween(
    client: SupabaseClient,
    memoryIds: string[],
  ): Promise<MemoryConnectionRow[]> {
    return this.statsRepository.findConnectionsBetween(client, memoryIds)
  }

  async findConnectionsForBrain(
    client: SupabaseClient,
    brainId: string,
  ): Promise<MemoryConnectionRow[]> {
    return this.statsRepository.findConnectionsForBrain(client, brainId)
  }

  async countMemoryConnectionsForBrain(client: SupabaseClient, brainId: string): Promise<number> {
    return this.statsRepository.countMemoryConnectionsForBrain(client, brainId)
  }

  async getLegendStatsForBrain(client: SupabaseClient, brainId: string) {
    return this.statsRepository.getLegendStatsForBrain(client, brainId)
  }

  async search(
    client: SupabaseClient,
    queryEmbedding: number[],
    options: SearchOptions = {},
    orgId?: string | null,
  ) {
    const ownerId = options.owner_id
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.brainResolver.resolveBrainId(client, ownerId, undefined, orgId)
    if (!brainId) return []
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

  async getStats(
    client: SupabaseClient,
    ownerId?: string,
    agentId?: string,
    orgId?: string | null,
  ) {
    return this.statsRepository.getStats(client, ownerId, agentId, orgId)
  }

  async getHealthStats(
    client: SupabaseClient,
    ownerId?: string,
    agentId?: string,
    explicitBrainId?: string,
    orgId?: string | null,
  ) {
    return this.statsRepository.getHealthStats(client, ownerId, agentId, explicitBrainId, orgId)
  }

  async getHealthStatsBatch(client: SupabaseClient, ownerId: string, brainIds: string[]) {
    return this.statsRepository.getHealthStatsBatch(client, ownerId, brainIds)
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

  async checkDuplicate(
    client: SupabaseClient,
    contentHash: string,
    ownerId?: string,
    orgId?: string | null,
    brainIdOverride?: string | null,
  ) {
    let query = client.from('ns_memories').select('id').eq('content_hash', contentHash).limit(1)
    if (brainIdOverride?.trim()) {
      query = query.eq('brain_id', brainIdOverride.trim())
    } else if (ownerId) {
      const brainId = await this.brainResolver.resolveDefaultBrainId(client, ownerId, orgId)
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

  async createSession(
    client: SupabaseClient,
    record: Record<string, unknown>,
    orgId?: string | null,
  ) {
    const ownerId = (record as { owner_id?: string }).owner_id as string | undefined
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId =
      ((record as { brain_id?: string }).brain_id as string | undefined) ??
      (await this.brainResolver.resolveDefaultBrainId(client, ownerId, orgId))
    const { owner_id: _, ...sessionRecord } = record
    const { data, error } = await client
      .from('ns_memory_sessions')
      .insert({ ...sessionRecord, brain_id: brainId })
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

  async listExtensionBrains(client: SupabaseClient, scope: RequestScope) {
    let query = client
      .from('ns_brains')
      .select(
        'id, name, description, color, icon, is_default, agent_id, tags, org_id, scope, created_by, created_at',
      )
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (scope.orgId) {
      query = query.eq('org_id', scope.orgId)
    } else {
      query = query.is('org_id', null)
    }

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async listExtensionCampaigns(client: SupabaseClient, scope: RequestScope) {
    let query = client
      .from('campaigns')
      .select('id, name, config')
      .is('deleted_at', null)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })

    if (scope.orgId) {
      query = query.eq('org_id', scope.orgId)
    } else {
      query = query.is('org_id', null)
    }

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }
}
