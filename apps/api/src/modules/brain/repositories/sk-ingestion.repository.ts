import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SkIngestionRepository {
  async findOwnedBrain(client: SupabaseClient, brainId: string, userId: string) {
    const { data } = await client
      .from('ns_brains')
      .select('id')
      .eq('id', brainId)
      .eq('owner_id', userId)
      .maybeSingle()
    return data ?? null
  }

  async createSource(
    client: SupabaseClient,
    input: {
      brainId: string
      sourceType: string
      title: string
      domain?: string | null
    },
  ): Promise<{ id: string }> {
    const { data, error } = await client
      .from('ns_sk_sources')
      .insert({
        brain_id: input.brainId,
        source_type: input.sourceType,
        title: input.title,
        domain: input.domain ?? null,
        status: 'processing',
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(`Failed to create SK source: ${error?.message}`)
    return data as { id: string }
  }

  async findEntryByContentHash(client: SupabaseClient, brainId: string, contentHash: string) {
    const { data } = await client
      .from('ns_sk_entries')
      .select('id')
      .eq('brain_id', brainId)
      .eq('content_hash', contentHash)
      .maybeSingle()
    return data ?? null
  }

  async insertEntry(client: SupabaseClient, record: Record<string, unknown>) {
    const { error } = await client.from('ns_sk_entries').insert(record)
    if (error) throw new Error(`Failed to insert SK entry: ${error.message}`)
  }

  async finalizeSource(client: SupabaseClient, sourceId: string, entriesCount: number) {
    const { error } = await client
      .from('ns_sk_sources')
      .update({
        status: 'completed',
        entries_count: entriesCount,
        ingested_at: new Date().toISOString(),
      })
      .eq('id', sourceId)
    if (error) throw new Error(`Failed to finalize SK source: ${error.message}`)
  }
}
