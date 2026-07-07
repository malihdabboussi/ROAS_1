import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { VaultService } from '../../../vault/services/vault.service'
import { FirefliesIntegration } from '../integrations/fireflies.integration'
import { FirefliesRepository } from '../repositories/fireflies.repository'
import type { FirefliesTranscript, FirefliesUser } from '../types/fireflies.types'

const VAULT_LABEL = 'api_key'

@Injectable()
export class FirefliesApiService {
  private readonly logger = new Logger(FirefliesApiService.name)

  constructor(
    private readonly fireflies: FirefliesIntegration,
    private readonly vault: VaultService,
    private readonly repo: FirefliesRepository,
  ) {}

  private async getApiKey(userId: string): Promise<string> {
    const key = await this.vault.getSecret(userId, 'fireflies', VAULT_LABEL)
    if (!key) throw new BadRequestException('Fireflies is not connected')
    return key
  }

  async connect(userId: string, apiKey: string): Promise<{ user: FirefliesUser }> {
    const user = await this.fireflies.getUser(apiKey)
    await this.vault.storeSecret(userId, 'fireflies', VAULT_LABEL, apiKey, 'api_key', {
      email: user.email,
      name: user.name,
    })
    await this.repo.upsertConnection(userId, { email: user.email, name: user.name })

    return { user }
  }

  async disconnect(userId: string): Promise<void> {
    await this.vault.deleteSecret(userId, 'fireflies', VAULT_LABEL)
    await this.repo.markDisconnected(userId)
  }

  async getStatus(userId: string): Promise<{
    connected: boolean
    status: string | null
    email: string | null
    name: string | null
    connectedAt: string | null
  }> {
    const hasKey = await this.vault.hasSecret(userId, 'fireflies', VAULT_LABEL)
    if (!hasKey)
      return { connected: false, status: null, email: null, name: null, connectedAt: null }

    return (
      (await this.repo.getStatus(userId)) ?? {
        connected: false,
        status: null,
        email: null,
        name: null,
        connectedAt: null,
      }
    )
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

  async getTranscriptWithSentences(
    userId: string,
    transcriptId: string,
  ): Promise<FirefliesTranscript> {
    return this.getTranscript(userId, transcriptId)
  }

  async hasSyncedTranscript(sessionKey: string): Promise<boolean> {
    return this.repo.hasMemorySession(sessionKey)
  }
}
