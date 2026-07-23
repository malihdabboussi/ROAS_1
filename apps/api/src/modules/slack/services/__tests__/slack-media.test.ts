import { describe, expect, it, vi } from 'vitest'
import { SlackRuntimeRepository } from '../../repositories/slack-runtime.repository'
import { SlackRepository } from '../../repositories/slack.repository'
import { SlackSenderResolverService } from '../slack-sender-resolver.service'
import { SlackService } from '../slack.service'

function buildMockSlackApi() {
  return {
    verifyRequestSignature: vi.fn(),
    oauthAccess: vi.fn(),
    listConversations: vi.fn(),
    postMessage: vi.fn().mockResolvedValue({ ok: true }),
    postBlockMessage: vi.fn().mockResolvedValue({ ok: true }),
    getFileInfo: vi.fn(),
    downloadFile: vi
      .fn()
      .mockResolvedValue({ buffer: Buffer.from('fake'), contentType: 'image/png' }),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    listUsers: vi.fn(),
    getUserInfo: vi.fn(),
    getChannelHistory: vi.fn(),
    openDmChannel: vi.fn(),
  }
}

function buildMockRepo() {
  return {
    saveIntegration: vi.fn(),
    getIntegration: vi.fn(),
    findChannelByAgentKey: vi.fn(),
    findActiveChannelByTeamAndChannel: vi.fn(),
    findFallbackChannelByTeam: vi.fn(),
    createChannel: vi.fn(),
    updateChannel: vi.fn(),
    deleteChannel: vi.fn(),
    listChannelsByUser: vi.fn(),
    setPublic: vi.fn(),
    touchLastMessage: vi.fn(),
    updateIntegrationMetadata: vi.fn(),
  }
}

function createService(overrides: { slackApi?: ReturnType<typeof buildMockSlackApi> } = {}) {
  const api = overrides.slackApi ?? buildMockSlackApi()
  const repo = buildMockRepo()
  const runtimeRepo = new SlackRuntimeRepository()
  const config = { get: vi.fn() }
  const channelToken = { mintAccessToken: vi.fn().mockResolvedValue('tok') }
  const documentExtraction = { extractText: vi.fn().mockResolvedValue('') }
  const userAgentApi = { invoke: vi.fn() }
  const accessControl = { authorize: vi.fn() }
  const svc = new (SlackService as any)(
    api,
    repo,
    runtimeRepo,
    config,
    channelToken,
    documentExtraction,
    userAgentApi,
    accessControl,
    {},
  )
  return { svc: svc as SlackService, api, repo, channelToken }
}

function createThenableQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    neq: vi.fn(() => query),
    contains: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: Record<string, unknown>) => unknown) =>
      Promise.resolve(resolve(result)),
  }
  return query
}

