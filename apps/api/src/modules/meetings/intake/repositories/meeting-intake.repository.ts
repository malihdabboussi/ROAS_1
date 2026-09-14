import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { MeetingConnection } from '../../providers/transcript-provider.contract'
import type { MeetingProviderId } from '../../providers/transcript-source.types'

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
