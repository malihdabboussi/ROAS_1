import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class ContentDedupeRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async resolveDefaultBrainId(ownerId: string): Promise<string> {
    const existing = await this.findDefaultBrainId(ownerId)
    if (existing) return existing

    const { data: created, error } = await this.serviceClient.client
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

    const fallback = await this.findDefaultBrainId(ownerId)
    if (fallback) return fallback
    throw new Error('Failed creating or finding default brain')
  }

  async findContentHash(client: SupabaseClient, brainId: string, contentHash: string) {
    const { data } = await client
      .from('ns_content_hashes')
      .select('id')
      .eq('brain_id', brainId)
      .eq('content_hash', contentHash)
      .maybeSingle()
    return data ?? null
  }

  async insertContentHash(
    client: SupabaseClient,
    input: { brainId: string; contentHash: string; sourceType: string },
  ) {
    return client.from('ns_content_hashes').insert({
      brain_id: input.brainId,
      content_hash: input.contentHash,
      source_type: input.sourceType,
      snapshot_ids: [],
    })
  }

  private async findDefaultBrainId(ownerId: string): Promise<string | null> {
    const { data, error } = await this.serviceClient.client
      .from('ns_brains')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data?.id ?? null
  }
}
