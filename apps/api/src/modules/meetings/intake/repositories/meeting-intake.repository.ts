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
   * Pasted-webhook providers (Read AI, Fireflies, defined note takers) have
   * one personal row per user. Earlier flows could leave duplicates; every
   * helper below therefore picks one canonical row (connected, then pending,
   * then newest) and works by row id, and connect collapses the rest so the
   * door finds exactly one connected row for the key.
   */
  async ensurePendingWebhookConnection(
    provider: MeetingProviderId,
    userId: string,
    input: { connectionLabel: string },
  ): Promise<void> {
    const rows = await this.listPersonalRows(provider, userId)
    if (rows.length > 0) return
    const now = new Date().toISOString()
    const { error } = await this.serviceClient.client.from('user_integrations').insert({
      user_id: userId,
      org_id: null,
      integration_id: provider,
      provider,
      status: 'pending',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: null,
      error_message: null,
      metadata: {},
      connection_label: input.connectionLabel,
      scope_mode: 'personal',
      is_default: false,
      updated_at: now,
    })
    if (error) throw new Error(`Failed to prepare ${provider} connection: ${error.message}`)
  }

  async upsertPastedWebhookConnection(
    provider: MeetingProviderId,
    userId: string,
    input: { connectionLabel: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    const admin = this.serviceClient.client
    const now = new Date().toISOString()
    const rows = await this.listPersonalRows(provider, userId)
    const canonical = rows[0]
    const webhookKey = rows.map((row) => readWebhookKey(row.metadata)).find(Boolean) ?? null
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
    const { error } = canonical
      ? await admin.from('user_integrations').update(row).eq('id', canonical.id)
      : await admin.from('user_integrations').insert({ ...row, org_id: null, is_default: false })
    if (error) throw new Error(`Failed to save ${provider} connection: ${error.message}`)
    await this.retireDuplicateRows(rows.slice(1), now)
  }

  /** The canonical personal row whatever its status (status screens, address before connect). */
  async findAnyConnectionForUser(
    provider: MeetingProviderId,
    userId: string,
  ): Promise<MeetingConnection | null> {
    const canonical = (await this.listPersonalRows(provider, userId))[0]
    if (!canonical) return null
    return {
      id: canonical.id,
      userId,
      orgId: null,
      provider,
      status: canonical.status,
      metadata: canonical.metadata,
    }
  }

  /** Returns the connection's webhook key, creating one on the canonical row the first time. */
  async ensureWebhookKey(provider: MeetingProviderId, userId: string): Promise<string> {
    const rows = await this.listPersonalRows(provider, userId)
    const existing = rows.map((row) => readWebhookKey(row.metadata)).find(Boolean)
    if (existing) return existing
    const canonical = rows[0]
    if (!canonical) throw new Error(`No ${provider} connection row to store a webhook key on`)
    const webhookKey = generateWebhookKey()
    const { error } = await this.serviceClient.client
      .from('user_integrations')
      .update({
        metadata: { ...canonical.metadata, webhook_key: webhookKey },
        updated_at: new Date().toISOString(),
      })
      .eq('id', canonical.id)
    if (error) throw new Error(`Failed to store ${provider} webhook key: ${error.message}`)
    return webhookKey
  }

  /** Keeps the webhook key on the canonical row so the address pasted into the provider survives a reconnect. */
  async markPastedWebhookDisconnected(provider: MeetingProviderId, userId: string): Promise<void> {
    const rows = await this.listPersonalRows(provider, userId)
    const canonical = rows[0]
    if (!canonical) return
    const now = new Date().toISOString()
    const webhookKey = rows.map((row) => readWebhookKey(row.metadata)).find(Boolean) ?? null
    await this.serviceClient.client
      .from('user_integrations')
      .update({
        status: 'disconnected',
        error_message: null,
        metadata: webhookKey ? { webhook_key: webhookKey } : {},
        updated_at: now,
      })
      .eq('id', canonical.id)
    await this.retireDuplicateRows(rows.slice(1), now)
  }

  /** Personal rows for a provider, canonical first: connected, then pending, then newest. */
  private async listPersonalRows(
    provider: MeetingProviderId,
    userId: string,
  ): Promise<Array<{ id: string; status: string; metadata: Record<string, unknown> }>> {
    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .select('id, status, metadata, updated_at')
      .eq('user_id', userId)
      .eq('integration_id', provider)
      .is('org_id', null)
      .order('updated_at', { ascending: false })
    if (error) throw new Error(`Failed to read ${provider} connections: ${error.message}`)
    const rank = (status: string) => (status === 'connected' ? 0 : status === 'pending' ? 1 : 2)
    return ((data ?? []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id),
        status: String(row.status ?? ''),
        metadata:
          row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {},
      }))
      .sort((a, b) => rank(a.status) - rank(b.status))
  }

  /** Duplicates never receive deliveries: disconnected, and without the key. */
  private async retireDuplicateRows(rows: Array<{ id: string }>, now: string): Promise<void> {
    for (const row of rows) {
      const { error } = await this.serviceClient.client
        .from('user_integrations')
        .update({ status: 'disconnected', error_message: null, metadata: {}, updated_at: now })
        .eq('id', row.id)
      if (error) throw new Error(`Failed to retire duplicate connection: ${error.message}`)
    }
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
