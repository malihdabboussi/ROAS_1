import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SkRepository {
  async findBrainById(client: SupabaseClient, brainId: string) {
    const { data, error } = await client.from('ns_brains').select('id').eq('id', brainId).maybeSingle()
    if (error) throw new Error(`Failed to load brain: ${error.message}`)
    return data ?? null
  }

  async searchEntries(
    client: SupabaseClient,
    input: { brainId: string; embedding: number[]; limit: number },
  ) {
    const { data, error } = await client.rpc('search_sk_entries', {
      p_brain_id: input.brainId,
      p_query_embedding: `[${input.embedding.join(',')}]`,
      p_match_threshold: 0.5,
      p_match_count: input.limit,
      p_domain: null,
      p_min_mastery: 0,
    })
    if (error) throw new Error(`SK search failed: ${error.message}`)
    return data ?? []
  }

  async createGap(client: SupabaseClient, brainId: string, description: string) {
    await client.from('ns_sk_gaps').insert({
      brain_id: brainId,
      domain: null,
      description,
      detected_from: 'search',
      priority: 0.5,
    })
  }

  async findSources(client: SupabaseClient, brainId: string) {
    const { data, error } = await client
      .from('ns_sk_sources')
      .select('*')
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to load SK sources: ${error.message}`)
    return data ?? []
  }

  async findGaps(client: SupabaseClient, brainId: string) {
    const { data, error } = await client
      .from('ns_sk_gaps')
      .select('*')
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to load SK gaps: ${error.message}`)
    return data ?? []
  }

  async getEntryStats(client: SupabaseClient, brainId: string) {
    const { data, error } = await client.rpc('brain_sk_entry_stats', { p_brain_id: brainId })
    if (error) throw new Error(`Failed to load SK stats: ${error.message}`)
    return data ?? {}
  }

  async findEntryForDelete(client: SupabaseClient, entryId: string) {
    const { data, error } = await client
      .from('ns_sk_entries')
      .select('id, brain_id, content_hash')
      .eq('id', entryId)
      .single()
    if (error || !data) throw new Error('Entry not found')
    return data
  }

  async findEntryBrainId(client: SupabaseClient, entryId: string) {
    const { data } = await client
      .from('ns_sk_entries')
      .select('brain_id')
      .eq('id', entryId)
      .maybeSingle()
    return data?.brain_id ? String(data.brain_id) : null
  }

  async deleteEntry(client: SupabaseClient, entryId: string) {
    const { error } = await client.from('ns_sk_entries').delete().eq('id', entryId)
    if (error) throw new Error(`Failed to delete entry: ${error.message}`)
  }

  async hasEntryWithContentHash(client: SupabaseClient, brainId: string, contentHash: string) {
    const { data } = await client
      .from('ns_sk_entries')
      .select('id')
      .eq('brain_id', brainId)
      .eq('content_hash', contentHash)
      .limit(1)
    return Boolean(data?.length)
  }

  async deleteContentHash(client: SupabaseClient, brainId: string, contentHash: string) {
    await client
      .from('ns_content_hashes')
      .delete()
      .eq('brain_id', brainId)
      .eq('content_hash', contentHash)
  }

  async findSourceForDelete(client: SupabaseClient, sourceId: string) {
    const { data, error } = await client
      .from('ns_sk_sources')
      .select('id, brain_id')
      .eq('id', sourceId)
      .single()
    if (error || !data) throw new Error('Source not found')
    return data
  }

  async findSourceBrainId(client: SupabaseClient, sourceId: string) {
    const { data } = await client
      .from('ns_sk_sources')
      .select('brain_id')
      .eq('id', sourceId)
      .maybeSingle()
    return data?.brain_id ? String(data.brain_id) : null
  }

  async findEntriesForSource(client: SupabaseClient, sourceId: string) {
    const { data } = await client
      .from('ns_sk_entries')
      .select('id, content_hash')
      .eq('source_id', sourceId)
    return data ?? []
  }

  async deleteEntriesForSource(client: SupabaseClient, sourceId: string) {
    const { error } = await client.from('ns_sk_entries').delete().eq('source_id', sourceId)
    if (error) throw new Error(`Failed to delete entries: ${error.message}`)
  }

  async deleteSource(client: SupabaseClient, sourceId: string) {
    const { error } = await client.from('ns_sk_sources').delete().eq('id', sourceId)
    if (error) throw new Error(`Failed to delete source: ${error.message}`)
  }

  async findEntryForMastery(client: SupabaseClient, entryId: string) {
    const { data, error } = await client
      .from('ns_sk_entries')
      .select('id, brain_id')
      .eq('id', entryId)
      .single()
    if (error || !data) throw new Error('SK entry not found')
    return data
  }

  async updateMastery(client: SupabaseClient, entryId: string, score: number) {
    const { data, error } = await client
      .from('ns_sk_entries')
      .update({
        mastery: score,
        last_recalled_at: new Date().toISOString(),
        recall_count: 1,
      })
      .eq('id', entryId)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update mastery: ${error.message}`)
    return data
  }
}
