import { createHmac, timingSafeEqual } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { SpaceAutomationService } from '../../spaces/services/space-automation.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'

@Injectable()
export class IntegrationsComposioWebhookService {
  private readonly logger = new Logger(IntegrationsComposioWebhookService.name)

  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly spaceAutomation: SpaceAutomationService,
  ) {}

  async handleComposioWebhook(params: {
    rawBody: Buffer | string | undefined
    webhookId?: string
    webhookSignature?: string
    webhookTimestamp?: string
  }): Promise<Record<string, unknown>> {
    const secret = process.env.COMPOSIO_WEBHOOK_SECRET?.trim()
    if (!secret) {
      return { success: false, status: 500, error: 'COMPOSIO_WEBHOOK_SECRET is not configured' }
    }

    const rawPayload =
      typeof params.rawBody === 'string'
        ? params.rawBody
        : Buffer.isBuffer(params.rawBody)
          ? params.rawBody.toString('utf8')
          : ''

    if (!rawPayload) return { success: false, status: 400, error: 'Missing request body' }
    if (!params.webhookId || !params.webhookSignature || !params.webhookTimestamp) {
      return { success: false, status: 401, error: 'Missing Composio webhook signature headers' }
    }

    if (!this.verifyComposioWebhookSignature(params, rawPayload, secret)) {
      this.logger.warn('Invalid Composio webhook signature')
      return { success: false, status: 401, error: 'Invalid Composio webhook signature' }
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(rawPayload) as Record<string, unknown>
    } catch {
      return { success: false, status: 400, error: 'Invalid JSON payload' }
    }
    const metadata =
      payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
        ? (payload.metadata as Record<string, unknown>)
        : {}
    const data =
      payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
        ? (payload.data as Record<string, unknown>)
        : {}

    const summary = {
      type: String(payload.type ?? ''),
      trigger_slug: String(metadata.trigger_slug ?? ''),
      trigger_id: String(metadata.trigger_id ?? ''),
      connected_account_id: this.extractConnectedAccountId(data, metadata),
      auth_config_id: String(metadata.auth_config_id ?? ''),
      user_id: String(metadata.user_id ?? ''),
      data_keys: Object.keys(data).sort(),
    }

    this.logger.log(`Composio webhook received: ${JSON.stringify(summary)}`)
    if (summary.type === 'composio.connected_account.expired') {
      const expired = await this.markConnectedAccountExpired({
        connectedAccountId: summary.connected_account_id,
        data,
      })
      return { success: true, received: true, summary, expired }
    }

    const externalResult = await this.spaceAutomation.processComposioExternalEvent(
      this.repository.getServiceClient(),
      payload,
    )
    return { success: true, received: true, summary, external: externalResult }
  }

  private extractConnectedAccountId(
    data: Record<string, unknown>,
    metadata: Record<string, unknown>,
  ): string {
    return String(
      data.id ?? data.connected_account_id ?? metadata.connected_account_id ?? '',
    ).trim()
  }

  private async markConnectedAccountExpired(input: {
    connectedAccountId: string
    data: Record<string, unknown>
  }): Promise<Record<string, unknown>> {
    if (!input.connectedAccountId) return { updated: 0, reason: 'missing_connected_account_id' }

    const serviceClient = this.repository.getServiceClient()
    const { data: rows, error } = await serviceClient
      .from('user_integrations')
      .select('id, status, metadata')
      .eq('metadata->>composio_connected_account_id', input.connectedAccountId)

    if (error) return { updated: 0, error: error.message }
    const statusReason = String(input.data.status_reason ?? input.data.reason ?? '').trim()
    const toolkit =
      input.data.toolkit &&
      typeof input.data.toolkit === 'object' &&
      !Array.isArray(input.data.toolkit)
        ? (input.data.toolkit as Record<string, unknown>)
        : {}
    let updated = 0

    for (const row of (rows ?? []) as Array<Record<string, unknown>>) {
      const rowId = String(row.id ?? '').trim()
      if (!rowId) continue
      const metadata =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const { error: updateError } = await serviceClient
        .from('user_integrations')
        .update({
          status: 'needs_reconnect',
          error_message: statusReason || 'Composio connection expired; reconnect required',
          metadata: {
            ...metadata,
            composio_connected_account_id: input.connectedAccountId,
            composio_status: 'EXPIRED',
            composio_status_reason: statusReason || null,
            composio_expired_at: new Date().toISOString(),
            ...(toolkit.slug ? { composio_toolkit_slug: String(toolkit.slug) } : {}),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', rowId)
      if (!updateError) updated++
    }

    return { updated, connected_account_id: input.connectedAccountId }
  }

  private verifyComposioWebhookSignature(
    params: {
      webhookId?: string
      webhookSignature?: string
      webhookTimestamp?: string
    },
    rawPayload: string,
    secret: string,
  ): boolean {
    const timestampMs = Number(params.webhookTimestamp) * 1000
    if (!Number.isFinite(timestampMs)) return false
    const ageSeconds = Math.abs(Date.now() - timestampMs) / 1000
    if (ageSeconds > 300) return false

    const signingString = `${params.webhookId}.${params.webhookTimestamp}.${rawPayload}`
    const expected = createHmac('sha256', secret).update(signingString).digest('base64')
    const received =
      String(params.webhookSignature ?? '')
        .split(',')
        .pop()
        ?.trim() ?? ''
    if (!received) return false

    const expectedBuffer = Buffer.from(expected)
    const receivedBuffer = Buffer.from(received)
    if (expectedBuffer.length !== receivedBuffer.length) return false
    return timingSafeEqual(expectedBuffer, receivedBuffer)
  }
}
