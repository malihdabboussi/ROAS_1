import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class MemoryBrainResolver {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async resolveDefaultBrainId(
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

    if (existingError) throw new Error(`DB error: ${existingError.message}`)
    if (existing?.[0]?.id) return existing[0].id

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
    if (fallback?.id) return fallback.id

    throw new Error('Failed creating or finding default brain')
  }

  async resolveAgentBrainId(
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

  async resolveBrainId(
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

  extractOwnerId(record: Record<string, unknown>): string {
    const directOwnerId = record.owner_id
    if (typeof directOwnerId === 'string' && directOwnerId.length > 0) return directOwnerId

    const metadata = (record.metadata as Record<string, unknown> | undefined) ?? {}
    const fromMetadata = metadata.user_id
    if (typeof fromMetadata === 'string' && fromMetadata.length > 0) return fromMetadata

    throw new Error('Missing owner id for NeuralSnap brain resolution')
  }
}
