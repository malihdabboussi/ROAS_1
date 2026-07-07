import { ConfigService } from '@nestjs/config'
import { describe, expect, it, vi } from 'vitest'
import { OpenAICodexOAuthService } from '../openai-codex-oauth.service'

function createConfig(overrides: Record<string, string | undefined> = {}) {
  return {
    get: vi.fn((key: string) => {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key]
      if (key === 'OPENAI_CODEX_OAUTH_STATE_SECRET') return 'openai-codex-state-secret'
      return undefined
    }),
  } as unknown as ConfigService
}

function createEmptyConfig(overrides: Record<string, string | undefined> = {}) {
  return {
    get: vi.fn((key: string) => overrides[key]),
  } as unknown as ConfigService
}

describe('OpenAICodexOAuthService', () => {
  it('builds an OpenAI Codex authorization URL with signed PKCE state', () => {
    const integration = {
      buildAuthorizationUrl: vi.fn(
        (input: { state: string }) => `https://auth.test?state=${input.state}`,
      ),
    }
    const service = new OpenAICodexOAuthService(
      createConfig(),
      integration as never,
      {} as never,
      {} as never,
    )

    const authorizeUrl = service.getAuthorizationUrl('user-1', '/admin/openai')

    expect(integration.buildAuthorizationUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.any(String),
        codeChallenge: expect.any(String),
      }),
    )
    expect(authorizeUrl).toContain('state=')
  })

  it('derives the OAuth state signer from the vault key when a dedicated state secret is absent', () => {
    const integration = {
      buildAuthorizationUrl: vi.fn(
        (input: { state: string }) => `https://auth.test?state=${input.state}`,
      ),
    }
    const service = new OpenAICodexOAuthService(
      createEmptyConfig({
        VAULT_ENCRYPTION_KEY: 'vault-encryption-key-used-for-local-dev',
      }),
      integration as never,
      {} as never,
      {} as never,
    )

    const authorizeUrl = service.getAuthorizationUrl('user-1', '/admin/openai')

    expect(integration.buildAuthorizationUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.any(String),
        codeChallenge: expect.any(String),
      }),
    )
    expect(authorizeUrl).toContain('state=')
  })

  it('fails clearly when neither a state secret nor vault key is configured', () => {
    const integration = {
      buildAuthorizationUrl: vi.fn(),
    }
    const service = new OpenAICodexOAuthService(
      createEmptyConfig(),
      integration as never,
      {} as never,
      {} as never,
    )

    expect(() => service.getAuthorizationUrl('user-1', '/admin/openai')).toThrow(
      'OpenAI Codex OAuth is not configured. Set OPENAI_CODEX_OAUTH_STATE_SECRET or VAULT_ENCRYPTION_KEY.',
    )
  })

  it('stores OAuth tokens in vault and writes connection metadata on callback completion', async () => {
    const bundle = {
      access: 'access-token',
      refresh: 'refresh-token',
      expires: Date.now() + 3600_000,
      accountId: 'chatgpt-account',
      email: 'admin@example.com',
    }
    const integration = {
      buildAuthorizationUrl: vi.fn(
        (input: { state: string }) => `https://auth.test?state=${input.state}`,
      ),
      exchangeAuthorizationCode: vi.fn(async () => bundle),
    }
    const vault = {
      storeSecret: vi.fn(async () => {}),
      hasSecret: vi.fn(async () => true),
    }
    const repo = {
      upsertConnection: vi.fn(async () => {}),
      getStatus: vi.fn(async () => ({
        connected: true,
        status: 'connected',
        accountId: bundle.accountId,
        email: bundle.email,
        connectedAt: '2026-06-17T00:00:00.000Z',
        tokenExpiresAt: new Date(bundle.expires).toISOString(),
      })),
    }
    const service = new OpenAICodexOAuthService(
      createConfig(),
      integration as never,
      vault as never,
      repo as never,
    )

    const authorizeUrl = new URL(service.getAuthorizationUrl('user-1', '/admin/openai'))
    const state = authorizeUrl.searchParams.get('state') ?? ''
    const result = await service.completeCallback('user-1', {
      callbackUrl: `http://localhost:1455/auth/callback?code=code-1&state=${state}`,
    })

    expect(integration.exchangeAuthorizationCode).toHaveBeenCalledWith({
      code: 'code-1',
      codeVerifier: expect.any(String),
    })
    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user-1',
      'openai-codex',
      'oauth:default',
      JSON.stringify(bundle),
      'oauth_token',
      expect.objectContaining({
        account_id: bundle.accountId,
        email: bundle.email,
      }),
    )
    expect(repo.upsertConnection).toHaveBeenCalledWith('user-1', bundle)
    expect(result.redirectTo).toBe('/admin/openai')
    expect(result.status.connected).toBe(true)
  })
})
