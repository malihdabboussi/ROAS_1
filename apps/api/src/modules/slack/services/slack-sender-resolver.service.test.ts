import { describe, expect, it, vi } from 'vitest'
import { SlackSenderResolverService } from './slack-sender-resolver.service'

describe('SlackSenderResolverService', () => {
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
