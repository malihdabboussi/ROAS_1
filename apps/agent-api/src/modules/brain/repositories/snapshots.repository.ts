import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SnapshotType } from '../types/brain.types'

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

  private async resolveDefaultBrainId(client: SupabaseClient, ownerId: string): Promise<string> {
    const { data: existing } = await client
      .from('ns_brains')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .maybeSingle()
    if (existing?.id) return existing.id
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
      .single()
    if (error || !created)
      throw new Error(`DB error: ${error?.message ?? 'Failed creating default brain'}`)
    return created.id
  }

  async findAll(client: SupabaseClient, filters?: SnapshotFilters) {
    const ownerId = filters?.owner_id
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.resolveDefaultBrainId(client, ownerId)
    const limit = Math.min(filters?.limit ?? 20, 100)
    let query = client
      .from(this.TABLE)
      .select('*')
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.tag) query = query.contains('tags', [filters.tag])
    if (filters?.min_confidence != null) query = query.gte('confidence', filters.min_confidence)
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
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
  ) {
    const explicitBrainId = record.brain_id as string | undefined
    const ownerId = record.owner_id
    if (!explicitBrainId && !ownerId)
      throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = explicitBrainId ?? (await this.resolveDefaultBrainId(client, ownerId!))
    const { owner_id: _, brain_id: _b, ...rest } = record
    const { data, error } = await client
      .from(this.TABLE)
      .insert({ ...rest, brain_id: brainId })
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
  ) {
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.resolveDefaultBrainId(client, ownerId)
    const { data, error } = await client
      .from(this.TABLE)
      .select('*')
      .eq('brain_id', brainId)
      .order('confidence', { ascending: false })
      .limit(matchCount)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async getStats(client: SupabaseClient, ownerId?: string) {
    if (!ownerId) throw new Error('Missing owner id for NeuralSnap brain resolution')
    const brainId = await this.resolveDefaultBrainId(client, ownerId)
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
