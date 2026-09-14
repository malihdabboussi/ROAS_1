import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { MeetingProviderId } from '../../providers/transcript-source.types'

export type DeliveryClaim = { claimed: true; id: string } | { claimed: false }

/**
 * Replay protection for the shared meeting webhook door. Table
 * `meeting_webhook_deliveries`, unique on (provider, connection_id, delivery_id).
 */
@Injectable()
export class MeetingWebhookDeliveriesRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async claim(input: {
    provider: MeetingProviderId
    connectionId: string
    deliveryId: string
    externalId: string | null
  }): Promise<DeliveryClaim> {
    const { data, error } = await this.serviceClient.client
      .from('meeting_webhook_deliveries')
      .insert({
        provider: input.provider,
        connection_id: input.connectionId,
        delivery_id: input.deliveryId,
        external_id: input.externalId,
      })
      .select('id')
      .single()
    if (!error && data?.id) return { claimed: true, id: String(data.id) }
    if (error?.code === '23505') return { claimed: false }
    throw new Error(`Failed to record webhook delivery: ${error?.message ?? 'unknown error'}`)
  }

  /** Drop a claim after a processing failure so the provider's retry is accepted. */
  async release(id: string): Promise<void> {
    await this.serviceClient.client.from('meeting_webhook_deliveries').delete().eq('id', id)
  }
}
