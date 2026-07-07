import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { VaultService } from '../../../vault/services/vault.service'
import { OpenAICodexIntegration } from '../integrations/openai-codex.integration'
import { OpenAICodexRepository } from '../repositories/openai-codex.repository'
import {
  OPENAI_CODEX_PROVIDER,
  OPENAI_CODEX_VAULT_LABEL,
  type OpenAICodexStatus,
  type OpenAICodexTokenBundle,
} from '../types/openai-codex.types'

type StatePayload = {
  userId: string
  redirectTo: string
  codeVerifier: string
  ts: number
}

const STATE_TTL_MS = 10 * 60 * 1000
const DEFAULT_REDIRECT_TO = '/admin/integrations?integration=openai_codex'
const VAULT_DERIVED_STATE_CONTEXT = 'openai-codex-oauth-state:v1'

@Injectable()
export class OpenAICodexOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly integration: OpenAICodexIntegration,
    private readonly vault: VaultService,
    private readonly repo: OpenAICodexRepository,
  ) {}

  getAuthorizationUrl(userId: string, redirectTo?: string): string {
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    const state = this.signState({
      userId,
      redirectTo: redirectTo?.trim() || DEFAULT_REDIRECT_TO,
      codeVerifier,
      ts: Date.now(),
    })
    return this.integration.buildAuthorizationUrl({ state, codeChallenge })
  }

  async completeCallback(
    userId: string,
    input: { callbackUrl?: string; code?: string; state?: string },
  ): Promise<{ redirectTo: string; status: OpenAICodexStatus }> {
    const parsed = this.parseAuthorizationInput(input)
    if (!parsed.code || !parsed.state) {
      throw new BadRequestException('Missing OpenAI Codex authorization code or state')
    }

    const state = this.verifyState(parsed.state)
    if (state.userId !== userId) {
      throw new BadRequestException('OpenAI Codex OAuth state does not match the current user')
    }

    const bundle = await this.integration.exchangeAuthorizationCode({
      code: parsed.code,
      codeVerifier: state.codeVerifier,
    })

    await this.storeTokenBundle(userId, bundle)
    await this.repo.upsertConnection(userId, bundle)

    return {
      redirectTo: state.redirectTo || DEFAULT_REDIRECT_TO,
      status: (await this.getStatus(userId)) ?? this.statusFromBundle(bundle),
    }
  }

  async getStatus(userId: string): Promise<OpenAICodexStatus> {
    const hasToken = await this.vault.hasSecret(
      userId,
      OPENAI_CODEX_PROVIDER,
      OPENAI_CODEX_VAULT_LABEL,
    )
    if (!hasToken) {
      return {
        connected: false,
        status: null,
        accountId: null,
        email: null,
        connectedAt: null,
        tokenExpiresAt: null,
      }
    }

    return (
      (await this.repo.getStatus(userId)) ?? {
        connected: false,
        status: null,
        accountId: null,
        email: null,
        connectedAt: null,
        tokenExpiresAt: null,
      }
    )
  }

  async disconnect(userId: string): Promise<void> {
    await this.vault.deleteSecret(userId, OPENAI_CODEX_PROVIDER, OPENAI_CODEX_VAULT_LABEL)
    await this.repo.markDisconnected(userId)
  }

  private async storeTokenBundle(userId: string, bundle: OpenAICodexTokenBundle): Promise<void> {
    await this.vault.storeSecret(
      userId,
      OPENAI_CODEX_PROVIDER,
      OPENAI_CODEX_VAULT_LABEL,
      JSON.stringify(bundle),
      'oauth_token',
      {
        account_id: bundle.accountId,
        email: bundle.email ?? null,
        expires_at: new Date(bundle.expires).toISOString(),
      },
    )
  }

  private statusFromBundle(bundle: OpenAICodexTokenBundle): OpenAICodexStatus {
    return {
      connected: true,
      status: 'connected',
      accountId: bundle.accountId,
      email: bundle.email ?? null,
      connectedAt: new Date().toISOString(),
      tokenExpiresAt: new Date(bundle.expires).toISOString(),
    }
  }

  private parseAuthorizationInput(input: { callbackUrl?: string; code?: string; state?: string }): {
    code?: string
    state?: string
  } {
    if (input.callbackUrl?.trim()) {
      const value = input.callbackUrl.trim()
      try {
        const url = new URL(value)
        return {
          code: url.searchParams.get('code') ?? undefined,
          state: url.searchParams.get('state') ?? undefined,
        }
      } catch {
        const params = new URLSearchParams(value)
        return {
          code: params.get('code') ?? undefined,
          state: params.get('state') ?? undefined,
        }
      }
    }
    return { code: input.code?.trim(), state: input.state?.trim() }
  }

  private getStateSecret(): string {
    const secret =
      this.config.get<string>('OPENAI_CODEX_OAUTH_STATE_SECRET') ||
      this.config.get<string>('OAUTH_STATE_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      ''
    if (secret.length >= 16) {
      return secret
    }

    const vaultKey = this.config.get<string>('VAULT_ENCRYPTION_KEY') || ''
    if (vaultKey.length >= 16) {
      // Domain-separate the OAuth state signer from vault encryption while avoiding
      // unsafe reuse of another provider's OAuth state secret.
      return createHmac('sha256', vaultKey).update(VAULT_DERIVED_STATE_CONTEXT).digest('base64url')
    }

    throw new InternalServerErrorException(
      'OpenAI Codex OAuth is not configured. Set OPENAI_CODEX_OAUTH_STATE_SECRET or VAULT_ENCRYPTION_KEY.',
    )
  }

  private signState(payload: StatePayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = createHmac('sha256', this.getStateSecret()).update(encoded).digest('base64url')
    return `${encoded}.${sig}`
  }

  private verifyState(state: string): StatePayload {
    const [encoded, sig] = state.split('.')
    if (!encoded || !sig) throw new BadRequestException('Invalid OpenAI Codex OAuth state')
    const expected = createHmac('sha256', this.getStateSecret()).update(encoded).digest('base64url')
    const actualBuffer = Buffer.from(sig)
    const expectedBuffer = Buffer.from(expected)
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Invalid OpenAI Codex OAuth state')
    }

    let parsed: StatePayload
    try {
      parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as StatePayload
    } catch {
      throw new BadRequestException('Invalid OpenAI Codex OAuth state')
    }
    if (!parsed.userId || !parsed.codeVerifier || typeof parsed.ts !== 'number') {
      throw new BadRequestException('Invalid OpenAI Codex OAuth state')
    }
    if (Date.now() - parsed.ts > STATE_TTL_MS) {
      throw new BadRequestException('OpenAI Codex OAuth state expired')
    }
    return parsed
  }
}
