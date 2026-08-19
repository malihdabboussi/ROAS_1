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
      getChannelHistorySince: vi
        .fn()
        .mockImplementation(async (_token: string, channelId: string) => {
          if (channelId === 'C1') {
            return [
              { text: 'Webinar update posted for Christian', user: 'U1', ts: '1.1' },
              { text: 'Unrelated note', user: 'U2', ts: '1.0' },
            ]
          }
          return [{ text: 'hello', user: 'U3', ts: '2.0' }]
        }),
      getChannelHistory: vi.fn(),
      conversationsRepliesAll: vi.fn(),
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
    expect(result.coverage).toEqual({
      status: 'complete',
      results_returned: 1,
      total_available: 1,
    })
  })
})

describe('SlackAgentToolsService searchMessages client scope', () => {
  const YASIR_CLIENT = 'b17dcee8-2516-4318-aecc-1f7f449dfb92'
  const YASIR_CAMPAIGN = 'bad92814-a1cb-4b66-ba92-66dd02dc42e1'

  function createClientSupabase(rows: Record<string, unknown[]>) {
    const from = (table: string) => {
      const builder: Record<string, unknown> = {}
      for (const method of [
        'select',
        'eq',
        'is',
        'in',
        'or',
        'gte',
        'ilike',
        'not',
        'order',
        'limit',
      ]) {
        builder[method] = () => builder
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) =>
        Promise.resolve({ data: rows[table] ?? [], error: null }).then(onFulfilled)
      return builder
    }
    return { from } as never
  }

  const yasirRows = {
    slack_observation_events: [
      {
        channel_id: 'C0B5MKP7Y30',
        channel_name: 'roas-yasir-khan-coaching-ltd-955',
        metadata: {
          page_grader_client_id: YASIR_CLIENT,
          page_grader_client_name: 'Yasir Khan Coaching LTD',
          roas_campaign_id: YASIR_CAMPAIGN,
        },
      },
    ],
    slack_brain_mappings: [
      {
        slack_channel_id: 'C0B5MKP7Y30',
        slack_channel_name: 'roas-yasir-khan-coaching-ltd-955',
        target_campaign_id: YASIR_CAMPAIGN,
        target_brain_id: 'brain-yasir',
      },
    ],
    campaigns: [{ id: YASIR_CAMPAIGN, name: 'Yasir Khan Coaching LTD' }],
    ns_brains: [{ id: 'brain-yasir', campaign_id: YASIR_CAMPAIGN }],
    spaces: [],
  }

  it('scopes a client_id search to the client channel and names it (Yasir Aug 6 stats from a DM)', async () => {
    const slackApi = {
      searchMessages: vi.fn().mockResolvedValue({
        ok: true,
        messages: {
          total: 1,
          matches: [
            {
              text: 'Aug 6 webinar: 412 registrants, 188 live, 31 applications',
              ts: '1754500000.000100',
              channel: { id: 'C0B5MKP7Y30', name: 'roas-yasir-khan-coaching-ltd-955' },
            },
          ],
        },
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

    const result = await service.searchMessages(
      createClientSupabase(yasirRows),
      'user-1',
      'org-1',
      {
        query: 'webinar stats Aug 6',
        client_id: YASIR_CLIENT,
      },
    )

    expect(slackApi.searchMessages).toHaveBeenCalledTimes(1)
    expect(slackApi.searchMessages.mock.calls[0][1]).toBe(
      'webinar stats Aug 6 in:#roas-yasir-khan-coaching-ltd-955',
    )
    expect(result.search_mode).toBe('client_scoped')
    expect(result.client_context).toMatchObject({
      client_id: YASIR_CLIENT,
      client_name: 'Yasir Khan Coaching LTD',
      campaign_brain_ids: ['brain-yasir'],
      slack_channels: [{ id: 'C0B5MKP7Y30', name: 'roas-yasir-khan-coaching-ltd-955' }],
    })
    expect(result.channels_searched).toEqual([
      expect.objectContaining({
        channel: { id: 'C0B5MKP7Y30', name: 'roas-yasir-khan-coaching-ltd-955' },
        matches: 1,
      }),
    ])
    expect(result.coverage.status).toBe('complete')
    expect(result.messages.matches[0]).toMatchObject({
      text: expect.stringContaining('412 registrants'),
      channel: { id: 'C0B5MKP7Y30', name: 'roas-yasir-khan-coaching-ltd-955' },
    })
  })

  it('resolves client_name from a DM and searches with explicit channel_ids too', async () => {
    const slackApi = {
      searchMessages: vi.fn().mockResolvedValue({ ok: true, messages: { total: 0, matches: [] } }),
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

    const result = await service.searchMessages(
      createClientSupabase(yasirRows),
      'user-1',
      'org-1',
      {
        query: 'stats',
        client_name: 'Yasir',
        channel_ids: 'C0B5MKP7Y30,CEXTRA',
      },
    )

    const queries = slackApi.searchMessages.mock.calls.map((call) => call[1])
    expect(queries).toEqual(['stats in:#roas-yasir-khan-coaching-ltd-955', 'stats in:CEXTRA'])
    expect(result.channels_searched).toHaveLength(2)
    expect(result.coverage.status).toBe('complete')
  })

  it('never widens to the whole workspace when the client has no mapped channel', async () => {
    const slackApi = {
      searchMessages: vi.fn(),
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

    const result = await service.searchMessages(
      createClientSupabase({
        slack_observation_events: [],
        slack_brain_mappings: [],
        campaigns: [{ id: 'camp-new', name: 'Brand New Client' }],
        ns_brains: [],
        spaces: [],
      }),
      'user-1',
      'org-1',
      { query: 'stats', client_name: 'Brand New' },
    )

    expect(slackApi.searchMessages).not.toHaveBeenCalled()
    expect(result.coverage).toMatchObject({
      status: 'partial',
      reason: 'client_has_no_mapped_slack_channel',
    })
    expect(result.agent_instruction).toContain('Do not report the message as absent')
  })

  it('leaves an explicit in:#channel query untouched even with client_id', async () => {
    const slackApi = {
      searchMessages: vi.fn().mockResolvedValue({ ok: true, messages: { total: 0, matches: [] } }),
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
    const result = await service.searchMessages(
      createClientSupabase(yasirRows),
      'user-1',
      'org-1',
      {
        query: 'stats in:#roas-yasir-khan-coaching-ltd-955',
        client_id: YASIR_CLIENT,
      },
    )
    expect(slackApi.searchMessages.mock.calls[0][1]).toBe(
      'stats in:#roas-yasir-khan-coaching-ltd-955',
    )
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
      coverage: {
        status: 'complete',
        oldest: null,
        latest: null,
        next_cursor: null,
        has_more: false,
      },
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
