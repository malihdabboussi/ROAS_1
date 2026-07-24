import { describe, expect, it, vi } from 'vitest'
import { SlackAgentToolsService } from './slack-agent-tools.service'

describe('SlackAgentToolsService upload asset refs', () => {
  it('returns an external asset_ref for files uploaded to Slack', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn(async () => Buffer.from('slack-file').buffer),
      }),
    )
    const slackApi = {
      uploadExternalFileToChannel: vi
        .fn()
        .mockResolvedValue({ file_id: 'F123', permalink: 'https://slack.example/F123' }),
    }
    const slackRepo = {
      getIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb-token' }),
    }
    const service = new SlackAgentToolsService(slackApi as never, slackRepo as never)

    await expect(
      service.uploadFile({} as never, 'user-1', 'org-1', {
        channel_id: 'C123',
        file_url: 'https://cdn.example/report.pdf',
        filename: 'report.pdf',
      }),
    ).resolves.toMatchObject({
      success: true,
      asset_ref: {
        kind: 'external_asset',
        provider: 'slack',
        external_id: 'F123',
        name: 'report.pdf',
        url: 'https://slack.example/F123',
        org_id: 'org-1',
      },
    })
  })
})

describe('SlackAgentToolsService searchMessages', () => {
  it('falls back to channel history when only a bot token exists', async () => {
    const slackApi = {
      searchMessages: vi.fn(),
      listConversations: vi.fn().mockResolvedValue([
        { id: 'C1', name: 'client-christian' },
        { id: 'C2', name: 'general' },
      ]),
      getChannelHistory: vi.fn().mockImplementation(async (_token: string, channelId: string) => {
        if (channelId === 'C1') {
          return [
            { text: 'Webinar update posted for Christian', user: 'U1', ts: '1.1' },
            { text: 'Unrelated note', user: 'U2', ts: '1.0' },
          ]
        }
        return [{ text: 'hello', user: 'U3', ts: '2.0' }]
      }),
    }
    const slackRepo = {
      getIntegration: vi.fn().mockResolvedValue({
        access_token: 'xoxb-bot',
        metadata: {},
      }),
    }
    const service = new SlackAgentToolsService(slackApi as never, slackRepo as never)

    const result = await service.searchMessages({} as never, 'user-1', 'org-1', {
      query: 'in:#client-christian webinar',
      count: 10,
    })

    expect(slackApi.searchMessages).not.toHaveBeenCalled()
    expect(result.search_mode).toBe('channel_history_fallback')
    expect(result.messages?.matches).toEqual([
      expect.objectContaining({
        text: 'Webinar update posted for Christian',
        channel: { id: 'C1', name: 'client-christian' },
      }),
    ])
  })

  it('uses user token for native search.messages when available', async () => {
    const slackApi = {
      searchMessages: vi.fn().mockResolvedValue({
        ok: true,
        messages: { total: 1, matches: [{ text: 'from search api', channel: { id: 'C9' } }] },
      }),
      listConversations: vi.fn(),
      getChannelHistory: vi.fn(),
    }
    const slackRepo = {
      getIntegration: vi.fn().mockResolvedValue({
        access_token: 'xoxb-bot',
        metadata: { user_access_token: 'xoxp-user' },
      }),
    }
    const service = new SlackAgentToolsService(slackApi as never, slackRepo as never)

    const result = await service.searchMessages({} as never, 'user-1', null, {
      query: 'christian update',
    })

    expect(slackApi.searchMessages).toHaveBeenCalledWith(
      'xoxp-user',
      'christian update',
      expect.any(Object),
    )
    expect(slackApi.listConversations).not.toHaveBeenCalled()
    expect(result.search_mode).toBe('search_messages')
  })
})

describe('SlackAgentToolsService getChannelHistory', () => {
  it('returns the canonical Slack channel identity with its messages', async () => {
    const slackApi = {
      listConversations: vi
        .fn()
        .mockResolvedValue([
          { id: 'C09SMEE0SF3', name: 'roas-wholesale-universe', is_private: true },
        ]),
      getChannelHistory: vi
        .fn()
        .mockResolvedValue([{ text: 'new VSL redirect', user: 'U1', ts: '1.1' }]),
    }
    const slackRepo = {
      getIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb-bot' }),
    }
    const service = new SlackAgentToolsService(slackApi as never, slackRepo as never)

    await expect(
      service.getChannelHistory({} as never, 'user-1', 'org-1', {
        channel_id: 'C09SMEE0SF3',
      }),
    ).resolves.toEqual({
      success: true,
      channel: {
        id: 'C09SMEE0SF3',
        name: 'roas-wholesale-universe',
        is_private: true,
      },
      identity_verified: true,
      messages: [{ text: 'new VSL redirect', user: 'U1', ts: '1.1' }],
    })
  })
})

describe('SlackAgentToolsService openDm', () => {
  it('opens a multi-person DM and returns friendly participant names', async () => {
    const slackApi = {
      openDmChannel: vi.fn().mockResolvedValue('G123'),
      getUserInfo: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'U-DYLAN',
          name: 'dylan',
          profile: { display_name: 'Dylan Vanas' },
        })
        .mockResolvedValueOnce({
          id: 'U-BETTY',
          name: 'betty',
          profile: { real_name: 'Betty' },
        }),
    }
    const slackRepo = {
      getIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb-token' }),
    }
    const service = new SlackAgentToolsService(slackApi as never, slackRepo as never)

    await expect(
      service.openDm({} as never, 'user-1', 'org-1', {
        slack_user_ids: ['U-DYLAN', 'U-BETTY'],
      }),
    ).resolves.toEqual({
      success: true,
      channel_id: 'G123',
      conversation_type: 'group_dm',
      participants: [
        { slack_user_id: 'U-DYLAN', display_name: 'Dylan Vanas' },
        { slack_user_id: 'U-BETTY', display_name: 'Betty' },
      ],
    })
    expect(slackApi.openDmChannel).toHaveBeenCalledWith('xoxb-token', 'U-DYLAN,U-BETTY')
  })

  it('preserves the legacy single-user input while resolving its display name', async () => {
    const slackApi = {
      openDmChannel: vi.fn().mockResolvedValue('D123'),
      getUserInfo: vi.fn().mockResolvedValue({
        id: 'U-BETTY',
        name: 'betty',
        real_name: 'Betty D/S',
      }),
    }
    const slackRepo = {
      getIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb-token' }),
    }
    const service = new SlackAgentToolsService(slackApi as never, slackRepo as never)

    await expect(
      service.openDm({} as never, 'user-1', 'org-1', {
        slack_user_id: 'U-BETTY',
      }),
    ).resolves.toEqual({
      success: true,
      channel_id: 'D123',
      conversation_type: 'dm',
      participants: [{ slack_user_id: 'U-BETTY', display_name: 'Betty D/S' }],
    })
  })
})
