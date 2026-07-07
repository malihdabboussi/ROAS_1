import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatAdminAuthRepository } from '../repositories/chat-admin-auth.repository'

const OPENAI_CODEX_INTEGRATION_ID = 'openai_codex'
const OPENAI_CODEX_PROVIDER = 'openai-codex'
const OPENAI_CODEX_VAULT_LABEL = 'oauth:default'
const OPENAI_CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const OPENAI_CODEX_TOKEN_URL = 'https://auth.openai.com/oauth/token'
const JWT_CLAIM_PATH = 'https://api.openai.com/auth'
const REFRESH_GRACE_MS = 2 * 60 * 1000

type OpenAICodexTokenBundle = {
  access: string
  refresh: string
  expires: number
  accountId: string
  email?: string | null
}

type OpenAICodexRuntimeCredential = {
  provider: typeof OPENAI_CODEX_PROVIDER
  accessToken: string
}

@Injectable()
export class OpenAICodexAdminAuthService {
  private readonly logger = new Logger(OpenAICodexAdminAuthService.name)

  constructor(
    private readonly serviceClient: SupabaseServiceClient,
    private readonly repository: ChatAdminAuthRepository = new ChatAdminAuthRepository(),
  ) {}

  private get supabase() {
    return this.serviceClient.client
  }

  async resolveRuntimeCredential(
    userId: string | undefined,
  ): Promise<OpenAICodexRuntimeCredential | null> {
    if (!userId) return null
    const isAdmin = await this.isPlatformAdmin(userId)
    if (!isAdmin) return null

    const connection = await this.loadConnection(userId)
    if (!connection) return null

    const label =
      typeof connection.metadata?.vault_secret_label === 'string'
        ? connection.metadata.vault_secret_label
        : OPENAI_CODEX_VAULT_LABEL
    const bundle = await this.loadTokenBundle(userId, label)
    if (!bundle) return null

    const freshBundle =
      bundle.expires <= Date.now() + REFRESH_GRACE_MS
        ? await this.refreshAndPersistTokenBundle(userId, label, bundle)
        : bundle

    return {
      provider: OPENAI_CODEX_PROVIDER,
      accessToken: freshBundle.access,
    }
  }

  private async isPlatformAdmin(userId: string): Promise<boolean> {
    const { role, error } = await this.repository.findUserRole(this.supabase, userId)

    if (error) {
      this.logger.warn(`OpenAI Codex admin role lookup failed: ${error.message}`)
      return false
    }

    return role === 'admin' || role === 'superadmin'
  }

  private async loadConnection(userId: string): Promise<{
    token_expires_at?: string | null
    metadata?: Record<string, unknown> | null
  } | null> {
    const { connection, error } = await this.repository.findOpenAICodexConnection(
      this.supabase,
      userId,
      OPENAI_CODEX_INTEGRATION_ID,
    )

    if (error) {
      this.logger.warn(`OpenAI Codex connection lookup failed: ${error.message}`)
      return null
    }
    if (!connection || connection.status !== 'connected') return null
    return connection
  }

  private async loadTokenBundle(
    userId: string,
    label: string,
  ): Promise<OpenAICodexTokenBundle | null> {
    const { encryptedValue, error } = await this.repository.findVaultEncryptedValue(
      this.supabase,
      {
        userId,
        provider: OPENAI_CODEX_PROVIDER,
        label,
      },
    )

    if (error) {
      this.logger.warn(`OpenAI Codex vault lookup failed: ${error.message}`)
      return null
    }
    if (!encryptedValue) return null
    try {
      return this.parseTokenBundle(this.decrypt(encryptedValue))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      this.logger.warn(`OpenAI Codex vault token could not be read: ${message}`)
      if (message === 'Vault encryption is not configured') throw error
      return null
    }
  }

