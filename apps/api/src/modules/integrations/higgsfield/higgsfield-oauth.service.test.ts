import { afterEach, describe, expect, it, vi } from 'vitest'
import { HiggsfieldOAuthService } from './higgsfield-oauth.service'

const configValues: Record<string, string> = {
  HIGGSFIELD_OAUTH_CLIENT_ID: 'client-1',
  HIGGSFIELD_OAUTH_REDIRECT_URI: 'https://api.roas.io/api/integrations/higgsfield/callback',
  HIGGSFIELD_OAUTH_STATE_SECRET: 'state-secret',
  APP_URL: 'https://app.roas.io',
}

function createService() {
  const repository = {
    saveConnection: vi.fn(async () => ({ serverId: 'server-1', vaultSecretId: 'secret-1' })),
    updateProbe: vi.fn(async () => undefined),
    removeConnection: vi.fn(async () => undefined),
  }
  const connections = {
    upsertConnection: vi.fn(async () => undefined),
    getStatus: vi.fn(async () => null),
    markDisconnectedById: vi.fn(async () => undefined),
  }
  const probe = {
    refreshToolsAndResources: vi.fn(async () => ({
      ok: true,
      tools: [{ name: 'generate_video' }],
      resources: [],
    })),
  }
  const config = { get: vi.fn((key: string) => configValues[key]) }
  const serviceClient = { client: {} }
  return {
    service: new HiggsfieldOAuthService(
      config as never,
      repository as never,
      connections as never,
      probe as never,
      serviceClient as never,
    ),
    repository,
    connections,
  }
}

describe('HiggsfieldOAuthService', () => {
  afterEach(() => vi.restoreAllMocks())

  it('starts authorization-code OAuth with PKCE and exact MCP resource binding', () => {
    const { service } = createService()
    const url = new URL(
      service.getAuthorizationUrl(
        { userId: 'user-1', orgId: null, orgRole: null },
        'https://app.roas.io/settings?tab=integrations',
      ),
    )

    expect(url.origin + url.pathname).toBe('https://mcp.higgsfield.ai/oauth2/authorize')
    expect(url.searchParams.get('client_id')).toBe('client-1')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBeTruthy()
    expect(url.searchParams.get('resource')).toBe('https://mcp.higgsfield.ai/mcp')
    expect(url.searchParams.get('scope')).toContain('offline_access')
  })

  it('exchanges the code, stores the vault bundle, and registers the agent MCP server', async () => {
    const { service, repository, connections } = createService()
    const authorization = new URL(
      service.getAuthorizationUrl(
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
        'https://app.roas.io/settings?tab=integrations',
      ),
    )
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 3600,
          scope: 'openid email offline_access',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const redirect = await service.handleCallback(
      'code-1',
      authorization.searchParams.get('state')!,
    )

    expect(fetch).toHaveBeenCalledWith(
      'https://mcp.higgsfield.ai/oauth2/token',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams),
      }),
    )
    expect(repository.saveConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: expect.objectContaining({ userId: 'user-1', orgId: 'org-1' }),
        tokenBundle: expect.stringContaining('"refreshToken":"refresh-1"'),
      }),
    )
    expect(connections.upsertConnection).toHaveBeenCalledWith(
      'higgsfield',
      'user-1',
      expect.objectContaining({
        status: 'connected',
        scope_mode: 'org_shared',
        access_token: null,
        refresh_token: null,
      }),
      'org-1',
      'org_shared',
      expect.any(String),
    )
    expect(redirect).toContain('/integrations/connected?')
    expect(redirect).toContain('integration=higgsfield')
  })

  it('rejects a tampered OAuth state', async () => {
    const { service } = createService()
    await expect(service.handleCallback('code-1', 'invalid.state')).rejects.toThrow(
      'Invalid Higgsfield session',
    )
  })
})
