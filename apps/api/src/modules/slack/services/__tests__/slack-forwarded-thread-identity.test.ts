import { describe, expect, it, vi } from 'vitest'
import { SlackConversationBase } from '../slack-service-conversation.base'
import { createSupabaseQueryMock, type SupabaseMockCall } from './supabase-query-mock'

const ONE_DS_CHANNEL = 'C0B6E0K3P53'
const ONE_DS_CLIENT = 'ca82655a-b360-4ba4-8155-b0b26c2a81a6'
const ONE_DS_CAMPAIGN = '71c1141d-ba07-426b-85fe-748269b39cb1'

class TestConversation extends SlackConversationBase {
  constructor(slackApi: Record<string, unknown>) {
    super(
      slackApi as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )
  }

  forwarded(supabase: never, attachments: never, currentChannelId: string) {
    return this.buildForwardedMessageContext(
      supabase,
      'user-1',
      'xoxb',
      currentChannelId,
      attachments,
      {
        orgId: 'org-1',
        slackTeamId: 'T1',
      },
    )
  }
}

const byChannel = (calls: SupabaseMockCall[]) =>
  calls.find((call) => call.method === 'eq' && call.args[0] === 'channel_id')?.args[1]
const byName = (calls: SupabaseMockCall[]) =>
  calls.find((call) => call.method === 'eq' && call.args[0] === 'channel_name')?.args[1]

const ONE_DS_EVENT = {
  channel_id: ONE_DS_CHANNEL,
  channel_name: 'roas-1ds-collective-llc-939',
  metadata: {
    page_grader_client_id: ONE_DS_CLIENT,
    page_grader_client_name: '1DS Collective LLC',
    roas_campaign_id: ONE_DS_CAMPAIGN,
    roas_campaign_name: '1DS Collective LLC',
  },
}

function oneDsWorkspace() {
  return createSupabaseQueryMock({
    slack_observation_channels: (calls) =>
      byName(calls) === 'roas-1ds-collective-llc-939' || byChannel(calls) === ONE_DS_CHANNEL
        ? [{ channel_id: ONE_DS_CHANNEL, channel_name: 'roas-1ds-collective-llc-939' }]
        : [],
    slack_observation_events: (calls) => {
      const channel = byChannel(calls)
      if (channel) return channel === ONE_DS_CHANNEL ? [ONE_DS_EVENT] : []
      return [ONE_DS_EVENT]
    },
    slack_brain_mappings: [
      {
        slack_channel_id: ONE_DS_CHANNEL,
        slack_channel_name: 'roas-1ds-collective-llc-939',
        target_campaign_id: ONE_DS_CAMPAIGN,
        target_brain_id: 'brain-1ds',
      },
    ],
    campaigns: [{ id: ONE_DS_CAMPAIGN, name: '1DS Collective LLC' }],
    ns_brains: [{ id: 'brain-1ds', campaign_id: ONE_DS_CAMPAIGN }],
    spaces: [],
  })
}

describe('forwarded thread reply → client identity (N1 quote inherit)', () => {
  it('footer-only thread reply from #roas-1ds… resolves the channel, stamps 1DS, and loads the thread', async () => {
    const slackApi = {
      listConversations: vi.fn(async () => []),
      getConversationName: vi.fn(async () => null),
      conversationsRepliesAll: vi.fn(async () => [
        {
          ts: '1784913800.000100',
          user: 'UANDY',
          text: 'Can we get the VSL redirect live before Monday?',
        },
        {
          ts: '1784913900.000200',
          user: 'UKRISTA',
          text: 'Andy wants the new VSL redirect live before Monday',
        },
      ]),
      getChannelHistory: vi.fn(async () => []),
    }
    const service = new TestConversation(slackApi)
    const { client } = oneDsWorkspace()

    const { context: text, campaignId } = await service.forwarded(
      client,
      [
        {
          is_msg_unfurl: true,
          author_name: 'Krista',
          text: 'Andy wants the new VSL redirect live before Monday',
          from_url: 'https://1ds.slack.com/archives/p1784913900000200?thread_ts=1784913800.000100',
          footer: 'From a thread in #roas-1ds-collective-llc-939',
        },
      ] as never,
      'D0DYLAN',
    )

    expect(campaignId).toBe(ONE_DS_CAMPAIGN)
    expect(text).toContain('[Forwarded Slack message]')
    expect(text).toContain('[Quoted message identity]')
    expect(text).toContain(`Resolved ROAS Portal client: 1DS Collective LLC (id=${ONE_DS_CLIENT})`)
    expect(text).toContain('Do not ask which client')
    expect(text).toContain('[Client context]')
    expect(text).toContain('Slack channels: #roas-1ds-collective-llc-939 (C0B6E0K3P53)')
    expect(text).toContain('[Forwarded thread context]')
    expect(text).toContain('Can we get the VSL redirect live before Monday?')
    expect(slackApi.conversationsRepliesAll).toHaveBeenCalledWith(
      'xoxb',
      ONE_DS_CHANNEL,
      '1784913800.000100',
    )
  })

  it('forward inside the same client channel does not restamp or reload the channel', async () => {
    const slackApi = {
      listConversations: vi.fn(async () => []),
      getConversationName: vi.fn(async () => null),
      conversationsRepliesAll: vi.fn(async () => []),
      getChannelHistory: vi.fn(async () => []),
    }
    const service = new TestConversation(slackApi)
    const { client } = oneDsWorkspace()
    const { context: text } = await service.forwarded(
      client,
      [
        {
          is_msg_unfurl: true,
          text: 'quoted',
          from_url: `https://roas.slack.com/archives/${ONE_DS_CHANNEL}/p1784913900000200`,
          footer: 'Posted in #roas-1ds-collective-llc-939',
        },
      ] as never,
      ONE_DS_CHANNEL,
    )
    expect(text).toContain('[Forwarded Slack message]')
    expect(text).not.toContain('[Quoted message identity]')
    expect(slackApi.getChannelHistory).not.toHaveBeenCalled()
  })
})
