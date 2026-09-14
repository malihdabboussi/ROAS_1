import { BadRequestException, Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MeetingIntakeRepository } from '../../../meetings/intake/repositories/meeting-intake.repository'
import { buildMeetingWebhookPath } from '../../../meetings/providers/webhook-key'
import { VaultService } from '../../../vault/services/vault.service'
import { FirefliesIntegration } from '../integrations/fireflies.integration'
import { FirefliesRepository } from '../repositories/fireflies.repository'
import type { FirefliesTranscript, FirefliesUser } from '../types/fireflies.types'

export const FIREFLIES_API_KEY_LABEL = 'api_key'
/** Secret the user sets in Fireflies → Settings → Developer → Webhooks. */
export const FIREFLIES_WEBHOOK_SECRET_LABEL = 'webhook_secret'

export type FirefliesStatus = {
  connected: boolean
  status: string | null
  email: string | null
  name: string | null
  connectedAt: string | null
  /** Address to paste into Fireflies Developer settings; null until connected. */
  webhookUrl: string | null
  webhookConfigured: boolean
}

const DISCONNECTED: FirefliesStatus = {
  connected: false,
  status: null,
  email: null,
  name: null,
  connectedAt: null,
  webhookUrl: null,
  webhookConfigured: false,
}

@Injectable()
export class FirefliesApiService {
  private readonly apiUrl: string

  constructor(
    private readonly fireflies: FirefliesIntegration,
    private readonly vault: VaultService,
    private readonly repo: FirefliesRepository,
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
    return `${this.apiUrl.replace(/\/$/, '')}${buildMeetingWebhookPath('fireflies', webhookKey)}`
  }

  private async getApiKey(userId: string): Promise<string> {
    const key = await this.vault.getSecret(userId, 'fireflies', FIREFLIES_API_KEY_LABEL)
    if (!key) throw new BadRequestException('Fireflies is not connected')
    return key
  }

  async connect(
    userId: string,
    apiKey: string,
    webhookSecret?: string,
  ): Promise<{ user: FirefliesUser; webhookUrl: string }> {
    const user = await this.fireflies.getUser(apiKey)
    await this.vault.storeSecret(userId, 'fireflies', FIREFLIES_API_KEY_LABEL, apiKey, 'api_key', {
      email: user.email,
      name: user.name,
    })
    if (webhookSecret) {
      await this.vault.storeSecret(
        userId,
        'fireflies',
        FIREFLIES_WEBHOOK_SECRET_LABEL,
        webhookSecret,
        'custom',
        {},
      )
    }
    await this.connections.upsertPastedWebhookConnection('fireflies', userId, {
      connectionLabel: user.email ?? user.name ?? 'Fireflies',
      metadata: { email: user.email, name: user.name },
    })
    const webhookKey = await this.connections.ensureWebhookKey('fireflies', userId)
    return { user, webhookUrl: this.buildWebhookUrl(webhookKey)! }
  }

  async updateWebhookSecret(
    userId: string,
    webhookSecret: string,
  ): Promise<{ webhookUrl: string }> {
    const connected = await this.vault.hasSecret(userId, 'fireflies', FIREFLIES_API_KEY_LABEL)
    if (!connected) throw new BadRequestException('Fireflies is not connected')
    await this.vault.storeSecret(
      userId,
      'fireflies',
      FIREFLIES_WEBHOOK_SECRET_LABEL,
      webhookSecret,
      'custom',
      {},
    )
    const webhookKey = await this.connections.ensureWebhookKey('fireflies', userId)
    return { webhookUrl: this.buildWebhookUrl(webhookKey)! }
  }

  async disconnect(userId: string): Promise<void> {
    await this.vault.deleteSecret(userId, 'fireflies', FIREFLIES_API_KEY_LABEL)
    await this.vault.deleteSecret(userId, 'fireflies', FIREFLIES_WEBHOOK_SECRET_LABEL)
    await this.connections.markPastedWebhookDisconnected('fireflies', userId)
  }

  async getStatus(userId: string): Promise<FirefliesStatus> {
    const hasKey = await this.vault.hasSecret(userId, 'fireflies', FIREFLIES_API_KEY_LABEL)
    if (!hasKey) return DISCONNECTED
    const row = await this.repo.getStatus(userId)
    if (!row) return DISCONNECTED
    const webhookConfigured = await this.vault.hasSecret(
      userId,
      'fireflies',
      FIREFLIES_WEBHOOK_SECRET_LABEL,
    )
    return {
      connected: row.connected,
      status: row.status,
      email: row.email,
      name: row.name,
      connectedAt: row.connectedAt,
      webhookUrl: this.buildWebhookUrl(row.webhookKey),
      webhookConfigured,
    }
  }

  async getUser(userId: string): Promise<FirefliesUser> {
    const key = await this.getApiKey(userId)
    return this.fireflies.getUser(key)
  }

  async listTranscripts(
    userId: string,
    opts?: { limit?: number; skip?: number; title?: string },
  ): Promise<FirefliesTranscript[]> {
    const key = await this.getApiKey(userId)
    return this.fireflies.listTranscripts(key, opts)
  }

  async getTranscript(userId: string, transcriptId: string): Promise<FirefliesTranscript> {
    const key = await this.getApiKey(userId)
    return this.fireflies.getTranscript(key, transcriptId)
  }

  async hasSyncedTranscript(sessionKey: string): Promise<boolean> {
    return this.repo.hasMemorySession(sessionKey)
  }
}
