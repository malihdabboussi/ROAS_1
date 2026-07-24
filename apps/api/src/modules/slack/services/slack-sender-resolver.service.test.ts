import { describe, expect, it, vi } from 'vitest'
import { SlackSenderResolverService } from './slack-sender-resolver.service'

describe('SlackSenderResolverService', () => {
  it('inherits a manual relationship across Slack accounts linked to the same portal person', async () => {
    const contactIdentifiers = {
      resolveByKind: vi.fn().mockResolvedValue(null),
      attachIdentifier: vi.fn(),
    }
    const slackApi = {
      listUsers: vi.fn().mockResolvedValue([
        {
          id: 'U_BRICE_CONNECT',
          name: 'bryce',
          is_restricted: true,
          profile: { display_name: 'Bryce' },
        },
      ]),
    }
    const runtime = {
      listSlackIdentityState: vi.fn().mockResolvedValue([
        {
          platform_id: 'U_BRICE_CONNECT',
          vibey_user_id: 'portal-bryce',
          contact_id: null,
          person_brain_id: null,
          relationship_kind: 'external',
          relationship_source: 'inferred',
          identity_match_method: 'email',
        },
      ]),
      listLinkedSlackIdentityState: vi.fn().mockResolvedValue([
        {
          platform_id: 'U_BRICE_PRIMARY',
          vibey_user_id: 'portal-bryce',
          contact_id: null,
          person_brain_id: null,
          relationship_kind: 'internal',
          relationship_source: 'manual',
          identity_match_method: 'email',
        },
      ]),
      upsertResolvedSlackPerson: vi.fn().mockResolvedValue(undefined),
      listActiveOrgMembersWithProfileEmails: vi.fn().mockResolvedValue([]),
    }
    const service = new SlackSenderResolverService(
      contactIdentifiers as never,
      slackApi as never,
      runtime as never,
    )

    const result = await service.resolveSlackSenders({} as never, {
      botToken: 'xoxb',
      userId: 'owner-1',
      orgId: 'org-1',
      slackUserIds: ['U_BRICE_CONNECT'],
    })

    expect(result.get('U_BRICE_CONNECT')?.relationshipKind).toBe('internal')
    expect(result.get('U_BRICE_CONNECT')?.vibeyUserId).toBe('portal-bryce')
    expect(runtime.upsertResolvedSlackPerson).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        platform_id: 'U_BRICE_CONNECT',
        relationship_kind: 'internal',
        relationship_source: 'manual',
      }),
    )
  })

  it('does not inherit trust from another Slack account by display name alone', async () => {
    const contactIdentifiers = {
      resolveByKind: vi.fn().mockResolvedValue(null),
      attachIdentifier: vi.fn(),
    }
    const slackApi = {
      listUsers: vi.fn().mockResolvedValue([
        {
          id: 'U_UNKNOWN_CONNECT',
          name: 'bryce',
          is_restricted: true,
          profile: { display_name: 'Bryce' },
        },
      ]),
    }
    const runtime = {
      listSlackIdentityState: vi.fn().mockResolvedValue([]),
      listLinkedSlackIdentityState: vi.fn().mockResolvedValue([]),
      upsertResolvedSlackPerson: vi.fn().mockResolvedValue(undefined),
      listActiveOrgMembersWithProfileEmails: vi.fn().mockResolvedValue([]),
    }
    const service = new SlackSenderResolverService(
      contactIdentifiers as never,
      slackApi as never,
      runtime as never,
    )

    const result = await service.resolveSlackSenders({} as never, {
      botToken: 'xoxb',
      userId: 'owner-1',
      orgId: 'org-1',
      slackUserIds: ['U_UNKNOWN_CONNECT'],
    })

    expect(result.get('U_UNKNOWN_CONNECT')?.relationshipKind).toBe('external')
  })

  it('links a newly seen Slack Connect account through its portal email', async () => {
    const contactIdentifiers = {
      resolveByKind: vi.fn().mockResolvedValue(null),
      attachIdentifier: vi.fn(),
    }
    const slackApi = {
      listUsers: vi.fn().mockResolvedValue([
        {
          id: 'U_NEW_CONNECT',
          name: 'bryce',
          is_restricted: true,
          profile: { display_name: 'Bryce', email: 'bryce@example.com' },
        },
      ]),
    }
    const runtime = {
      listSlackIdentityState: vi.fn().mockResolvedValue([]),
      listLinkedSlackIdentityState: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            platform_id: 'U_BRICE_PRIMARY',
            vibey_user_id: 'portal-bryce',
            contact_id: null,
            person_brain_id: null,
            relationship_kind: 'internal',
            relationship_source: 'manual',
            identity_match_method: 'email',
          },
        ]),
      upsertResolvedSlackPerson: vi.fn().mockResolvedValue(undefined),
      listActiveOrgMembersWithProfileEmails: vi.fn().mockResolvedValue([
        {
          user_id: 'portal-bryce',
          profiles: { email: 'bryce@example.com', full_name: 'Bryce' },
        },
      ]),
    }
    const service = new SlackSenderResolverService(
      contactIdentifiers as never,
      slackApi as never,
      runtime as never,
    )

    const result = await service.resolveSlackSenders({} as never, {
      botToken: 'xoxb',
      userId: 'owner-1',
      orgId: 'org-1',
      slackUserIds: ['U_NEW_CONNECT'],
    })

    expect(result.get('U_NEW_CONNECT')).toEqual(
      expect.objectContaining({
        vibeyUserId: 'portal-bryce',
        relationshipKind: 'internal',
      }),
    )
  })

  it('maps each active Slack person to the visible channels they share with the bot', async () => {
    const contactIdentifiers = {
      resolveByKind: vi.fn().mockResolvedValue(null),
      attachIdentifier: vi.fn(),
    }
    const slackApi = {
      listUsers: vi.fn().mockResolvedValue([
        { id: 'U1', name: 'ada', profile: { display_name: 'Ada' } },
        { id: 'U2', name: 'client', profile: { display_name: 'Client One' } },
      ]),
      listConversations: vi.fn().mockResolvedValue([
        { id: 'C1', name: 'general' },
        { id: 'C2', name: 'client-acme' },
      ]),
      listConversationMembers: vi
        .fn()
        .mockResolvedValueOnce(['U1', 'U2'])
        .mockResolvedValueOnce(['U2']),
    }
    const runtime = {
      listSlackIdentityState: vi.fn().mockResolvedValue([
        {
          platform_id: 'U2',
          vibey_user_id: null,
          person_brain_id: 'brain-client-one',
          relationship_kind: 'external',
          relationship_source: 'manual',
          identity_match_method: 'none',
        },
      ]),
      listLinkedSlackIdentityState: vi.fn().mockResolvedValue([]),
      upsertResolvedSlackPerson: vi.fn().mockResolvedValue(undefined),
      listActiveOrgMembersWithProfileEmails: vi.fn().mockResolvedValue([]),
    }
    const service = new SlackSenderResolverService(
      contactIdentifiers as never,
      slackApi as never,
      runtime as never,
    )

    const result = await service.seedContactIdentifiersFromWorkspace({} as never, {
      botToken: 'xoxb',
      userId: 'owner-1',
      orgId: 'org-1',
    })

    expect(result.channelNamesByMember.get('U1')).toEqual(['general'])
    expect(result.channelNamesByMember.get('U2')).toEqual(['client-acme', 'general'])
    expect(result.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slackUserId: 'U2',
          personBrainId: 'brain-client-one',
          relationshipKind: 'external',
        }),
      ]),
    )
    expect(runtime.upsertResolvedSlackPerson).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        platform_id: 'U2',
        relationship_kind: 'external',
        relationship_source: 'manual',
      }),
    )
    expect(runtime.upsertResolvedSlackPerson).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        platform_id: 'U1',
        relationship_kind: 'external',
        relationship_source: 'inferred',
      }),
    )
  })
})
