import { describe, expect, it, vi } from 'vitest'
import { SlackAuthBase } from '../slack-service-auth.base'
import { createSupabaseQueryMock, type SupabaseMockCall } from './supabase-query-mock'

class TestSlackAuth extends SlackAuthBase {
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

  askContext(supabase: never, input: Parameters<SlackAuthBase['buildSlackAskContext']>[1]) {
    return this.buildSlackAskContext(supabase, input)
  }

  askContextResolved(
    supabase: never,
    input: Parameters<SlackAuthBase['resolveSlackAskContext']>[1],
  ) {
    return this.resolveSlackAskContext(supabase, input)
  }
}

const YASIR_CLIENT = 'b17dcee8-2516-4318-aecc-1f7f449dfb92'
const YASIR_CAMPAIGN = 'bad92814-a1cb-4b66-ba92-66dd02dc42e1'
const YASIR_EVENT = {
  channel_id: 'C0B5MKP7Y30',
  channel_name: 'roas-yasir-khan-coaching-ltd-955',
  metadata: {
    page_grader_client_id: YASIR_CLIENT,
    page_grader_client_name: 'Yasir Khan Coaching LTD',
    roas_campaign_id: YASIR_CAMPAIGN,
    roas_campaign_name: 'Yasir Khan Coaching LTD',
  },
}

const hasChannelFilter = (calls: SupabaseMockCall[], channelId: string) =>
  calls.some(
    (call) => call.method === 'eq' && call.args[0] === 'channel_id' && call.args[1] === channelId,
  )

function yasirWorkspace(options: { stampedChannelId?: string } = {}) {
  return createSupabaseQueryMock({
    slack_observation_channels: (calls) =>
      options.stampedChannelId && hasChannelFilter(calls, options.stampedChannelId)
        ? [{ channel_name: 'roas-yasir-khan-coaching-ltd-955' }]
        : [],
    slack_observation_events: (calls) => {
      // Stamp lookup is keyed by the asking channel; the bundle lookup is not.
      const channelFilter = calls.find(
        (call) => call.method === 'eq' && call.args[0] === 'channel_id',
      )
      if (channelFilter)
        return channelFilter.args[1] === options.stampedChannelId ? [YASIR_EVENT] : []
      return [YASIR_EVENT]
    },
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
    spaces: [{ id: 'space-general', title: 'General' }],
  })
}

describe('buildSlackAskContext', () => {
  it('DM naming a client → no channel stamp, but a Client context bundle that names the channel', async () => {
    const service = new TestSlackAuth({ getConversationName: vi.fn(async () => null) })
    const { client } = yasirWorkspace()
    const text = await service.askContext(client, {
      orgId: 'org-1',
      slackTeamId: 'T1',
      channelId: 'D0DYLAN',
      text: "Can you pull Yasir's Aug 6 webinar stats from Slack?",
    })
    expect(text).not.toContain('[Slack channel identity]')
    expect(text).toContain('[Client context]')
    expect(text).toContain('Slack channels: #roas-yasir-khan-coaching-ltd-955 (C0B5MKP7Y30)')
    expect(text).toContain(`SLACK_SEARCH_MESSAGES with client_id=${YASIR_CLIENT}`)
    expect(text).toContain('Campaign Brain: brain-yasir')
  })

  it('client channel → identity stamp first, then the bundle for the same client', async () => {
    const service = new TestSlackAuth({ getConversationName: vi.fn(async () => null) })
    const { client } = yasirWorkspace({ stampedChannelId: 'C0B5MKP7Y30' })
    const text = await service.askContext(client, {
      orgId: 'org-1',
      slackTeamId: 'T1',
      channelId: 'C0B5MKP7Y30',
      text: 'what were the numbers on the last webinar?',
    })
    const identityAt = text.indexOf('[Slack channel identity]')
    const bundleAt = text.indexOf('[Client context]')
    expect(identityAt).toBeGreaterThanOrEqual(0)
    expect(bundleAt).toBeGreaterThan(identityAt)
    expect(text).toContain(
      `Resolved ROAS Portal client: Yasir Khan Coaching LTD (id=${YASIR_CLIENT})`,
    )
    expect(text).toContain('Slack channels: #roas-yasir-khan-coaching-ltd-955 (C0B5MKP7Y30)')
  })

  it('DM referencing a client channel (<#C…>) → bundle from that channel (live-audit shape)', async () => {
    const service = new TestSlackAuth({ getConversationName: vi.fn(async () => null) })
    const { client } = yasirWorkspace({ stampedChannelId: 'C0B5MKP7Y30' })
    const result = await service.askContextResolved(client, {
      orgId: 'org-1',
      slackTeamId: 'T1',
      channelId: 'D0DYLAN',
      text: 'Prepping for call with <#C0B5MKP7Y30> today.. what should i have ready',
    })
    expect(result.text).not.toContain('[Slack channel identity]')
    expect(result.text).toContain('[Client context]')
    expect(result.text).toContain('Slack channels: #roas-yasir-khan-coaching-ltd-955 (C0B5MKP7Y30)')
    expect(result.bundleCampaignId).toBe(YASIR_CAMPAIGN)
  })

  it('DM with no client named → empty context (general ask stays general)', async () => {
    const service = new TestSlackAuth({ getConversationName: vi.fn(async () => null) })
    const { client } = yasirWorkspace()
    const text = await service.askContext(client, {
      orgId: 'org-1',
      slackTeamId: 'T1',
      channelId: 'D0DYLAN',
      text: 'remind me to stretch at 3pm',
    })
    expect(text).toBe('')
  })

  it('exposes the campaign ids for the CONNECTIONS bind: stamp for channels, bundle for DMs', async () => {
    const service = new TestSlackAuth({ getConversationName: vi.fn(async () => null) })
    const channel = await service.askContextResolved(
      yasirWorkspace({ stampedChannelId: 'C0B5MKP7Y30' }).client,
      {
        orgId: 'org-1',
        slackTeamId: 'T1',
        channelId: 'C0B5MKP7Y30',
        text: 'numbers?',
      },
    )
    expect(channel.stampCampaignId).toBe(YASIR_CAMPAIGN)
    expect(channel.bundleCampaignId).toBe(YASIR_CAMPAIGN)

    const dm = await service.askContextResolved(yasirWorkspace().client, {
      orgId: 'org-1',
      slackTeamId: 'T1',
      channelId: 'D0DYLAN',
      text: "Yasir's Aug 6 stats?",
    })
    expect(dm.stampCampaignId).toBeNull()
    expect(dm.bundleCampaignId).toBe(YASIR_CAMPAIGN)

    const general = await service.askContextResolved(yasirWorkspace().client, {
      orgId: 'org-1',
      slackTeamId: 'T1',
      channelId: 'D0DYLAN',
      text: 'remind me to stretch',
    })
    expect(general).toEqual({ text: '', stampCampaignId: null, bundleCampaignId: null })
  })
})
