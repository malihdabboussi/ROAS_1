import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { generateWebhookKey, readWebhookKey } from '../../../meetings/providers/webhook-key'

type FirefliesConnectionMetadata = {
  email?: string | null
  name?: string | null
}

@Injectable()
export class FirefliesRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  private async readMetadata(userId: string): Promise<Record<string, unknown>> {
    const { data } = await this.serviceClient.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'fireflies')
      .is('org_id', null)
      .maybeSingle()
    return (data?.metadata as Record<string, unknown> | null) ?? {}
  }

  async upsertConnection(userId: string, metadata: FirefliesConnectionMetadata): Promise<void> {
    const admin = this.serviceClient.client
    const now = new Date().toISOString()
    // The webhook key survives reconnects so the address pasted into Fireflies stays valid.
    const existingMeta = await this.readMetadata(userId)
    const webhookKey = readWebhookKey(existingMeta)
    const row = {
      user_id: userId,
      integration_id: 'fireflies',
      provider: 'fireflies',
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: {
        email: metadata.email,
        name: metadata.name,
        ...(webhookKey ? { webhook_key: webhookKey } : {}),
      },
      connection_label: metadata.email ?? metadata.name ?? null,
      updated_at: now,
    }

    const { data: existing } = await admin
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', 'fireflies')
      .is('org_id', null)
      .maybeSingle()

    if (existing) {
      await admin
        .from('user_integrations')
        .update({ ...row, updated_at: now })
        .eq('user_id', userId)
        .eq('integration_id', 'fireflies')
        .is('org_id', null)
      return
    }

    await admin.from('user_integrations').insert({ ...row, org_id: null })
  }

  /** Returns the connection's webhook key, creating one the first time. */
  async ensureWebhookKey(userId: string): Promise<string> {
    const metadata = await this.readMetadata(userId)
    const existing = readWebhookKey(metadata)
    if (existing) return existing
    const webhookKey = generateWebhookKey()
    await this.serviceClient.client
      .from('user_integrations')
      .update({
        metadata: { ...metadata, webhook_key: webhookKey },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', 'fireflies')
      .is('org_id', null)
    return webhookKey
  }

  async markDisconnected(userId: string): Promise<void> {
    const webhookKey = readWebhookKey(await this.readMetadata(userId))
    await this.serviceClient.client
      .from('user_integrations')
      .update({
        status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        error_message: null,
        metadata: webhookKey ? { webhook_key: webhookKey } : {},
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', 'fireflies')
  }

  async getStatus(userId: string): Promise<{
    connected: boolean
    status: string | null
    email: string | null
    name: string | null
    connectedAt: string | null
    webhookKey: string | null
  } | null> {
    const { data } = await this.serviceClient.client
      .from('user_integrations')
      .select('status, connected_at, metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'fireflies')
      .maybeSingle()

    if (!data) return null
    const metadata = (data.metadata as Record<string, unknown> | null) ?? {}
    return {
      connected: data.status === 'connected',
      status: data.status as string,
      email: (metadata.email as string) ?? null,
      name: (metadata.name as string) ?? null,
      connectedAt: (data.connected_at as string) ?? null,
      webhookKey: readWebhookKey(metadata),
    }
  }

  async hasMemorySession(sessionKey: string): Promise<boolean> {
    const { data } = await this.serviceClient.client
      .from('ns_memory_sessions')
      .select('id')
      .eq('session_key', sessionKey)
      .maybeSingle()
    return Boolean(data)
  }
}
