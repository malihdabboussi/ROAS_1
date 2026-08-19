import { describe, expect, it } from 'vitest'
import {
  clientNameMatches,
  extractClientNameCandidates,
  formatSlackClientContextBlock,
  resolveSlackClientContext,
} from '../slack-client-context'
import { createSupabaseQueryMock as createSupabaseMock } from './supabase-query-mock'

const YASIR_CAMPAIGN = 'bad92814-a1cb-4b66-ba92-66dd02dc42e1'
const YASIR_CLIENT = 'b17dcee8-2516-4318-aecc-1f7f449dfb92'

const yasirTables = {
  slack_observation_events: [
    {
      channel_id: 'C0B5MKP7Y30',
      channel_name: 'roas-yasir-khan-coaching-ltd-955',
      metadata: {
        page_grader_client_id: YASIR_CLIENT,
        page_grader_client_name: 'Yasir Khan Coaching LTD',
        roas_campaign_id: YASIR_CAMPAIGN,
        roas_campaign_name: 'Yasir Khan Coaching LTD',
      },
    },
    {
      channel_id: 'C0B5MKP7Y30',
      channel_name: 'roas-yasir-khan-coaching-ltd-955',
      metadata: { page_grader_client_id: YASIR_CLIENT, roas_campaign_id: YASIR_CAMPAIGN },
    },
  ],
  slack_brain_mappings: [
    {
      slack_channel_id: 'C0B5MKP7Y30',
      slack_channel_name: 'roas-yasir-khan-coaching-ltd-955',
      target_campaign_id: YASIR_CAMPAIGN,
      target_brain_id: '16d4f2ef-b0e4-4a83-bc90-59a6f48a6062',
    },
  ],
  campaigns: [{ id: YASIR_CAMPAIGN, name: 'Yasir Khan Coaching LTD' }],
  ns_brains: [{ id: '16d4f2ef-b0e4-4a83-bc90-59a6f48a6062', campaign_id: YASIR_CAMPAIGN }],
  spaces: [
    { id: 'space-general', title: 'General' },
    { id: 'space-webinar', title: 'Speak Like a CEO Workshop 2026 Webinar' },
  ],
}

describe('resolveSlackClientContext', () => {
  it('builds the bundle from a portal client id (channel stamp path)', async () => {
    const { client } = createSupabaseMock(yasirTables)
    const bundle = await resolveSlackClientContext(client, {
      orgId: 'org-1',
      clientId: YASIR_CLIENT,
    })
    expect(bundle).not.toBeNull()
    expect(bundle?.resolvedBy).toBe('client_id')
    expect(bundle?.clientName).toBe('Yasir Khan Coaching LTD')
    expect(bundle?.campaigns).toEqual([{ id: YASIR_CAMPAIGN, name: 'Yasir Khan Coaching LTD' }])
    expect(bundle?.slackChannels).toEqual([
      {
        channelId: 'C0B5MKP7Y30',
        channelName: 'roas-yasir-khan-coaching-ltd-955',
        source: 'mapping',
      },
    ])
    expect(bundle?.campaignBrainIds).toEqual(['16d4f2ef-b0e4-4a83-bc90-59a6f48a6062'])
    expect(bundle?.spaces).toHaveLength(2)
  })

  it('resolves a client named in a DM when exactly one campaign matches', async () => {
    const { client, seen } = createSupabaseMock(yasirTables)
    const bundle = await resolveSlackClientContext(client, {
      orgId: 'org-1',
      clientName: 'Yasir',
    })
    expect(bundle?.resolvedBy).toBe('client_name')
    expect(bundle?.clientId).toBe(YASIR_CLIENT)
    expect(bundle?.slackChannels[0]?.channelName).toBe('roas-yasir-khan-coaching-ltd-955')
    const campaignLookup = seen.find((entry) => entry.table === 'campaigns')
    expect(campaignLookup?.calls.some((call) => call.method === 'ilike')).toBe(true)
  })

  it('returns null when a client name is ambiguous or unknown', async () => {
    const ambiguous = createSupabaseMock({
      ...yasirTables,
      campaigns: [
        { id: 'c-1', name: 'Andy Elliott' },
        { id: 'c-2', name: 'Andy Frisella' },
      ],
    })
    expect(
      await resolveSlackClientContext(ambiguous.client, { orgId: 'org-1', clientName: 'Andy' }),
    ).toBeNull()
    const unknown = createSupabaseMock({ ...yasirTables, campaigns: [] })
    expect(
      await resolveSlackClientContext(unknown.client, { orgId: 'org-1', clientName: 'Nobody' }),
    ).toBeNull()
  })

  it('still returns a bundle (without channels) when the campaign has no Slack mapping yet', async () => {
    const { client } = createSupabaseMock({
      slack_observation_events: [],
      slack_brain_mappings: [],
      campaigns: [{ id: 'camp-new', name: 'New Client' }],
      ns_brains: [],
      spaces: [],
    })
    const bundle = await resolveSlackClientContext(client, {
      orgId: 'org-1',
      campaignId: 'camp-new',
    })
    expect(bundle?.slackChannels).toEqual([])
    expect(formatSlackClientContextBlock(bundle!)).toContain('Slack channels: none mapped yet')
  })
})

describe('formatSlackClientContextBlock', () => {
  it('names the channel and tells Pixel how to scope Slack retrieval', () => {
    const text = formatSlackClientContextBlock({
      clientId: YASIR_CLIENT,
      clientName: 'Yasir Khan Coaching LTD',
      campaigns: [{ id: YASIR_CAMPAIGN, name: 'Yasir Khan Coaching LTD' }],
      campaignBrainIds: ['brain-1'],
      slackChannels: [
        {
          channelId: 'C0B5MKP7Y30',
          channelName: 'roas-yasir-khan-coaching-ltd-955',
          source: 'mapping',
        },
      ],
      spaces: [{ id: 'space-1', title: 'General' }],
      resolvedBy: 'client_id',
    })
    expect(text.startsWith('[Client context]')).toBe(true)
    expect(text).toContain(`Client: Yasir Khan Coaching LTD (portal id=${YASIR_CLIENT})`)
    expect(text).toContain('Slack channels: #roas-yasir-khan-coaching-ltd-955 (C0B5MKP7Y30)')
    expect(text).toContain(`SLACK_SEARCH_MESSAGES with client_id=${YASIR_CLIENT}`)
    expect(text).toContain('never say the channel is unknown')
    expect(text).toContain('Campaign Brain: brain-1')
  })
})

describe('extractClientNameCandidates', () => {
  it('pulls the client name out of a DM ask', () => {
    expect(
      extractClientNameCandidates("Can you pull Yasir's Aug 6 webinar stats from Slack?"),
    ).toEqual(['Yasir'])
    expect(extractClientNameCandidates('what did we ship for Trade Launch last week')).toEqual([
      'Trade Launch',
    ])
    expect(extractClientNameCandidates('remind me to stretch')).toEqual([])
  })

  it('matches names loosely but requires every word', () => {
    expect(clientNameMatches('Yasir', 'Yasir Khan Coaching LTD')).toBe(true)
    expect(clientNameMatches('Trade Launch', 'Trade Launch')).toBe(true)
    expect(clientNameMatches('Trade Rocket', 'Trade Launch')).toBe(false)
  })
})
