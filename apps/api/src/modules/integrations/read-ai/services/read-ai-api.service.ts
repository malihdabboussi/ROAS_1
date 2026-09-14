import { BadRequestException, Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MeetingIntakeRepository } from '../../../meetings/intake/repositories/meeting-intake.repository'
import { buildMeetingWebhookPath, readWebhookKey } from '../../../meetings/providers/webhook-key'
import { VaultService } from '../../../vault/services/vault.service'
import { isValidReadAiSigningKey } from '../providers/read-ai-webhook-signature'

export const READ_AI_SIGNING_KEY_LABEL = 'signing_key'
const READ_AI_CONNECTION_LABEL = 'Read AI'

export type ReadAiStatus = {
  connected: boolean
  status: string | null
  connectedAt: string | null
  /** Address to paste into Read AI → Integrations → Webhooks; null until connected. */
  webhookUrl: string | null
  webhookConfigured: boolean
}

const DISCONNECTED: ReadAiStatus = {
  connected: false,
  status: null,
  connectedAt: null,
  webhookUrl: null,
  webhookConfigured: false,
}

/**
 * Read.ai has no API call to make at connect time: the user creates a webhook
 * in Read AI pointing at our address and pastes back the signing key.
 */
@Injectable()
export class ReadAiApiService {
  private readonly apiUrl: string

  constructor(
    private readonly vault: VaultService,
    private readonly connections: MeetingIntakeRepository,
    @Optional() config?: ConfigService,
  ) {
    this.apiUrl =
      config?.get<string>('PUBLIC_API_URL') ||
      config?.get<string>('API_URL') ||
      config?.get<string>('BACKEND_URL') ||
      process.env.PUBLIC_API_URL ||
      'http://localhost:3001'
  }

  private buildWebhookUrl(webhookKey: string | null): string | null {
    if (!webhookKey) return null
    return `${this.apiUrl.replace(/\/$/, '')}${buildMeetingWebhookPath('read_ai', webhookKey)}`
  }

  async connect(userId: string, signingKey: string): Promise<{ webhookUrl: string }> {
    const key = signingKey.trim()
    if (!isValidReadAiSigningKey(key)) {
      throw new BadRequestException('That does not look like a Read AI webhook signing key')
    }
    await this.vault.storeSecret(userId, 'read_ai', READ_AI_SIGNING_KEY_LABEL, key, 'custom', {})
    await this.connections.upsertPastedWebhookConnection('read_ai', userId, {
      connectionLabel: READ_AI_CONNECTION_LABEL,
    })
    const webhookKey = await this.connections.ensureWebhookKey('read_ai', userId)
    return { webhookUrl: this.buildWebhookUrl(webhookKey)! }
  }

  async disconnect(userId: string): Promise<void> {
    await this.vault.deleteSecret(userId, 'read_ai', READ_AI_SIGNING_KEY_LABEL)
    await this.connections.markPastedWebhookDisconnected('read_ai', userId)
  }

  async getStatus(userId: string): Promise<ReadAiStatus> {
    const webhookConfigured = await this.vault.hasSecret(
      userId,
      'read_ai',
      READ_AI_SIGNING_KEY_LABEL,
    )
    const connection = await this.connections.findConnectionForUser('read_ai', userId)
    if (!connection) return { ...DISCONNECTED, webhookConfigured }
    return {
      connected: connection.status === 'connected' && webhookConfigured,
      status: connection.status,
      connectedAt:
        typeof connection.metadata.connected_at === 'string'
          ? connection.metadata.connected_at
          : null,
      webhookUrl: this.buildWebhookUrl(readWebhookKey(connection.metadata)),
      webhookConfigured,
    }
  }
}