describe('SlackService media helpers', () => {
  describe('resolveInboundSlackFiles', () => {
    it('downloads and re-uploads files from url_private', async () => {
      const { svc, api } = createService()
      vi.spyOn(svc as any, 'uploadSlackMediaToStorage').mockResolvedValue(
        'https://storage.example.com/img.png',
      )

      const files = [
        {
          id: 'F1',
          name: 'screenshot.png',
          mimetype: 'image/png',
          size: 1024,
          url_private: 'https://files.slack.com/F1',
        },
      ]

      const result = await (svc as any).resolveInboundSlackFiles('xoxb-token', 'user1', null, files)
      expect(api.downloadFile).toHaveBeenCalledWith('xoxb-token', 'https://files.slack.com/F1')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('image')
      expect(result[0].fileUrl).toBe('https://storage.example.com/img.png')
      expect(result[0].filename).toBe('screenshot.png')
    })

    it('resolves video files as type video', async () => {
      const { svc } = createService()
      vi.spyOn(svc as any, 'uploadSlackMediaToStorage').mockResolvedValue(
        'https://storage.example.com/vid.mp4',
      )

      const files = [
        {
          id: 'F2',
          name: 'clip.mp4',
          mimetype: 'video/mp4',
          size: 5000,
          url_private: 'https://files.slack.com/F2',
        },
      ]

      const result = await (svc as any).resolveInboundSlackFiles('xoxb-token', 'user1', null, files)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('video')
    })

    it('resolves documents as type text', async () => {
      const { svc } = createService()
      vi.spyOn(svc as any, 'uploadSlackMediaToStorage').mockResolvedValue(
        'https://storage.example.com/doc.pdf',
      )

      const files = [
        {
          id: 'F3',
          name: 'report.pdf',
          mimetype: 'application/pdf',
          size: 2000,
          url_private: 'https://files.slack.com/F3',
        },
      ]

      const result = await (svc as any).resolveInboundSlackFiles('xoxb-token', 'user1', null, files)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('text')
      expect(result[0].filename).toBe('report.pdf')
    })

    it('handles multiple files', async () => {
      const { svc } = createService()
      let callCount = 0
      vi.spyOn(svc as any, 'uploadSlackMediaToStorage').mockImplementation(async () => {
        callCount++
        return `https://storage.example.com/file${callCount}.png`
      })

      const files = [
        {
          id: 'F1',
          name: 'a.png',
          mimetype: 'image/png',
          size: 100,
          url_private: 'https://files.slack.com/F1',
        },
        {
          id: 'F2',
          name: 'b.jpg',
          mimetype: 'image/jpeg',
          size: 200,
          url_private: 'https://files.slack.com/F2',
        },
      ]

      const result = await (svc as any).resolveInboundSlackFiles('xoxb-token', 'user1', null, files)
      expect(result).toHaveLength(2)
    })

    it('returns empty for undefined files', async () => {
      const { svc } = createService()
      const result = await (svc as any).resolveInboundSlackFiles(
        'xoxb-token',
        'user1',
        null,
        undefined,
      )
      expect(result).toHaveLength(0)
    })

    it('skips files without url_private', async () => {
      const { svc } = createService()
      const files = [{ id: 'F1', name: 'orphan.png', mimetype: 'image/png', size: 100 }]
      const result = await (svc as any).resolveInboundSlackFiles('xoxb-token', 'user1', null, files)
      expect(result).toHaveLength(0)
    })

    it('skips files over size limit', async () => {
      const { svc } = createService()
      const files = [
        {
          id: 'F1',
          name: 'huge.zip',
          mimetype: 'application/zip',
          size: 25 * 1024 * 1024,
          url_private: 'https://files.slack.com/F1',
        },
      ]
      const result = await (svc as any).resolveInboundSlackFiles('xoxb-token', 'user1', null, files)
      expect(result).toHaveLength(0)
    })

    it('handles download failure gracefully', async () => {
      const { svc, api } = createService()
      api.downloadFile.mockRejectedValue(new Error('network'))
      const files = [
        {
          id: 'F1',
          name: 'fail.png',
          mimetype: 'image/png',
          size: 100,
          url_private: 'https://files.slack.com/F1',
        },
      ]
      const result = await (svc as any).resolveInboundSlackFiles('xoxb-token', 'user1', null, files)
      expect(result).toHaveLength(0)
    })

    it('uploads inbound Slack media to private campaign storage and returns a signed URL', async () => {
      const { svc } = createService()
      const upload = vi.fn().mockResolvedValue({ error: null })
      const createSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://cdn.example.com/file.png?token=signed' },
        error: null,
      })
      const storageFrom = vi.fn(() => ({
        upload,
        createSignedUrl,
      }))
      vi.spyOn(svc as any, 'getServiceRoleClient').mockReturnValue({
        storage: { from: storageFrom },
      })

      const result = await (svc as any).uploadSlackMediaToStorage(
        Buffer.from('image'),
        'image/png',
        'user-1',
        'logo.png',
      )

      expect(storageFrom).toHaveBeenCalledWith('campaigns')
      expect(upload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-1\/slack\/.+-logo\.png$/),
        Buffer.from('image'),
        { contentType: 'image/png', upsert: false },
      )
      expect(createSignedUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^user-1\/slack\/.+-logo\.png$/),
        365 * 24 * 60 * 60,
      )
      expect(result).toBe('https://cdn.example.com/file.png?token=signed')
    })
  })

  describe('formatResponseAsBlocks (outbound media)', () => {
    it('converts markdown images to Slack image blocks', () => {
      const { svc } = createService()
      const text = 'Here is your logo:\n![logo](https://example.com/logo.png)'
      const { blocks } = (svc as any).formatResponseAsBlocks(text)
      const imageBlocks = blocks.filter((b: any) => b.type === 'image')
      expect(imageBlocks).toHaveLength(1)
      expect(imageBlocks[0].image_url).toBe('https://example.com/logo.png')
      expect(imageBlocks[0].alt_text).toBe('logo')
    })

    it('converts MEDIA: directive to image block for image URLs', () => {
      const { svc } = createService()
      const text = 'MEDIA:https://example.com/photo.jpg'
      const { blocks } = (svc as any).formatResponseAsBlocks(text)
      const imageBlocks = blocks.filter((b: any) => b.type === 'image')
      expect(imageBlocks).toHaveLength(1)
      expect(imageBlocks[0].image_url).toBe('https://example.com/photo.jpg')
    })

    it('converts MEDIA: directive to link for non-image URLs', () => {
      const { svc } = createService()
      const text = 'MEDIA:https://example.com/report.pdf'
      const { blocks } = (svc as any).formatResponseAsBlocks(text)
      const sectionBlocks = blocks.filter((b: any) => b.type === 'section')
      expect(sectionBlocks).toHaveLength(1)
      expect(sectionBlocks[0].text.text).toContain('Download file')
    })

    it('leaves plain text as section blocks', () => {
      const { svc } = createService()
      const text = 'Just some text, no media.'
      const { blocks } = (svc as any).formatResponseAsBlocks(text)
      const imageBlocks = blocks.filter((b: any) => b.type === 'image')
      expect(imageBlocks).toHaveLength(0)
      expect(blocks.length).toBeGreaterThan(0)
      expect(blocks[0].type).toBe('section')
    })

    it('handles mixed text and images', () => {
      const { svc } = createService()
      const text = 'Check this out:\n![chart](https://example.com/chart.png)\nWhat do you think?'
      const { blocks } = (svc as any).formatResponseAsBlocks(text)
      const imageBlocks = blocks.filter((b: any) => b.type === 'image')
      const sectionBlocks = blocks.filter((b: any) => b.type === 'section')
      expect(imageBlocks).toHaveLength(1)
      expect(sectionBlocks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('resolveFallbackRouting', () => {
    it('routes Slack fallback through the active channel org context', async () => {
      const { svc, repo, channelToken } = createService()
      repo.findFallbackChannelByTeam.mockResolvedValue({
        id: 'channel-org',
        user_id: 'owner-user',
        agent_key: 'vibey',
        channel_type: 'slack',
        provider_config: {
          team_id: 'T1',
          bot_token: 'xoxb-org',
        },
        webhook_secret: null,
        is_active: true,
        org_id: 'org-1',
        last_message_at: null,
        error_message: null,
        created_at: '',
        updated_at: '',
      })

      const result = await (svc as any).resolveFallbackRouting({} as any, 'T1')

      expect(repo.findFallbackChannelByTeam).toHaveBeenCalledWith({}, 'T1')
      expect(channelToken.mintAccessToken).toHaveBeenCalledWith('owner-user')
      expect(result).toEqual({
        userId: 'owner-user',
        agentKey: 'vibey',
        botToken: 'xoxb-org',
        accessToken: 'tok',
        orgId: 'org-1',
        ownerSlackUserId: null,
      })
    })
  })

  describe('repository-backed Slack orchestration seams', () => {
    it('disconnects the org-scoped Slack integration', async () => {
      const service = createServiceWithRepository()
      const updateQuery = createThenableQuery({ error: null })
      const supabase = {
        from: vi.fn(() => updateQuery),
      }

      await service.disconnect(supabase as never, 'user-1', 'org-1')

      expect(supabase.from).toHaveBeenCalledWith('user_integrations')
      expect(updateQuery.update).toHaveBeenCalledWith({ status: 'disconnected' })
      expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(updateQuery.eq).toHaveBeenCalledWith('integration_id', 'slack')
      expect(updateQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    })

    it('backfills a default campaign on an existing Slack conversation without one', async () => {
      const service = createServiceWithRepository()
      const conversationLookup = createThenableQuery({
        data: { id: 'conversation-1', campaign_id: null },
        error: null,
      })
      const campaignLookup = createThenableQuery({ data: { id: 'campaign-1' }, error: null })
      const conversationUpdate = createThenableQuery({ error: null })
      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'campaigns') return campaignLookup
          if (table === 'conversations') {
            return supabase.from.mock.calls.filter(([name]) => name === 'conversations').length ===
              1
              ? conversationLookup
              : conversationUpdate
          }
          throw new Error(`Unexpected table: ${table}`)
        }),
      }

      const result = await (service as any).getOrCreateSlackConversation(
        supabase,
        'user-1',
        'agent-1',
        'team-1',
        'channel-1',
        'thread-1',
        'org-1',
      )

      expect(result).toBe('conversation-1')
      expect(conversationUpdate.update).toHaveBeenCalledWith({ campaign_id: 'campaign-1' })
      expect(conversationUpdate.eq).toHaveBeenCalledWith('id', 'conversation-1')
    })
  })

  describe('SlackSenderResolverService', () => {
    it('maps Slack user email to active org member user id', async () => {
      const contactIdentifiers = {
        resolveByKind: vi.fn().mockResolvedValue(null),
        attachIdentifier: vi.fn(),
      }
      const slackApi = {
        listUsers: vi.fn().mockResolvedValue([
          {
            id: 'U1',
            name: 'ada',
            profile: { email: 'ada@example.com', display_name: 'Ada' },
          },
        ]),
        getUserInfo: vi.fn(),
      }
      const orgMembers = createThenableQuery({
        data: [{ user_id: 'vibey-user-1', profiles: { email: 'ada@example.com' } }],
        error: null,
      })
      const supabase = { from: vi.fn(() => orgMembers) }
      const runtimeRepository = {
        listActiveOrgMembersWithProfileEmails: vi
          .fn()
          .mockResolvedValue([{ user_id: 'vibey-user-1', profiles: { email: 'ada@example.com' } }]),
        listSlackIdentityState: vi.fn().mockResolvedValue([]),
        upsertResolvedSlackPerson: vi.fn(),
      }
      const resolver = new (SlackSenderResolverService as any)(
        contactIdentifiers,
        slackApi,
        runtimeRepository,
      ) as SlackSenderResolverService

      const result = await resolver.resolveSlackSenders(supabase as never, {
        botToken: 'xoxb',
        userId: 'owner-user',
        orgId: 'org-1',
        slackUserIds: ['U1'],
      })

      expect(result.get('U1')).toMatchObject({
        slackUserId: 'U1',
        displayName: 'Ada',
        email: 'ada@example.com',
        vibeyUserId: 'vibey-user-1',
      })
      expect(runtimeRepository.listActiveOrgMembersWithProfileEmails).toHaveBeenCalledWith(
        supabase,
        'org-1',
      )
      expect(runtimeRepository.upsertResolvedSlackPerson).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          platform_id: 'U1',
          vibey_user_id: 'vibey-user-1',
          relationship_kind: 'internal',
          identity_match_method: 'email',
        }),
      )
    })

    it('suggests one exact name match without silently attaching the portal identity', async () => {
      const contactIdentifiers = {
        resolveByKind: vi.fn().mockResolvedValue(null),
        attachIdentifier: vi.fn(),
      }
      const slackApi = {
        listUsers: vi.fn().mockResolvedValue([
          {
            id: 'U1',
            name: 'ada',
            profile: { display_name: 'Ada Lovelace' },
          },
        ]),
        getUserInfo: vi.fn(),
      }
      const runtimeRepository = {
        listActiveOrgMembersWithProfileEmails: vi.fn().mockResolvedValue([
          {
            user_id: 'vibey-user-1',
            profiles: { email: 'portal@example.com', full_name: 'Ada Lovelace' },
          },
        ]),
        listSlackIdentityState: vi.fn().mockResolvedValue([]),
        upsertResolvedSlackPerson: vi.fn(),
      }
      const resolver = new (SlackSenderResolverService as any)(
        contactIdentifiers,
        slackApi,
        runtimeRepository,
      ) as SlackSenderResolverService

      const result = await resolver.resolveSlackSenders({} as never, {
        botToken: 'xoxb',
        userId: 'owner-user',
        orgId: 'org-1',
        slackUserIds: ['U1'],
      })

      expect(result.get('U1')?.vibeyUserId).toBeNull()
      expect(runtimeRepository.upsertResolvedSlackPerson).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          vibey_user_id: null,
          suggested_vibey_user_id: 'vibey-user-1',
          identity_match_method: 'suggested_name',
          identity_match_confidence: 0.95,
        }),
      )
    })

    it('does not suggest an ambiguous exact name', async () => {
      const runtimeRepository = {
        listActiveOrgMembersWithProfileEmails: vi.fn().mockResolvedValue([
          { user_id: 'user-1', profiles: { full_name: 'Alex Smith' } },
          { user_id: 'user-2', profiles: { full_name: 'Alex Smith' } },
        ]),
        listSlackIdentityState: vi.fn().mockResolvedValue([]),
        upsertResolvedSlackPerson: vi.fn(),
      }
      const resolver = new (SlackSenderResolverService as any)(
        { resolveByKind: vi.fn().mockResolvedValue(null), attachIdentifier: vi.fn() },
        {
          listUsers: vi
            .fn()
            .mockResolvedValue([{ id: 'U1', profile: { display_name: 'Alex Smith' } }]),
          getUserInfo: vi.fn(),
        },
        runtimeRepository,
      ) as SlackSenderResolverService

      await resolver.resolveSlackSenders({} as never, {
        botToken: 'xoxb',
        userId: 'owner-user',
        orgId: 'org-1',
        slackUserIds: ['U1'],
      })

      expect(runtimeRepository.upsertResolvedSlackPerson).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          vibey_user_id: null,
          suggested_vibey_user_id: null,
          identity_match_method: 'none',
        }),
      )
    })
  })

  describe('agent error mapping', () => {
    it('maps machine wake errors to explicit user feedback', () => {
      const { svc } = createService()

      expect((svc as any).userFacingSlackError('User machine failed to start')).toBe(
        "I couldn't wake your agent this time. Try again in a minute.",
      )
      expect(
        (svc as any).userFacingSlackError(
          'Machine not ready (agent-api /api/ready did not return 200 in time)',
        ),
      ).toBe("Your agent started, but it wasn't ready in time. Try again in a minute.")
    })

    it('maps unknown errors to the new generic fallback', () => {
      const { svc } = createService()

      expect((svc as any).userFacingSlackError('unexpected')).toBe(
        "I couldn't process this message. Try again in a moment.",
      )
    })

    it('keeps old Vibey branding out of every user-facing Slack failure', () => {
      const { svc } = createService()
      const messages = [
        (svc as any).userFacingSlackError('credits_exhausted'),
        (svc as any).userFacingSlackError('Agent API returned 401 (token_expired)'),
        (svc as any).userFacingSlackError('unexpected'),
      ]

      expect(messages).toEqual([
        "I'm out of credits for this account. Add credits in the app, then send this again.",
        'Your Slack connection expired. Reconnect Slack in Settings to continue.',
        "I couldn't process this message. Try again in a moment.",
      ])
      expect(messages.join(' ')).not.toMatch(/vibey/i)
    })
  })
})

function createServiceWithRepository(): SlackService {
  const api = buildMockSlackApi()
  const repo = new SlackRepository()
  const runtimeRepo = new SlackRuntimeRepository()
  const config = { get: vi.fn() }
  const channelToken = { mintAccessToken: vi.fn().mockResolvedValue('tok') }
  const documentExtraction = { extractText: vi.fn().mockResolvedValue('') }
  const userAgentApi = { invoke: vi.fn() }
  const accessControl = { authorize: vi.fn() }
  return new (SlackService as any)(
    api,
    repo,
    runtimeRepo,
    config,
    channelToken,
    documentExtraction,
    userAgentApi,
    accessControl,
    {},
  ) as SlackService
}
