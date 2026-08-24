import { describe, expect, it, vi } from 'vitest'
import { VibeyMcpSessionService } from './vibey-mcp-session.service'

const CLAIMS = {
  user_id: 'user-1',
  org_id: 'org-1',
  client_id: 'claude-client',
  client_name: 'Claude',
  client_logo_uri: 'https://claude.ai/favicon.ico',
  scopes: ['mcp:tools'],
  exp: Math.floor(Date.now() / 1000) + 3600,
  supabase_access_token: 'user-token',
  supabase_refresh_token: null,
}

describe('VibeyMcpSessionService', () => {
  it('names a new MCP conversation from its client and tool identity', async () => {
    const supabase = {}
    const conversations = {
      create: vi.fn().mockResolvedValue({ id: 'conversation-1' }),
    }
    const requestContext = { set: vi.fn() }
    const service = new VibeyMcpSessionService(
      { createUserClient: vi.fn(() => supabase) } as never,
      conversations as never,
      requestContext as never,
    )

    await service.buildSessionKey(CLAIMS, {}, 'synthesize_user_brain_topic')

    expect(conversations.create).toHaveBeenCalledWith(supabase, {
      user_id: 'user-1',
      title: 'Claude · Synthesize User Brain Topic',
      campaign_id: null,
      agent_id: 'vibey',
      org_id: 'org-1',
      metadata: {
        source: 'mcp',
        mcp_client_id: 'claude-client',
        mcp_client_name: 'Claude',
        mcp_client_logo_uri: 'https://claude.ai/favicon.ico',
        mcp_tool_name: 'synthesize_user_brain_topic',
      },
    })
  })

  it('uses a readable MCP title when older introspection omits client identity', async () => {
    const conversations = {
      create: vi.fn().mockResolvedValue({ id: 'conversation-2' }),
    }
    const service = new VibeyMcpSessionService(
      { createUserClient: vi.fn(() => ({})) } as never,
      conversations as never,
      { set: vi.fn() } as never,
    )

    await service.buildSessionKey(
      { ...CLAIMS, client_name: null, client_logo_uri: null },
      {},
      'list_campaigns',
    )

    expect(conversations.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: 'MCP · List Campaigns' }),
    )
  })
})
