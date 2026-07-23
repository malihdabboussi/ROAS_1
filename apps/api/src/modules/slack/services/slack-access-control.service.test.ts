import { describe, expect, it, vi } from 'vitest'
import { SlackAccessControlService } from './slack-access-control.service'

function sender(overrides: Record<string, unknown> = {}) {
  return {
    slackUserId: 'U_INTERNAL',
    displayName: 'Internal Teammate',
    email: null,
    contactId: null,
    contactRole: null,
    qualifiesForCustomerBrain: false,
    vibeyUserId: null,
    personBrainId: 'brain-person-1',
    relationshipKind: 'internal',
    isBot: false,
    ...overrides,
  }
}

describe('SlackAccessControlService', () => {
  it('allows a manually mapped internal Slack-only user without granting owner personal Brain access', async () => {
    const resolver = {
      resolveSlackSenders: vi.fn().mockResolvedValue(new Map([['U_INTERNAL', sender()]])),
    }
    const service = new SlackAccessControlService(
      { listConversationMembers: vi.fn() } as never,
      resolver as never,
    )

    await expect(
      service.authorize({
        supabase: {} as never,
        botToken: 'xoxb',
        ownerUserId: 'owner-1',
        ownerSlackUserId: 'U_OWNER',
        orgId: 'org-1',
        slackUserId: 'U_INTERNAL',
        channelId: 'D_INTERNAL',
        isDirectMessage: true,
      }),
    ).resolves.toMatchObject({
      allowed: true,
      principal: {
        relationshipKind: 'internal',
        isConnectionOwner: false,
        personalBrainAccess: false,
      },
    })
  })

  it('recognizes the Slack installer as owner even without a linked platform identity', async () => {
    const resolver = {
      resolveSlackSenders: vi.fn().mockResolvedValue(
        new Map([
          [
            'U_OWNER',
            sender({
              slackUserId: 'U_OWNER',
              relationshipKind: 'external',
              vibeyUserId: null,
            }),
          ],
        ]),
      ),
    }
    const service = new SlackAccessControlService(
      { listConversationMembers: vi.fn() } as never,
      resolver as never,
    )

    await expect(
      service.authorize({
        supabase: {} as never,
        botToken: 'xoxb',
        ownerUserId: 'owner-1',
        ownerSlackUserId: 'U_OWNER',
        orgId: 'org-1',
        slackUserId: 'U_OWNER',
        channelId: 'D_OWNER',
        isDirectMessage: true,
      }),
    ).resolves.toMatchObject({
      allowed: true,
      principal: {
        isConnectionOwner: true,
        personalBrainAccess: true,
      },
    })
  })

  it.each(['external', 'ignored'])(
    'returns access denied for a %s person without invoking the agent',
    async (relationshipKind) => {
      const resolver = {
        resolveSlackSenders: vi.fn().mockResolvedValue(
          new Map([
            [
              'U_DENIED',
              sender({
                slackUserId: 'U_DENIED',
                relationshipKind,
              }),
            ],
          ]),
        ),
      }
      const service = new SlackAccessControlService(
        { listConversationMembers: vi.fn() } as never,
        resolver as never,
      )

      await expect(
        service.authorize({
          supabase: {} as never,
          botToken: 'xoxb',
          ownerUserId: 'owner-1',
          ownerSlackUserId: 'U_OWNER',
          orgId: 'org-1',
          slackUserId: 'U_DENIED',
          channelId: 'D_DENIED',
          isDirectMessage: true,
        }),
      ).resolves.toEqual({
        allowed: false,
        reason: 'sender_not_internal',
      })
    },
  )

  it('returns the short Manage People denial without invoking any agent path', async () => {
    const postMessage = vi.fn().mockResolvedValue(undefined)
    const resolver = {
      resolveSlackSenders: vi
        .fn()
        .mockResolvedValue(
          new Map([
            ['U_EXTERNAL', sender({ slackUserId: 'U_EXTERNAL', relationshipKind: 'external' })],
          ]),
        ),
    }
    const service = new SlackAccessControlService(
      { listConversationMembers: vi.fn(), postMessage } as never,
      resolver as never,
    )

    await expect(
      service.authorizeAndRespond({
        supabase: {} as never,
        botToken: 'xoxb',
        ownerUserId: 'owner-1',
        ownerSlackUserId: 'U_OWNER',
        orgId: 'org-1',
        slackUserId: 'U_EXTERNAL',
        channelId: 'D_EXTERNAL',
        isDirectMessage: true,
        threadTs: '123.4',
      }),
    ).resolves.toBeNull()

    expect(postMessage).toHaveBeenCalledWith(
      'xoxb',
      'D_EXTERNAL',
      "You don't have access to Pixel yet. Ask a ROAS admin to update you in Manage People.",
      '123.4',
    )
  })

  it('fails closed when sender identity cannot be resolved', async () => {
    const resolver = {
      resolveSlackSenders: vi.fn().mockRejectedValue(new Error('Slack API unavailable')),
    }
    const service = new SlackAccessControlService(
      { listConversationMembers: vi.fn() } as never,
      resolver as never,
    )

    await expect(
      service.authorize({
        supabase: {} as never,
        botToken: 'xoxb',
        ownerUserId: 'owner-1',
        ownerSlackUserId: 'U_OWNER',
        orgId: 'org-1',
        slackUserId: 'U_UNKNOWN',
        channelId: 'D_UNKNOWN',
        isDirectMessage: true,
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'identity_unavailable',
    })
  })

  it('returns a temporary verification message when identity lookup fails', async () => {
    const postMessage = vi.fn().mockResolvedValue(undefined)
    const resolver = {
      resolveSlackSenders: vi.fn().mockRejectedValue(new Error('Slack API unavailable')),
    }
    const service = new SlackAccessControlService(
      { listConversationMembers: vi.fn(), postMessage } as never,
      resolver as never,
    )

    await expect(
      service.authorizeAndRespond({
        supabase: {} as never,
        botToken: 'xoxb',
        ownerUserId: 'owner-1',
        ownerSlackUserId: 'U_OWNER',
        orgId: 'org-1',
        slackUserId: 'U_UNKNOWN',
        channelId: 'D_UNKNOWN',
        isDirectMessage: true,
        threadTs: '123.4',
      }),
    ).resolves.toBeNull()

    expect(postMessage).toHaveBeenCalledWith(
      'xoxb',
      'D_UNKNOWN',
      "I couldn't verify Slack access right now. Try again in a moment.",
      '123.4',
    )
  })

  it('allows an internal Slack Connect person when Manage People classifies every human channel member as internal', async () => {
    const resolver = {
      resolveSlackSenders: vi.fn().mockResolvedValue(
        new Map([
          ['U_CONNECT', sender({ slackUserId: 'U_CONNECT' })],
          ['U_TEAM', sender({ slackUserId: 'U_TEAM' })],
          ['B_APP', sender({ slackUserId: 'B_APP', relationshipKind: 'external', isBot: true })],
        ]),
      ),
    }
    const service = new SlackAccessControlService(
      {
        listConversationMembers: vi.fn().mockResolvedValue(['U_CONNECT', 'U_TEAM', 'B_APP']),
      } as never,
      resolver as never,
    )

    await expect(
      service.authorize({
        supabase: {} as never,
        botToken: 'xoxb',
        ownerUserId: 'owner-1',
        ownerSlackUserId: 'U_OWNER',
        orgId: 'org-1',
        slackUserId: 'U_CONNECT',
        channelId: 'C_CONNECT',
        isDirectMessage: false,
      }),
    ).resolves.toMatchObject({ allowed: true })
  })

  it('denies an otherwise internal sender in a channel containing an external person', async () => {
    const resolver = {
      resolveSlackSenders: vi.fn().mockResolvedValue(
        new Map([
          ['U_INTERNAL', sender()],
          ['U_CLIENT', sender({ slackUserId: 'U_CLIENT', relationshipKind: 'external' })],
        ]),
      ),
    }
    const service = new SlackAccessControlService(
      { listConversationMembers: vi.fn().mockResolvedValue(['U_INTERNAL', 'U_CLIENT']) } as never,
      resolver as never,
    )

    await expect(
      service.authorize({
        supabase: {} as never,
        botToken: 'xoxb',
        ownerUserId: 'owner-1',
        ownerSlackUserId: 'U_OWNER',
        orgId: 'org-1',
        slackUserId: 'U_INTERNAL',
        channelId: 'C_CLIENT',
        isDirectMessage: false,
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'channel_not_internal',
    })
  })
})
