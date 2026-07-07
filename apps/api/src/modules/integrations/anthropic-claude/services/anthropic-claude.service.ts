import { BadRequestException, Injectable } from '@nestjs/common'
import { VaultService } from '../../../vault/services/vault.service'
import { AnthropicClaudeRepository } from '../repositories/anthropic-claude.repository'
import {
  ANTHROPIC_CLAUDE_PROVIDER,
  ANTHROPIC_CLAUDE_TOKEN_MIN_LENGTH,
  ANTHROPIC_CLAUDE_TOKEN_PREFIX,
  ANTHROPIC_CLAUDE_VAULT_LABEL,
  ANTHROPIC_CLAUDE_VAULT_SECRET_TYPE,
  type AnthropicClaudeStatus,
} from '../types/anthropic-claude.types'

@Injectable()
export class AnthropicClaudeService {
  constructor(
    private readonly vault: VaultService,
    private readonly repo: AnthropicClaudeRepository,
  ) {}

  async connect(userId: string, setupToken: string): Promise<AnthropicClaudeStatus> {
    const token = this.normalizeSetupToken(setupToken)
    await this.vault.storeSecret(
      userId,
      ANTHROPIC_CLAUDE_PROVIDER,
      ANTHROPIC_CLAUDE_VAULT_LABEL,
      token,
      ANTHROPIC_CLAUDE_VAULT_SECRET_TYPE,
      {
        token_type: 'setup_token',
        provider: ANTHROPIC_CLAUDE_PROVIDER,
      },
    )
    await this.repo.upsertConnection(userId)
    return (await this.getStatus(userId)) ?? {
      connected: true,
      status: 'connected',
      connectedAt: new Date().toISOString(),
    }
  }

  async disconnect(userId: string): Promise<void> {
    await this.vault.deleteSecret(
      userId,
      ANTHROPIC_CLAUDE_PROVIDER,
      ANTHROPIC_CLAUDE_VAULT_LABEL,
    )
    await this.repo.markDisconnected(userId)
  }

  async getStatus(userId: string): Promise<AnthropicClaudeStatus> {
    const hasToken = await this.vault.hasSecret(
      userId,
      ANTHROPIC_CLAUDE_PROVIDER,
      ANTHROPIC_CLAUDE_VAULT_LABEL,
    )
    if (!hasToken) return { connected: false, status: null, connectedAt: null }

    return (
      (await this.repo.getStatus(userId)) ?? {
        connected: false,
        status: null,
        connectedAt: null,
      }
    )
  }

  private normalizeSetupToken(value: string): string {
    const token = value.trim()
    if (
      !token.startsWith(ANTHROPIC_CLAUDE_TOKEN_PREFIX) ||
      token.length < ANTHROPIC_CLAUDE_TOKEN_MIN_LENGTH
    ) {
      throw new BadRequestException('Claude setup token is invalid')
    }
    return token
  }
}
