import { describe, expect, it } from 'vitest'
import {
  MCP_OAUTH_TOKEN_BUNDLE_VERSION,
  mcpOAuthTokenNeedsRefresh,
  parseMcpOAuthTokenBundle,
  serializeMcpOAuthTokenBundle,
} from './mcp-oauth-token-bundle'

describe('MCP OAuth token bundle', () => {
  it('round-trips the durable OAuth credential contract', () => {
    const raw = serializeMcpOAuthTokenBundle({
      version: MCP_OAUTH_TOKEN_BUNDLE_VERSION,
      provider: 'higgsfield',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: '2026-07-24T22:00:00.000Z',
      clientId: 'client-1',
      tokenEndpoint: 'https://mcp.higgsfield.ai/oauth2/token',
      resource: 'https://mcp.higgsfield.ai/mcp',
      scope: 'openid email offline_access',
    })

    expect(parseMcpOAuthTokenBundle(raw)).toMatchObject({
      provider: 'higgsfield',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    })
  })

  it('does not mistake existing static MCP API keys for OAuth bundles', () => {
    expect(parseMcpOAuthTokenBundle('plain-api-key')).toBeNull()
  })

  it('refreshes before expiry', () => {
    const bundle = parseMcpOAuthTokenBundle(
      serializeMcpOAuthTokenBundle({
        version: MCP_OAUTH_TOKEN_BUNDLE_VERSION,
        provider: 'higgsfield',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresAt: '2026-07-24T22:01:00.000Z',
        clientId: 'client-1',
        tokenEndpoint: 'https://mcp.higgsfield.ai/oauth2/token',
        resource: 'https://mcp.higgsfield.ai/mcp',
        scope: null,
      }),
    )

    expect(mcpOAuthTokenNeedsRefresh(bundle!, Date.parse('2026-07-24T22:00:30.000Z'))).toBe(true)
  })
})