  private parseTokenBundle(raw: string): OpenAICodexTokenBundle {
    const parsed = JSON.parse(raw) as Partial<OpenAICodexTokenBundle>
    if (
      !parsed.access ||
      !parsed.refresh ||
      typeof parsed.expires !== 'number' ||
      !parsed.accountId
    ) {
      throw new Error('OpenAI Codex vault token is incomplete')
    }
    return {
      access: parsed.access,
      refresh: parsed.refresh,
      expires: parsed.expires,
      accountId: parsed.accountId,
      email: parsed.email ?? null,
    }
  }

  private async refreshAndPersistTokenBundle(
    userId: string,
    label: string,
    bundle: OpenAICodexTokenBundle,
  ): Promise<OpenAICodexTokenBundle> {
    const response = await fetch(OPENAI_CODEX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: bundle.refresh,
        client_id: OPENAI_CODEX_CLIENT_ID,
      }),
    })

    if (!response.ok) {
      throw new Error('OpenAI Codex token refresh failed')
    }

    const json = (await response.json()) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
    }
    if (!json.access_token || !json.refresh_token || typeof json.expires_in !== 'number') {
      throw new Error('OpenAI Codex token refresh response was incomplete')
    }

    const metadata = this.decodeTokenMetadata(json.access_token)
    const nextBundle: OpenAICodexTokenBundle = {
      access: json.access_token,
      refresh: json.refresh_token,
      expires: Date.now() + json.expires_in * 1000,
      accountId: metadata.accountId ?? bundle.accountId,
      email: metadata.email ?? bundle.email ?? null,
    }

    const now = new Date().toISOString()
    const expiresAt = new Date(nextBundle.expires).toISOString()
    const encryptedValue = this.encrypt(JSON.stringify(nextBundle))
    const vaultError = await this.repository.upsertOpenAICodexVaultSecret(this.supabase, {
      user_id: userId,
      provider: OPENAI_CODEX_PROVIDER,
      label,
      secret_type: 'oauth_token',
      encrypted_value: encryptedValue,
      metadata: {
        account_id: nextBundle.accountId,
        email: nextBundle.email,
        expires_at: expiresAt,
      },
      updated_at: now,
    })

    if (vaultError) {
      throw new Error(`OpenAI Codex token refresh persistence failed: ${vaultError.message}`)
    }

    const integrationError = await this.repository.updateOpenAICodexIntegration(this.supabase, {
      userId,
      integrationId: OPENAI_CODEX_INTEGRATION_ID,
      payload: {
        token_expires_at: expiresAt,
        metadata: {
          account_id: nextBundle.accountId,
          email: nextBundle.email,
          vault_secret_label: label,
          admin_only: true,
          token_storage: 'vault_secrets',
        },
        updated_at: now,
      },
    })

    if (integrationError) {
      throw new Error(
        `OpenAI Codex connection refresh persistence failed: ${integrationError.message}`,
      )
    }

    return nextBundle
  }

  private encrypt(plaintext: string): string {
    const key = this.requireEncryptionKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  private decrypt(ciphertext: string): string {
    const key = this.requireEncryptionKey()
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('OpenAI Codex vault token format is invalid')
    }
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }

  private requireEncryptionKey(): Buffer {
    const key = process.env.VAULT_ENCRYPTION_KEY?.trim() ?? ''
    if (!/^[a-f0-9]{64}$/i.test(key)) {
      throw new Error('Vault encryption is not configured')
    }
    const decoded = Buffer.from(key, 'hex')
    if (decoded.length !== 32) {
      throw new Error('Vault encryption is not configured')
    }
    return decoded
  }

  private decodeTokenMetadata(accessToken: string): {
    accountId: string | null
    email: string | null
  } {
    try {
      const payload = accessToken.split('.')[1]
      if (!payload) return { accountId: null, email: null }
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<
        string,
        unknown
      >
      const auth = decoded[JWT_CLAIM_PATH]
      const accountId =
        auth && typeof auth === 'object'
          ? (auth as Record<string, unknown>).chatgpt_account_id
          : null
      return {
        accountId: typeof accountId === 'string' ? accountId : null,
        email: typeof decoded.email === 'string' ? decoded.email : null,
      }
    } catch {
      return { accountId: null, email: null }
    }
  }
}
