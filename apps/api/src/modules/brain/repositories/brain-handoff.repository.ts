import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type BrainTable =
  | 'ns_memories'
  | 'ns_snapshots'
  | 'ns_sk_sources'
  | 'ns_sk_entries'
  | 'ns_narrative_pages'
  | 'ns_content_hashes'

@Injectable()
export class BrainHandoffRepository {
  private label(table: string) {
    return table.replace(/^ns_/, '')
  }

  async findRowsForBrain(client: SupabaseClient, table: BrainTable, brainId: string) {
    const { data, error } = await client.from(table).select('*').eq('brain_id', brainId)
    if (error) throw new Error(`Failed to load ${this.label(table)}: ${error.message}`)
    return data ?? []
  }

  async insertRows(client: SupabaseClient, table: BrainTable, rows: Array<Record<string, unknown>>) {
    const { error } = await client.from(table).insert(rows)
    if (error) throw new Error(`Failed to copy ${this.label(table)}: ${error.message}`)
  }

  async findNarrativeLinks(client: SupabaseClient, pageIds: string[]) {
    const { data, error } = await client
      .from('ns_narrative_links')
      .select('*')
      .in('from_page_id', pageIds)
    if (error) throw new Error(`Failed to load narrative_links: ${error.message}`)
    return data ?? []
  }

  async insertNarrativeLinks(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await client.from('ns_narrative_links').insert(rows)
    if (error) throw new Error(`Failed to copy narrative_links: ${error.message}`)
  }

  async findMemoryConnections(client: SupabaseClient, memoryIds: string[]) {
    const { data, error } = await client
      .from('ns_memory_connections')
      .select('*')
      .in('source_memory_id', memoryIds)
    if (error) throw new Error(`Failed to load memory_connections: ${error.message}`)
    return data ?? []
  }

  async insertMemoryConnections(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await client.from('ns_memory_connections').insert(rows)
    if (error) throw new Error(`Failed to copy memory_connections: ${error.message}`)
  }

  async findSnapshotEdges(client: SupabaseClient, snapshotIds: string[]) {
    const { data, error } = await client
      .from('ns_snapshot_edges')
      .select('*')
      .in('source_id', snapshotIds)
    if (error) throw new Error(`Failed to load snapshot_edges: ${error.message}`)
    return data ?? []
  }

  async insertSnapshotEdges(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await client.from('ns_snapshot_edges').insert(rows)
    if (error) throw new Error(`Failed to copy snapshot_edges: ${error.message}`)
  }

  async upsertContentHashes(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await client
      .from('ns_content_hashes')
      .upsert(rows, { onConflict: 'brain_id,content_hash', ignoreDuplicates: true })
    if (error) throw new Error(`Failed to copy content_hashes: ${error.message}`)
  }

  async insertCampaignNodes(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { error } = await client.from('campaign_nodes').insert(rows)
    if (error) throw new Error(`Failed to copy to campaign: ${error.message}`)
  }
}
