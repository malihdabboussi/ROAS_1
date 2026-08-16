import { BadRequestException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { McpOAuthService } from './services/mcp-oauth.service'

function createQuery(result: { data?: unknown; error?: { message: string } | null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    delete: vi.fn(() => query),
    lt: vi.fn(() => query),
    not: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockResolvedValue(result),
  }
  return query
}

function createService(
  supabase: unknown,
  userSessionMint: { mintAccessToken: ReturnType<typeof vi.fn> } = {
    mintAccessToken: vi.fn().mockResolvedValue('minted-supabase-access-token'),
  },
  oauthRepository?: unknown,
) {
  return new McpOAuthService(
    { client: supabase } as never,
    {} as never,
    userSessionMint as never,
    oauthRepository as never,
  )
}

describe('McpOAuthService resource normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.MCP_RESOURCE_URL
  })

  it('accepts trailing-slash and legacy path resource values during authorization', async () => {
    process.env.INTERNAL_API_TOKEN = 'test-internal-token'
    const clientRow = {
      client_id: 'client-1',
      client_name: 'Cursor',
      client_uri: null,
      logo_uri: null,
      redirect_uris: ['cursor://anysphere.cursor-mcp/oauth/callback'],
      is_enabled: true,
      metadata: {},
    }
    const insertQuery = createQuery({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'mcp_oauth_clients') return createQuery({ data: clientRow, error: null })
        if (table === 'mcp_oauth_authorization_requests') return insertQuery
        return createQuery({ error: null })
      }),
    }
    const service = createService(supabase)

    const url = await service.startAuthorization({
      response_type: 'code',
      client_id: 'client-1',
      redirect_uri: 'cursor://anysphere.cursor-mcp/oauth/callback',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'S256',
      resource: 'https://mcp.roas.io/',
    })

    expect(url).toContain('/mcp/consent?')
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'https://mcp.roas.io' }),
    )
  })

  it('rejects the retired Vibey MCP resource URL', async () => {
    const clientRow = {
      client_id: 'client-1',
      client_name: 'Cursor',
      client_uri: null,
      logo_uri: null,
      redirect_uris: ['cursor://anysphere.cursor-mcp/oauth/callback'],
      is_enabled: true,
      metadata: {},
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'mcp_oauth_clients') return createQuery({ data: clientRow, error: null })
        return createQuery({ error: null })
      }),
    }
    const service = createService(supabase)

    await expect(
      service.startAuthorization({
        response_type: 'code',
        client_id: 'client-1',
        redirect_uri: 'cursor://anysphere.cursor-mcp/oauth/callback',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        resource: 'https://mcp.vibey.im',
      }),
    ).rejects.toThrow(/Invalid resource/i)
  })
})

describe('McpOAuthService client metadata handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not advertise URL-based client metadata documents', () => {
    const service = createService({ from: vi.fn() })

    expect(service.authorizationServerMetadata().client_id_metadata_document_supported).toBe(false)
  })

  it('rejects URL-shaped client ids without fetching metadata', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const supabase = { from: vi.fn() }
    const service = createService(supabase)

    await expect(
      service.startAuthorization({
        response_type: 'code',
        client_id: 'http://169.254.169.254/latest/meta-data',
        redirect_uri: 'https://client.example/callback',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        resource: 'https://mcp.roas.io',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

describe('McpOAuthService database command paths', () => {
  it('registers a dynamic OAuth client with generated defaults', async () => {
    const insertQuery = createQuery({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'mcp_oauth_clients') throw new Error(`Unexpected table: ${table}`)
        return insertQuery
      }),
    }
    const service = createService(supabase)

    const result = await service.registerClient({
      redirect_uris: ['https://client.example/callback'],
    } as never)

    expect(result.client_id).toMatch(/^mcp_client_/)
    expect(result.client_name).toBe('MCP Client')
    expect(result.grant_types).toEqual(['authorization_code', 'refresh_token'])
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_name: 'MCP Client',
        redirect_uris: ['https://client.example/callback'],
        is_enabled: true,
      }),
    )
  })

  it('revokes access or refresh tokens by token hash', async () => {
    const updateQuery = createQuery({ error: null })
    const supabase = { from: vi.fn(() => updateQuery) }
    const service = createService(supabase)

    await expect(service.revoke({ token: 'token-value' })).resolves.toEqual({ success: true })
    expect(updateQuery.update).toHaveBeenCalledWith({ revoked_at: expect.any(String) })
    expect(updateQuery.or).toHaveBeenCalledWith(expect.stringContaining('access_token_hash.eq.'))
  })

  it('cleans up expired authorization rows and old revoked tokens', async () => {
    const authReqDelete = createQuery({ error: null })
    const authCodeDelete = createQuery({ error: null })
    const tokenDelete = createQuery({ error: null })
    const queries = [authReqDelete, authCodeDelete, tokenDelete]
    const supabase = { from: vi.fn(() => queries.shift()) }
    const service = createService(supabase)

    await expect(service.cleanupExpiredRows()).resolves.toEqual({ success: true })
    expect(authReqDelete.delete).toHaveBeenCalled()
    expect(authReqDelete.lt).toHaveBeenCalledWith('expires_at', expect.any(String))
    expect(authCodeDelete.lt).toHaveBeenCalledWith('expires_at', expect.any(String))
    expect(tokenDelete.lt).toHaveBeenCalledWith('refresh_expires_at', expect.any(String))
    expect(tokenDelete.not).toHaveBeenCalledWith('revoked_at', 'is', null)
  })
})

