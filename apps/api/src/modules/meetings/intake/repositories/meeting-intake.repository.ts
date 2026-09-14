import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { MeetingConnection } from '../../providers/transcript-provider.contract'
import type { MeetingProviderId } from '../../providers/transcript-source.types'
import { generateWebhookKey, readWebhookKey } from '../../providers/webhook-key'

const CONNECTION_COLUMNS = 'id, user_id, org_id, integration_id, status, metadata'

@Injectable()
export class MeetingIntakeRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  getServiceClient(): SupabaseClient {
    return this.serviceClient.client
  }

  /** Exactly one connected row may own a webhook key; anything else resolves to null. */
  async findConnectionByWebhookKey(
    provider: MeetingProviderId,
    webhookKey: string,
  ): Promise<MeetingConnection | null> {
    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .select(CONNECTION_COLUMNS)
      .eq('integration_id', provider)
      .eq('status', 'connected')
      .eq('metadata->>webhook_key', webhookKey)
      .limit(2)
    if (error) throw new Error(`Failed to resolve meeting connection: ${error.message}`)
    const rows = (data ?? []) as Array<Record<string, unknown>>
    if (rows.length !== 1) return null
    return toConnection(rows[0]!, provider)
  }

  async findConnectionForUser(
    provider: MeetingProviderId,
    userId: string,
  ): Promise<MeetingConnection | null> {
    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .select(CONNECTION_COLUMNS)
      .eq('integration_id', provider)
      .eq('user_id', userId)
      .eq('status', 'connected')
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error) throw new Error(`Failed to resolve meeting connection: ${error.message}`)
    const row = ((data ?? []) as Array<Record<string, unknown>>)[0]
    return row ? toConnection(row, provider) : null
  }

  async findActiveOrgMemberRole(userId: string, orgId: string): Promise<string | null> {
    const { data, error } = await this.serviceClient.client
      .from('org_members')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw new Error(`Org billing validation failed: ${error.message}`)
    return typeof data?.role === 'string' ? data.role : null
  }

  /**
   * Connection for a provider the user wires by pasting our webhook address
   * into the provider's own settings (Read.ai). No tokens, one row per user.
   */
  async upsertPastedWebhookConnection(
    provider: MeetingProviderId,
    userId: string,
    input: { connectionLabel: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    const admin = this.serviceClient.client
    const now = new Date().toISOString()
    const existingMeta = await this.readPersonalMetadata(provider, userId)
    const webhookKey = readWebhookKey(existingMeta)
    const row = {
      user_id: userId,
      integration_id: provider,
      provider,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: { ...(input.metadata ?? {}), ...(webhookKey ? { webhook_key: webhookKey } : {}) },
      connection_label: input.connectionLabel,
      scope_mode: 'personal',
      updated_at: now,
    }
    const { data: existing } = await admin
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', provider)
      .is('org_id', null)
      .maybeSingle()
    const { error } = existing
      ? await admin.from('user_integrations').update(row).eq('id', existing.id)
      : await admin.from('user_integrations').insert({ ...row, org_id: null, is_default: false })
    if (error) throw new Error(`Failed to save ${provider} connection: ${error.message}`)
  }

  /** Returns the connection's webhook key, creating one the first time. */
  async ensureWebhookKey(provider: MeetingProviderId, userId: string): Promise<string> {
    const metadata = await this.readPersonalMetadata(provider, userId)
    const existing = readWebhookKey(metadata)
    if (existing) return existing
    const webhookKey = generateWebhookKey()
    const { error } = await this.serviceClient.client
      .from('user_integrations')
      .update({
        metadata: { ...metadata, webhook_key: webhookKey },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', provider)
      .is('org_id', null)
    if (error) throw new Error(`Failed to store ${provider} webhook key: ${error.message}`)
    return webhookKey
  }

  /** Keeps the webhook key so the address pasted into the provider survives a reconnect. */
  async markPastedWebhookDisconnected(provider: MeetingProviderId, userId: string): Promise<void> {
    const webhookKey = readWebhookKey(await this.readPersonalMetadata(provider, userId))
    await this.serviceClient.client
      .from('user_integrations')
      .update({
        status: 'disconnected',
        error_message: null,
        metadata: webhookKey ? { webhook_key: webhookKey } : {},
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', provider)
  }

  private async readPersonalMetadata(
    provider: MeetingProviderId,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const { data } = await this.serviceClient.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', provider)
      .is('org_id', null)
      .maybeSingle()
    const metadata = data?.metadata
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {}
  }

  async enqueueBrainOpsOutboxRows(rows: Array<Record<string, unknown>>): Promise<void> {
    if (rows.length === 0) return
    const { error } = await this.serviceClient.client
      .from('brain_ops_outbox')
      .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    if (error) throw new Error(`Failed to enqueue customer interaction route: ${error.message}`)
  }
}

function toConnection(
  row: Record<string, unknown>,
  provider: MeetingProviderId,
): MeetingConnection {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  return {
    id: String(row.id),
    userId: String(row.user_id),
    orgId: typeof row.org_id === 'string' ? row.org_id : null,
    provider,
    status: String(row.status ?? ''),
    metadata,
  }
}
