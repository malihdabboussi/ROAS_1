import { afterEach, describe, expect, it, vi } from 'vitest'
import { VibeyMcpTokenIntrospectionService } from './vibey-mcp-token-introspection.service'

describe('VibeyMcpTokenIntrospectionService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the registered MCP client identity in token claims', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          active: true,
          user_id: 'user-1',
          org_id: null,
          client_id: 'claude-client',
          client_name: 'Claude',
          client_logo_uri: 'https://claude.ai/favicon.ico',
          scopes: ['mcp:tools'],
          exp: Math.floor(Date.now() / 1000) + 3600,
          supabase_access_token: 'user-token',
          supabase_refresh_token: null,
        }),
      }),
    )

    await expect(new VibeyMcpTokenIntrospectionService().introspect('mcp-token')).resolves.toEqual(
      expect.objectContaining({
        client_name: 'Claude',
        client_logo_uri: 'https://claude.ai/favicon.ico',
      }),
    )
  })
})
