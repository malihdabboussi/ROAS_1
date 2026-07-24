import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MCP_OAUTH_TOKEN_BUNDLE_VERSION,
  parseMcpOAuthTokenBundle,
  serializeMcpOAuthTokenBundle,
} from '@vibey/api-shared'
import { McpOAuthTokenService } from './mcp-oauth-token.service'

describe('McpOAuthTokenService', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns existing static MCP credentials unchanged', async () => {
    const service = new McpOAuthTokenService({} as never, {} as never)
    await expect(service.resolve('secret-1', 'static-key')).resolves.toBe('static-key')
  })

  it('refreshes an expired OAuth token and persists the rotated bundle', async () => {
    const repository = { updateAuthToken: vi.fn(async () => undefined) }
    const serviceClient = { client: { from: vi.fn() } }
    const service = new McpOAuthTokenService(repository as never, serviceClient as never)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 3600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const accessToken = await service.resolve(
      'secret-1',
      serializeMcpOAuthTokenBundle({
        version: MCP_OAUTH_TOKEN_BUNDLE_VERSION,
        provider: 'higgsfield',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
        clientId: 'client-1',
        tokenEndpoint: 'https://mcp.higgsfield.ai/oauth2/token',
        resource: 'https://mcp.higgsfield.ai/mcp',
        scope: 'openid email offline_access',
      }),
    )

    expect(accessToken).toBe('access-2')
    expect(fetch).toHaveBeenCalledWith(
      new URL('https://mcp.higgsfield.ai/oauth2/token'),
      expect.objectContaining({ method: 'POST' }),
    )
    const persisted = parseMcpOAuthTokenBundle(repository.updateAuthToken.mock.calls[0][2])
    expect(persisted).toMatchObject({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    })
  })

  it('asks for reconnection when an expired bundle cannot refresh', async () => {
    const repository = { markOAuthNeedsReconnect: vi.fn(async () => undefined) }
    const serviceClient = { client: {} }
    const service = new McpOAuthTokenService(repository as never, serviceClient as never)
    const bundle = serializeMcpOAuthTokenBundle({
      version: MCP_OAUTH_TOKEN_BUNDLE_VERSION,
      provider: 'higgsfield',
      accessToken: 'access-1',
      refreshToken: null,
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      clientId: 'client-1',
      tokenEndpoint: 'https://mcp.higgsfield.ai/oauth2/token',
      resource: 'https://mcp.higgsfield.ai/mcp',
      scope: null,
    })

    await expect(service.resolve('secret-1', bundle)).rejects.toThrow(
      'Higgsfield needs to be reconnected',
    )
    expect(repository.markOAuthNeedsReconnect).toHaveBeenCalledWith(
      serviceClient.client,
      'secret-1',
      'higgsfield',
    )
  })
})
