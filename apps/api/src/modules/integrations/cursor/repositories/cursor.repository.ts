import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

const CURSOR_CONNECTION_SELECT =
  'id, user_id, org_id, access_token, metadata, scope_mode, is_default'

@Injectable()
export class CursorRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  getServiceClient(): SupabaseClient {
    return this.serviceClient.client
  }

  async findConnectionById(client: SupabaseClient, connectionId: string) {
    const { data } = await client
      .from('user_integrations')
      .select(`${CURSOR_CONNECTION_SELECT}, status`)
      .eq('id', connectionId)
      .eq('integration_id', 'cursor')
      .eq('status', 'connected')
      .maybeSingle()
    return data
  }

  async findOrgDefault(client: SupabaseClient, orgId: string) {
    const { data } = await client
      .from('user_integrations')
      .select(CURSOR_CONNECTION_SELECT)
      .eq('integration_id', 'cursor')
      .eq('status', 'connected')
      .eq('org_id', orgId)
      .eq('scope_mode', 'org_shared')
      .eq('is_default', true)
      .maybeSingle()
    return data
  }

  async findLatestOrgShared(client: SupabaseClient, orgId: string) {
    const { data } = await client
      .from('user_integrations')
      .select(CURSOR_CONNECTION_SELECT)
      .eq('integration_id', 'cursor')
      .eq('status', 'connected')
      .eq('org_id', orgId)
      .eq('scope_mode', 'org_shared')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data
  }

  async findPersonalDefault(client: SupabaseClient, userId: string) {
    const { data } = await client
      .from('user_integrations')
      .select(CURSOR_CONNECTION_SELECT)
      .eq('integration_id', 'cursor')
      .eq('status', 'connected')
      .eq('user_id', userId)
      .eq('scope_mode', 'personal')
      .eq('is_default', true)
      .maybeSingle()
    return data
  }

  async findLatestPersonal(client: SupabaseClient, userId: string, orgId: string | null) {
    let query = client
      .from('user_integrations')
      .select(CURSOR_CONNECTION_SELECT)
      .eq('integration_id', 'cursor')
      .eq('status', 'connected')
      .eq('user_id', userId)
      .eq('scope_mode', 'personal')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.is('org_id', null)
    }

    const { data } = await query.maybeSingle()
    return data
  }

  async listConnections(client: SupabaseClient, userId: string, orgId: string | null) {
    let query = client
      .from('user_integrations')
      .select('id, connection_label, scope_mode, is_default, org_id, user_id')
      .eq('integration_id', 'cursor')
      .eq('status', 'connected')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })

    if (orgId) {
      query = query.or(
        `and(org_id.eq.${orgId},scope_mode.eq.org_shared),and(user_id.eq.${userId},scope_mode.eq.personal)`,
      )
    } else {
      query = query.eq('user_id', userId).eq('scope_mode', 'personal').is('org_id', null)
    }

    const { data } = await query
    return data ?? []
  }

  async disconnectConnections(
    client: SupabaseClient,
    userId: string,
    connectionId?: string,
  ): Promise<void> {
    let query = client
      .from('user_integrations')
      .update({
        status: 'disconnected',
        access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('integration_id', 'cursor')
      .eq('user_id', userId)

    if (connectionId) {
      query = query.eq('id', connectionId)
    }

    const { error } = await query
    if (error) throw new BadRequestException(error.message)
  }

  async insertWebhookEvent(
    client: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ code?: string; message?: string } | null> {
    const { error } = await client.from('cursor_webhook_events').insert(payload)
    return error ?? null
  }

  async findSpaceItemByCursorAgentId(client: SupabaseClient, agentId: string) {
    const { data } = await client
      .from('space_items')
      .select('id, space_id, user_id, org_id, custom_data, title')
      .eq('custom_data->>cursor_agent_id', agentId)
      .maybeSingle()
    return data
  }

  async findConnectionMetadata(client: SupabaseClient, connectionId: string) {
    const { data } = await client
      .from('user_integrations')
      .select('metadata')
      .eq('id', connectionId)
      .maybeSingle()
    return (data?.metadata ?? {}) as Record<string, unknown>
  }

  async updateSpaceItemCursorResult(
    client: SupabaseClient,
    item: { id: unknown; space_id: unknown },
    payload: Record<string, unknown>,
  ): Promise<void> {
    await client
      .from('space_items')
      .update(payload)
      .eq('id', item.id)
      .eq('space_id', item.space_id)
  }

  async findLatestPausedRunForItem(client: SupabaseClient, itemId: unknown) {
    const { data } = await client
      .from('space_automation_run_state')
      .select('id')
      .eq('item_id', itemId)
      .eq('status', 'paused')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data
  }
}
