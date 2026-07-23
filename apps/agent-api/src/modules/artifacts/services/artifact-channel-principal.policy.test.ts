import { describe, expect, it, vi } from 'vitest'
import { authorizeChannelPrincipalAction } from './artifact-channel-principal.policy'

function target(personalBrainAccess: boolean) {
  return {
    parseConversationId: vi.fn(() => 'conversation-1'),
    requestContext: {
      get: vi.fn(() => ({
        channel: 'slack',
        channelMember: { personal_brain_access: personalBrainAccess },
      })),
    },
  }
}

describe('authorizeChannelPrincipalAction', () => {
  it.each([
    ['search_company_brain', { query: 'pricing' }],
    ['search_brain_context', { query: 'pricing', families: ['company', 'customer'] }],
    ['atlas_save_brain_context', { target_brain: 'company', content: 'decision' }],
    ['get_brain_stats', { scope: 'agent', agent_id: 'vibey' }],
  ])('keeps non-personal organization route %s available to Slack teammates', (action, data) => {
    expect(
      authorizeChannelPrincipalAction({
        target: target(false),
        action,
        data,
        sessionKey: 'agent:vibey:conversation-1',
      }),
    ).toEqual({ allowed: true })
  })

  it('keeps Personal Brain actions available to the Slack connection owner', () => {
    expect(
      authorizeChannelPrincipalAction({
        target: target(true),
        action: 'search_user_brain',
        data: { query: 'my private context' },
        sessionKey: 'agent:vibey:conversation-1',
      }),
    ).toEqual({ allowed: true })
  })
})
