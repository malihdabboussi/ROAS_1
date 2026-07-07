import { createCipheriv, randomBytes } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenAICodexAdminAuthService } from './openai-codex-admin-auth.service'

const VAULT_KEY = 'b'.repeat(64)

function encrypt(value: string): string {
  const key = Buffer.from(VAULT_KEY, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

function makeRepository(overrides?: Record<string, unknown>) {
  return {
    findUserRole: vi.fn(async () => ({ role: 'admin', error: null })),
    findOpenAICodexConnection: vi.fn(async () => ({
      connection: {
        status: 'connected',
        metadata: { vault_secret_label: 'oauth:default' },
      },
      error: null,
    })),
    findVaultEncryptedValue: vi.fn(async () => ({ encryptedValue: null, error: null })),
    upsertOpenAICodexVaultSecret: vi.fn(async () => null),
    updateOpenAICodexIntegration: vi.fn(async () => null),
    ...overrides,
  }
}

function makeAccessToken(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `header.${payload}.signature`
}

describe('OpenAICodexAdminAuthService', () => {
  const originalVaultKey = process.env.VAULT_ENCRYPTION_KEY

  afterEach(() => {
    if (originalVaultKey === undefined) delete process.env.VAULT_ENCRYPTION_KEY
    else process.env.VAULT_ENCRYPTION_KEY = originalVaultKey
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not return a runtime credential for non-admin users', async () => {
    const repository = makeRepository({
      findUserRole: vi.fn(async () => ({ role: 'user', error: null })),
    })
    const service = new OpenAICodexAdminAuthService(
      { client: {} } as never,
      repository as never,
    )

    await expect(service.resolveRuntimeCredential('user-1')).resolves.toBeNull()
    expect(repository.findOpenAICodexConnection).not.toHaveBeenCalled()
  })

  it('returns an admin runtime credential from an encrypted vault bundle', async () => {
    process.env.VAULT_ENCRYPTION_KEY = VAULT_KEY
    const bundle = {
      access: 'access-token',
      refresh: 'refresh-token',
      expires: Date.now() + 3600_000,
      accountId: 'chatgpt-account',
      email: 'admin@example.com',
    }
    const encryptedBundle = encrypt(JSON.stringify(bundle))
    const repository = makeRepository({
      findOpenAICodexConnection: vi.fn(async () => ({
        connection: {
          status: 'connected',
          token_expires_at: new Date(bundle.expires).toISOString(),
          metadata: { vault_secret_label: 'oauth:default' },
        },
        error: null,
      })),
      findVaultEncryptedValue: vi.fn(async () => ({
        encryptedValue: encryptedBundle,
        error: null,
      })),
    })
    const client = {}
    const service = new OpenAICodexAdminAuthService({ client } as never, repository as never)

    await expect(service.resolveRuntimeCredential('admin-1')).resolves.toEqual({
      provider: 'openai-codex',
      accessToken: 'access-token',
    })
    expect(repository.findUserRole).toHaveBeenCalledWith(client, 'admin-1')
    expect(repository.findOpenAICodexConnection).toHaveBeenCalledWith(
      client,
      'admin-1',
      'openai_codex',
    )
    expect(repository.findVaultEncryptedValue).toHaveBeenCalledWith(client, {
      userId: 'admin-1',
      provider: 'openai-codex',
      label: 'oauth:default',
    })
    expect(repository.upsertOpenAICodexVaultSecret).not.toHaveBeenCalled()
  })

  it('refreshes and persists expired OpenAI Codex vault bundles', async () => {
    process.env.VAULT_ENCRYPTION_KEY = VAULT_KEY
    const expiredBundle = {
      access: 'old-access',
      refresh: 'refresh-token',
      expires: Date.now() - 1_000,
      accountId: 'old-account',
      email: 'old@example.com',
    }
    const nextToken = makeAccessToken({
      email: 'next@example.com',
      'https://api.openai.com/auth': { chatgpt_account_id: 'next-account' },
    })
    const encryptedBundle = encrypt(JSON.stringify(expiredBundle))
    const repository = makeRepository({
      findVaultEncryptedValue: vi.fn(async () => ({
        encryptedValue: encryptedBundle,
        error: null,
      })),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          access_token: nextToken,
          refresh_token: 'next-refresh',
          expires_in: 3600,
        }),
      })),
    )
    const service = new OpenAICodexAdminAuthService(
      { client: {} } as never,
      repository as never,
    )

    await expect(service.resolveRuntimeCredential('admin-1')).resolves.toEqual({
      provider: 'openai-codex',
      accessToken: nextToken,
    })
    expect(repository.upsertOpenAICodexVaultSecret).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        user_id: 'admin-1',
        provider: 'openai-codex',
        label: 'oauth:default',
        secret_type: 'oauth_token',
        metadata: expect.objectContaining({
          account_id: 'next-account',
          email: 'next@example.com',
        }),
      }),
    )
    expect(repository.updateOpenAICodexIntegration).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'admin-1',
        integrationId: 'openai_codex',
        payload: expect.objectContaining({
          metadata: expect.objectContaining({
            account_id: 'next-account',
            email: 'next@example.com',
            vault_secret_label: 'oauth:default',
          }),
        }),
      }),
    )
  })

  it('surfaces vault encryption configuration errors for connected admins', async () => {
    delete process.env.VAULT_ENCRYPTION_KEY
    const repository = makeRepository({
      findVaultEncryptedValue: vi.fn(async () => ({ encryptedValue: '00:00:00', error: null })),
    })
    const service = new OpenAICodexAdminAuthService(
      { client: {} } as never,
      repository as never,
    )

    await expect(service.resolveRuntimeCredential('admin-1')).rejects.toThrow(
      'Vault encryption is not configured',
    )
  })
})
