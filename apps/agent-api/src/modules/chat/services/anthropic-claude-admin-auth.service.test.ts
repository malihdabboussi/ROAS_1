import { createCipheriv, randomBytes } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnthropicClaudeAdminAuthService } from './anthropic-claude-admin-auth.service'

const VAULT_KEY = 'c'.repeat(64)
const SETUP_TOKEN = `sk-ant-oat01-${'x'.repeat(80)}`

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
    findUserRole: vi.fn(async () => ({ role: 'superadmin', error: null })),
    findAnthropicConnection: vi.fn(async () => ({
      connection: {
        status: 'connected',
        metadata: { vault_secret_label: 'setup-token:default' },
      },
      error: null,
    })),
    findVaultEncryptedValue: vi.fn(async () => ({ encryptedValue: null, error: null })),
    ...overrides,
  }
}

describe('AnthropicClaudeAdminAuthService', () => {
  const originalVaultKey = process.env.VAULT_ENCRYPTION_KEY

  afterEach(() => {
    if (originalVaultKey === undefined) delete process.env.VAULT_ENCRYPTION_KEY
    else process.env.VAULT_ENCRYPTION_KEY = originalVaultKey
    vi.restoreAllMocks()
  })

  it('does not return a runtime credential for non-admin users', async () => {
    const repository = makeRepository({
      findUserRole: vi.fn(async () => ({ role: 'user', error: null })),
    })
    const service = new AnthropicClaudeAdminAuthService(
      { client: {} } as never,
      repository as never,
    )

    await expect(service.resolveRuntimeCredential('user-1')).resolves.toBeNull()
    expect(repository.findAnthropicConnection).not.toHaveBeenCalled()
  })

  it('returns an admin runtime credential from an encrypted setup token', async () => {
    process.env.VAULT_ENCRYPTION_KEY = VAULT_KEY
    const encryptedToken = encrypt(SETUP_TOKEN)
    const repository = makeRepository({
      findVaultEncryptedValue: vi.fn(async () => ({ encryptedValue: encryptedToken, error: null })),
    })
    const client = {}
    const service = new AnthropicClaudeAdminAuthService({ client } as never, repository as never)

    await expect(service.resolveRuntimeCredential('admin-1')).resolves.toEqual({
      provider: 'anthropic',
      accessToken: SETUP_TOKEN,
    })
    expect(repository.findUserRole).toHaveBeenCalledWith(client, 'admin-1')
    expect(repository.findAnthropicConnection).toHaveBeenCalledWith(
      client,
      'admin-1',
      'anthropic_claude',
    )
    expect(repository.findVaultEncryptedValue).toHaveBeenCalledWith(client, {
      userId: 'admin-1',
      provider: 'anthropic',
      label: 'setup-token:default',
    })
  })

  it('surfaces vault encryption configuration errors for connected admins', async () => {
    delete process.env.VAULT_ENCRYPTION_KEY
    const repository = makeRepository({
      findVaultEncryptedValue: vi.fn(async () => ({ encryptedValue: '00:00:00', error: null })),
    })
    const service = new AnthropicClaudeAdminAuthService(
      { client: {} } as never,
      repository as never,
    )

    await expect(service.resolveRuntimeCredential('admin-1')).rejects.toThrow(
      'Vault encryption is not configured',
    )
  })
})
