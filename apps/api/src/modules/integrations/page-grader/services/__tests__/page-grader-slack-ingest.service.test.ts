import { describe, expect, it, vi } from 'vitest'
import { PageGraderSlackIngestService } from '../page-grader-slack-ingest.service'

function slackIntegrationClient() {
  const query: Record<string, ReturnType<typeof vi.fn>> = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.not = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.limit = vi.fn(() => query)
  query.maybeSingle = vi.fn().mockResolvedValue({
    data: { org_id: 'org-1', metadata: { team_id: 'T_ROAS' } },
    error: null,
  })
  return { from: vi.fn(() => query) }
}

describe('PageGraderSlackIngestService', () => {
  it('upserts client-scoped Slack messages into the ROAS observation ledger', async () => {
    const client = slackIntegrationClient()
    const brainSync = {
      authorizeWebhookClient: vi.fn().mockResolvedValue([
        {
          userId: 'user-1',
          orgId: 'org-1',
          clientId: '11111111-1111-1111-1111-111111111111',
          entry: { campaign_id: 'campaign-1', campaign_name: 'Acme account' },
          webhookSecret: 'whsec',
        },
      ]),
    }
    const observations = {
      listChannelSettings: vi
        .fn()
        .mockResolvedValue([{ channel_id: 'C123', channel_name: 'client-acme' }]),
      upsertChannels: vi.fn(),
      upsertEvents: vi.fn().mockResolvedValue({ inserted: 1, duplicates: 0 }),
    }
    const service = new PageGraderSlackIngestService(
      { client } as never,
      brainSync as never,
      observations as never,
    )
    const result = await service.processWebhook(
      JSON.stringify({
        client_id: '11111111-1111-1111-1111-111111111111',
        client_name: 'Acme',
        channel_id: 'C123',
        synced_at: '2026-08-13T12:00:00.000Z',
        messages: [
          {
            ts: '1786640400.123456',
            thread_ts: '1786640000.000001',
            sender_slack_user_id: 'U123',
            author_name: 'Bryce',
            text: 'Ads are not live yet.',
            date: '2026-08-13T11:00:00.000Z',
          },
        ],
      }),
      'whsec',
    )
    expect(result).toMatchObject({
      success: true,
      client_id: '11111111-1111-1111-1111-111111111111',
    })
    expect(brainSync.authorizeWebhookClient).toHaveBeenCalledWith(
      'whsec',
      '11111111-1111-1111-1111-111111111111',
      'Acme',
    )
    expect(observations.upsertChannels).not.toHaveBeenCalled()
    expect(observations.upsertEvents).toHaveBeenCalledWith(
      client,
      [
        expect.objectContaining({
          orgId: 'org-1',
          slackTeamId: 'T_ROAS',
          channelId: 'C123',
          channelName: 'client-acme',
          messageTs: '1786640400.123456',
          source: 'reconciliation',
          metadata: expect.objectContaining({
            ingest_source: 'page_grader',
            page_grader_client_name: 'Acme',
            roas_campaign_id: 'campaign-1',
          }),
        }),
      ],
      { replaceDuplicates: true },
    )
  })

  it('rejects malformed Slack timestamps before writing', async () => {
    const service = new PageGraderSlackIngestService(
      { client: slackIntegrationClient() } as never,
      { authorizeWebhookClient: vi.fn() } as never,
      { upsertEvents: vi.fn() } as never,
    )
    await expect(
      service.processWebhook(
        JSON.stringify({
          client_id: '11111111-1111-1111-1111-111111111111',
          client_name: 'Acme',
          channel_id: 'C123',
          messages: [{ ts: 'not-a-slack-ts', text: 'hello' }],
        }),
        'whsec',
      ),
    ).rejects.toThrow(/Invalid Slack messages payload/i)
  })

  it('routes a personal Page Grader mapping through the owner org Slack connection', async () => {
    const client = slackIntegrationClient()
    const observations = {
      listChannelSettings: vi.fn().mockResolvedValue([]),
      upsertChannels: vi.fn().mockResolvedValue(undefined),
      upsertEvents: vi.fn().mockResolvedValue({ inserted: 1, duplicates: 0 }),
    }
    const service = new PageGraderSlackIngestService(
      { client } as never,
      {
        authorizeWebhookClient: vi.fn().mockResolvedValue([
          {
            userId: 'user-1',
            orgId: null,
            clientId: '11111111-1111-1111-1111-111111111111',
            entry: { campaign_id: '', campaign_name: 'Acme' },
            webhookSecret: 'whsec',
          },
        ]),
      } as never,
      observations as never,
    )

    await service.processWebhook(
      JSON.stringify({
        client_id: '11111111-1111-1111-1111-111111111111',
        client_name: 'Acme',
        channel_id: 'C123',
        messages: [{ ts: '1786640400.123456', text: 'Launch is waiting on ads.' }],
      }),
      'whsec',
    )

    expect(observations.upsertEvents).toHaveBeenCalledWith(
      client,
      [expect.objectContaining({ orgId: 'org-1', slackTeamId: 'T_ROAS' })],
      { replaceDuplicates: true },
    )
  })
})
