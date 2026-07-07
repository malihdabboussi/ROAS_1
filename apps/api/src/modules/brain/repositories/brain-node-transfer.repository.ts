import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class BrainNodeTransferRepository {
  async findCampaignForScope(client: SupabaseClient, campaignId: string, userId: string) {
    const { data, error } = await client
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve campaign: ${error.message}`)
    return data ?? null
  }

  async findBrainForScope(client: SupabaseClient, userId: string, agentId: string | null) {
    let query = client.from('ns_brains').select('id').eq('owner_id', userId)
    if (agentId) query = query.eq('agent_id', agentId)
    else query = query.eq('is_default', true).eq('scope', 'user').is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to resolve brain: ${error.message}`)
    return data ?? null
  }

  async findCampaignNodesByTitle(
    client: SupabaseClient,
    campaignId: string,
    title: string,
    sourceType?: string,
  ) {
    let query = client
      .from('campaign_nodes')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('title', title)
    if (sourceType) query = query.eq('source_type', sourceType)
    const { data, error } = await query
    if (error) throw new Error(`Failed to load campaign nodes: ${error.message}`)
    return data ?? []
  }

  async findMemoriesBySource(
    client: SupabaseClient,
    brainId: string,
    title: string,
    sourceType?: string,
    sourceId?: string,
  ) {
    let query = client
      .from('ns_memories')
      .select('*')
      .eq('brain_id', brainId)
      .eq('source_title', title)
    if (sourceType) query = query.eq('source_type', sourceType)
    if (sourceId) query = query.eq('source_id', sourceId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to load memories: ${error.message}`)
    return data ?? []
  }

  async findSnapshotsBySource(
    client: SupabaseClient,
    brainId: string,
    sourceType: string,
    sourceId: string,
  ) {
    const { data, error } = await client
      .from('ns_snapshots')
      .select('*')
      .eq('brain_id', brainId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
    if (error) throw new Error(`Failed to load snapshots: ${error.message}`)
    return data ?? []
  }

  async findCampaignNodesByIds(client: SupabaseClient, campaignId: string, ids: string[]) {
    const { data, error } = await client
      .from('campaign_nodes')
      .select('*')
      .eq('campaign_id', campaignId)
      .in('id', ids)
    if (error) throw new Error(`Failed to load campaign nodes: ${error.message}`)
    return data ?? []
  }

  async findMemoryById(client: SupabaseClient, brainId: string, id: string) {
    const { data, error } = await client
      .from('ns_memories')
      .select('*')
      .eq('brain_id', brainId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load memory: ${error.message}`)
    return data ?? null
  }

  async findSnapshotById(client: SupabaseClient, brainId: string, id: string) {
    const { data, error } = await client
      .from('ns_snapshots')
      .select('*')
      .eq('brain_id', brainId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load snapshot: ${error.message}`)
    return data ?? null
  }

  async findSkEntryById(client: SupabaseClient, brainId: string, id: string) {
    const { data, error } = await client
      .from('ns_sk_entries')
      .select('*')
      .eq('brain_id', brainId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load knowledge entry: ${error.message}`)
    return data ?? null
  }

  async findSkSourceById(client: SupabaseClient, brainId: string, id: string) {
    const { data, error } = await client
      .from('ns_sk_sources')
      .select('*')
      .eq('brain_id', brainId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load source: ${error.message}`)
    return data ?? null
  }

  async findSkEntriesBySource(client: SupabaseClient, brainId: string, sourceId: string) {
    const { data, error } = await client
      .from('ns_sk_entries')
      .select('*')
      .eq('brain_id', brainId)
      .eq('source_id', sourceId)
    if (error) throw new Error(`Failed to load source entries: ${error.message}`)
    return data ?? []
  }

  async findConnectedRecords(client: SupabaseClient, brainId: string, ids: string[]) {
    const [memoryRows, snapshotRows, skEntryRows] = await Promise.all([
      client.from('ns_memories').select('*').eq('brain_id', brainId).in('id', ids),
      client.from('ns_snapshots').select('*').eq('brain_id', brainId).in('id', ids),
      client.from('ns_sk_entries').select('*').eq('brain_id', brainId).in('id', ids),
    ])
    if (memoryRows.error)
      throw new Error(`Failed to load connected memories: ${memoryRows.error.message}`)
    if (snapshotRows.error)
      throw new Error(`Failed to load connected snapshots: ${snapshotRows.error.message}`)
    if (skEntryRows.error)
      throw new Error(`Failed to load connected knowledge entries: ${skEntryRows.error.message}`)
    return {
      memories: memoryRows.data ?? [],
      snapshots: snapshotRows.data ?? [],
      skEntries: skEntryRows.data ?? [],
    }
  }

  async insertCampaignNodes(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await client.from('campaign_nodes').insert(rows)
    if (error) throw new Error(`Failed to copy to campaign: ${error.message}`)
  }

  async insertSkSource(client: SupabaseClient, row: Record<string, unknown>, message: string) {
    const { error } = await client.from('ns_sk_sources').insert(row)
    if (error) throw new Error(`${message}: ${error.message}`)
  }

  async insertSkEntries(client: SupabaseClient, rows: Array<Record<string, unknown>>, message: string) {
    const { error } = await client.from('ns_sk_entries').insert(rows)
    if (error) throw new Error(`${message}: ${error.message}`)
  }

  async insertMemories(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await client.from('ns_memories').insert(rows)
    if (error) throw new Error(`Failed to copy memories: ${error.message}`)
  }

  async insertSnapshots(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await client.from('ns_snapshots').insert(rows)
    if (error) throw new Error(`Failed to copy snapshots: ${error.message}`)
  }

  async deleteCampaignNodes(client: SupabaseClient, campaignId: string, ids: string[]) {
    const { error } = await client
      .from('campaign_nodes')
      .delete()
      .eq('campaign_id', campaignId)
      .in('id', ids)
    if (error) throw new Error(`Failed to move campaign nodes: ${error.message}`)
  }

  async deleteMemories(client: SupabaseClient, brainId: string, ids: string[]) {
    const { error } = await client.from('ns_memories').delete().eq('brain_id', brainId).in('id', ids)
    if (error) throw new Error(`Failed to move memories: ${error.message}`)
  }

  async deleteSnapshots(client: SupabaseClient, brainId: string, ids: string[]) {
    const { error } = await client.from('ns_snapshots').delete().eq('brain_id', brainId).in('id', ids)
    if (error) throw new Error(`Failed to move snapshots: ${error.message}`)
  }

  async deleteSkEntries(client: SupabaseClient, brainId: string, ids: string[]) {
    const { error } = await client.from('ns_sk_entries').delete().eq('brain_id', brainId).in('id', ids)
    if (error) throw new Error(`Failed to move knowledge entries: ${error.message}`)
  }

  async deleteSkSource(client: SupabaseClient, brainId: string, sourceId: string) {
    const { error } = await client
      .from('ns_sk_sources')
      .delete()
      .eq('brain_id', brainId)
      .eq('id', sourceId)
    if (error) throw new Error(`Failed to move source: ${error.message}`)
  }
}