describe('McpOAuthService token replay protection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not issue tokens when a concurrent request already consumed the authorization code', async () => {
    const codeRow = {
      id: 'code-1',
      client_id: 'client-1',
      redirect_uri: 'https://client.example/callback',
      resource: 'https://mcp.roas.io',
      code_challenge: 'challenge',
      consumed_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      user_id: 'user-1',
      org_id: null,
      consent_id: 'consent-1',
      scopes: ['mcp.v1'],
    }
    const codeSelect = createQuery({ data: codeRow, error: null })
    const codeConsume = createQuery({ data: null, error: null })
    const vaultQuery = createQuery({ data: { id: 'vault-1' }, error: null })
    const tokenInsert = createQuery({ error: null })
    const codeQueries = [codeSelect, codeConsume]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'mcp_oauth_authorization_codes') return codeQueries.shift() ?? codeConsume
        if (table === 'vault_secrets') return vaultQuery
        if (table === 'mcp_oauth_tokens') return tokenInsert
        return createQuery({ error: null })
      }),
    }
    const service = createService(supabase)
    ;(service as never as { verifyPkce: () => void }).verifyPkce = vi.fn()

    await expect(
      service.exchangeToken({
        grant_type: 'authorization_code',
        client_id: 'client-1',
        code: 'code-value',
        redirect_uri: 'https://client.example/callback',
        code_verifier: 'verifier',
        resource: 'https://mcp.roas.io',
      }),
    ).rejects.toThrow(/consumed|invalid/i)

    expect(codeConsume.is).toHaveBeenCalledWith('consumed_at', null)
    expect(tokenInsert.insert).not.toHaveBeenCalled()
  })

  it('does not rotate refresh tokens when a concurrent request already revoked the token', async () => {
    const refreshRow = {
      id: 'token-1',
      client_id: 'client-1',
      user_id: 'user-1',
      org_id: null,
      consent_id: 'consent-1',
      scopes: ['mcp.v1'],
      resource: 'https://mcp.roas.io',
      revoked_at: null,
      refresh_expires_at: new Date(Date.now() + 60_000).toISOString(),
    }
    const tokenSelect = createQuery({ data: refreshRow, error: null })
    const tokenRevoke = createQuery({ data: null, error: null })
    const vaultQuery = createQuery({ data: { id: 'vault-1' }, error: null })
    const tokenInsert = createQuery({ error: null })
    const tokenQueries = [tokenSelect, tokenRevoke, tokenInsert]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'mcp_oauth_tokens') return tokenQueries.shift() ?? tokenInsert
        if (table === 'vault_secrets') return vaultQuery
        return createQuery({ error: null })
      }),
    }
    const service = createService(supabase)

    await expect(
      service.exchangeToken({
        grant_type: 'refresh_token',
        client_id: 'client-1',
        refresh_token: 'refresh-token',
        resource: 'https://mcp.roas.io',
      }),
    ).rejects.toThrow(/refresh token|revoked|invalid/i)

    expect(tokenRevoke.is).toHaveBeenCalledWith('revoked_at', null)
    expect(tokenInsert.insert).not.toHaveBeenCalled()
  })

  it('mints an isolated Supabase access token during introspection', async () => {
    process.env.INTERNAL_API_TOKEN = 'internal-token'
    const accessExpiresAt = new Date(Date.now() + 60_000).toISOString()
    const row = {
      id: 'token-1',
      user_id: 'user-1',
      org_id: 'org-1',
      client_id: 'client-1',
      scopes: ['mcp.v1', 'mcp:tools'],
      access_expires_at: accessExpiresAt,
      revoked_at: null,
      supabase_refresh_vault_secret_id: 'stale-browser-session-secret',
      mcp_oauth_consents: { status: 'active' },
    }
    const oauthRepository = {
      findTokenByAccessHash: vi.fn().mockResolvedValue(row),
      touchTokenLastUsed: vi.fn().mockResolvedValue(undefined),
      findVaultSecretValue: vi.fn(),
    }
    const userSessionMint = {
      mintAccessToken: vi.fn().mockResolvedValue('isolated-mcp-user-access-token'),
    }
    const service = createService({ from: vi.fn() }, userSessionMint, oauthRepository)

    await expect(service.introspect({ token: 'mcp-access-token' }, 'internal-token')).resolves.toEqual(
      expect.objectContaining({
        active: true,
        user_id: 'user-1',
        org_id: 'org-1',
        client_id: 'client-1',
        supabase_access_token: 'isolated-mcp-user-access-token',
        supabase_refresh_token: null,
      }),
    )
    expect(userSessionMint.mintAccessToken).toHaveBeenCalledWith('user-1')
    expect(oauthRepository.findVaultSecretValue).not.toHaveBeenCalled()
    expect(oauthRepository.touchTokenLastUsed).toHaveBeenCalledWith(expect.anything(), 'token-1')
  })
})
