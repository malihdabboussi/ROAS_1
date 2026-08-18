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

function runtimeRepository(overrides: Record<string, unknown> = {}) {
  return {
    findAiDataAdminMembership: vi.fn().mockResolvedValue(null),
    recordAiDataAccessAudit: vi.fn().mockResolvedValue(undefined),
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
      runtimeRepository() as never,
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
      runtimeRepository() as never,
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
        runtimeRepository() as never,
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
      runtimeRepository() as never,
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
      runtimeRepository() as never,
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
      runtimeRepository() as never,
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
    const listConversationMembers = vi.fn().mockResolvedValue(['U_CONNECT', 'U_TEAM', 'B_APP'])
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
      { listConversationMembers } as never,
      resolver as never,
      runtimeRepository() as never,
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
    expect(listConversationMembers).not.toHaveBeenCalled()
    expect(resolver.resolveSlackSenders).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ slackUserIds: ['U_CONNECT'] }),
    )
  })

  it('allows an internal sender in a group DM that also contains a Slack Connect teammate', async () => {
    const listConversationMembers = vi.fn()
    const resolver = {
      resolveSlackSenders: vi.fn().mockResolvedValue(
        new Map([
          ['U_INTERNAL', sender()],
          ['U_CONNECT', sender({ slackUserId: 'U_CONNECT', relationshipKind: 'external' })],
        ]),
      ),
    }
    const service = new SlackAccessControlService(
      { listConversationMembers } as never,
      resolver as never,
      runtimeRepository() as never,
    )

    await expect(
      service.authorize({
        supabase: {} as never,
        botToken: 'xoxb',
        ownerUserId: 'owner-1',
        ownerSlackUserId: 'U_OWNER',
        orgId: 'org-1',
        slackUserId: 'U_INTERNAL',
        channelId: 'G_GROUP_DM',
        isDirectMessage: false,
      }),
    ).resolves.toMatchObject({ allowed: true })
    expect(listConversationMembers).not.toHaveBeenCalled()
  })

  it('grants same-organization data access to an explicitly enabled internal member', async () => {
    const resolver = {
      resolveSlackSenders: vi.fn().mockResolvedValue(
        new Map([['U_INTERNAL', sender({ vibeyUserId: 'user-1' })]]),
      ),
    }
    const repository = runtimeRepository({
      findAiDataAdminMembership: vi.fn().mockResolvedValue({
        id: 'membership-1',
        user_id: 'user-1',
        org_id: 'org-1',
        role: 'admin',
        status: 'active',
        ai_data_admin: true,
      }),
    })
    const service = new SlackAccessControlService(
      { listConversationMembers: vi.fn() } as never,
      resolver as never,
      repository as never,
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
      principal: { organizationWideDataAccess: true },
    })
    expect(repository.recordAiDataAccessAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        outcome: 'allowed',
        reason: 'organization_data_access_allowed',
      }),
    )
  })
})
