import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { readWebhookKey } from '../../../meetings/providers/webhook-key'

@Injectable()
export class FirefliesRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

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
