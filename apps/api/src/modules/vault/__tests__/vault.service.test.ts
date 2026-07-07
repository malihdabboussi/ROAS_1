import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VaultRepository } from '../repositories/vault.repository'
import { VaultService } from '../services/vault.service'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

function createConfig() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'VAULT_ENCRYPTION_KEY') return 'a'.repeat(64)
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
      return undefined
    }),
  } as unknown as ConfigService
}

function createSelectQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return query
}

describe('VaultService', () => {
  const originalSupabaseUrl = process.env.SUPABASE_URL
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = originalSupabaseUrl
    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
  })

  it('stores encrypted secret values through the service-role client', async () => {
    const table = {
      upsert: vi.fn(async () => ({ error: null })),
    }
    vi.mocked(createClient).mockReturnValue({ from: vi.fn(() => table) } as never)
    const config = createConfig()
    const service = new VaultService(config, new VaultRepository(config))

    await service.storeSecret('user-1', 'fanbasis', 'default', 'plain-secret')

    expect(table.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        provider: 'fanbasis',
        label: 'default',
        secret_type: 'api_key',
        encrypted_value: expect.not.stringContaining('plain-secret'),
      }),
      { onConflict: 'user_id,provider,label' },
    )
  })

  it('returns null when a secret row is missing', async () => {
    const query = createSelectQuery({ data: null, error: null })
    vi.mocked(createClient).mockReturnValue({ from: vi.fn(() => query) } as never)
    const config = createConfig()
    const service = new VaultService(config, new VaultRepository(config))

    await expect(service.getSecret('user-1', 'fanbasis', 'default')).resolves.toBeNull()
  })

  it('throws when service-role config is missing', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const config = {
      get: vi.fn((key: string) => (key === 'VAULT_ENCRYPTION_KEY' ? 'a'.repeat(64) : undefined)),
    } as unknown as ConfigService
    const service = new VaultService(config, new VaultRepository(config))

    await expect(service.hasSecret('user-1', 'fanbasis', 'default')).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('fails closed when vault encryption key is missing', async () => {
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
        return undefined
      }),
    } as unknown as ConfigService
    const service = new VaultService(config, new VaultRepository(config))

    await expect(
      service.storeSecret('user-1', 'openai-codex', 'oauth', 'secret'),
    ).rejects.toBeInstanceOf(InternalServerErrorException)
  })
})
