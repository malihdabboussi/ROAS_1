import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { SnapshotType } from '../types/brain.types'

/**
 * Columns the ForceGraph payload actually renders — everything on ns_snapshots
 * except `embedding` (vector(768)) and `search_vector` (generated tsvector),
 * which the UI never reads.
 */
export const SNAPSHOT_GRAPH_SELECT =
  'id, brain_id, name, type, core, one_liner, story, moment, emotion, source, trigger_pattern, method, steps, filter, challenge, break_test, risks, proof, confidence, significance_score, tags, source_type, source_id, agent_id, session_id, capture_context, created_at, updated_at, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source'

export interface SnapshotFilters {
  agent_id?: string
  owner_id?: string
  type?: SnapshotType
  tag?: string
  min_confidence?: number
  limit?: number
}

@Injectable()
export class SnapshotsRepository {
  private readonly TABLE = 'ns_snapshots'

  constructor(private readonly svc: SupabaseServiceClient) {}

  private async resolveDefaultBrainId(
    _client: SupabaseClient,
    ownerId: string,
    _orgId?: string | null,
  ): Promise<string> {
    const serviceClient = this.svc.client
    const { data: existing, error: existingError } = await serviceClient
      .from('ns_brains')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (existingError) throw new Error(`DB error: ${existingError.message}`)
    if (existing?.id) return existing.id

    const { data: created, error } = await serviceClient
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
    if (error && error.code !== '23505') throw new Error(`DB error: ${error.message}`)

    const { data: fallback, error: fallbackError } = await serviceClient
      .from('ns_brains')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fallbackError) throw new Error(`DB error: ${fallbackError.message}`)
    if (!fallback?.id) throw new Error('Failed creating or finding default brain')
    return fallback.id
  }

  private async resolveAgentBrainId(
    client: SupabaseClient,
    ownerId: string,
    agentId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    let query = client.from('ns_brains').select('id').eq('agent_id', agentId)

    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.eq('owner_id', ownerId).is('org_id', null)
    }

    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data?.id ?? null
  }

  private async resolveBrainId(
    client: SupabaseClient,
    ownerId: string,
    agentId?: string,
    orgId?: string | null,
  ): Promise<string | null> {
    if (agentId?.trim()) {
      return this.resolveAgentBrainId(client, ownerId, agentId.trim(), orgId)
    }
    return this.resolveDefaultBrainId(client, ownerId, orgId)
  }

  async findAll(
    client: SupabaseClient,
    filters?: SnapshotFilters,
    orgId?: string | null,
    select = '*',
  ) {
    const ownerId = filters?.owner_id
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.resolveBrainId(client, ownerId, filters?.agent_id, orgId)
    if (!brainId) return []
    const limit = Math.min(filters?.limit ?? 20, 100)

    let query = client
      .from(this.TABLE)
      .select(select)
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.tag) query = query.contains('tags', [filters.tag])
    if (filters?.min_confidence != null) query = query.gte('confidence', filters.min_confidence)

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as unknown as Record<string, unknown>[]
  }

  async findById(client: SupabaseClient, id: string) {
    const { data, error } = await client.from(this.TABLE).select('*').eq('id', id).single()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return data
  }

  async create(
    client: SupabaseClient,
    record: {
      name: string
      type: SnapshotType
      core: string
      owner_id?: string
      [key: string]: unknown
    },
    orgId?: string | null,
  ) {
    const ownerId = record.owner_id
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.resolveBrainId(client, ownerId, undefined, orgId)
    if (!brainId) return []
    const { owner_id: _, ...insertRecord } = record
    const { data, error } = await client
      .from(this.TABLE)
      .insert({ ...insertRecord, brain_id: brainId })
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async update(client: SupabaseClient, id: string, fields: Record<string, unknown>) {
    const { data, error } = await client
      .from(this.TABLE)
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async delete(client: SupabaseClient, id: string) {
    const { error } = await client.from(this.TABLE).delete().eq('id', id)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async search(
    client: SupabaseClient,
    queryEmbedding: number[],
    matchCount: number,
    ownerId?: string,
    orgId?: string | null,
  ) {
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.resolveDefaultBrainId(client, ownerId, orgId)
    const { data, error } = await client
      .from(this.TABLE)
      .select('*')
      .eq('brain_id', brainId)
      .order('confidence', { ascending: false })
      .limit(matchCount)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async getStats(
    client: SupabaseClient,
    ownerId?: string,
    agentId?: string,
    orgId?: string | null,
  ) {
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.resolveBrainId(client, ownerId, agentId, orgId)
    if (!brainId) {
      return {
        total: 0,
        by_type: {},
        avg_confidence: 0,
      }
    }
    const { data, error } = await client
      .from(this.TABLE)
      .select('type, confidence')
      .eq('brain_id', brainId)
    if (error) throw new Error(`DB error: ${error.message}`)

    const rows = data ?? []
    const total = rows.length
    const byType: Record<string, number> = {}
    let totalConfidence = 0

    for (const row of rows) {
      byType[row.type] = (byType[row.type] ?? 0) + 1
      totalConfidence += row.confidence ?? 0
    }

    return {
      total,
      by_type: byType,
      avg_confidence: total > 0 ? +(totalConfidence / total).toFixed(4) : 0,
    }
  }
}
