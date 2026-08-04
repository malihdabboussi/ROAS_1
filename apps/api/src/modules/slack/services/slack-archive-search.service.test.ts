import { describe, expect, it, vi } from 'vitest'
import { SlackArchiveSearchService } from './slack-archive-search.service'

describe('SlackArchiveSearchService', () => {
  it('backfills missing coverage, searches durable events, and returns source permalinks', async () => {
    const repository = {
      upsertChannels: vi.fn().mockResolvedValue(undefined),
      listChannelSettings: vi.fn().mockResolvedValue([]),
      listEventsBetween: vi.fn().mockResolvedValue([
        {
          channel_id: 'C1',
          channel_name: 'roas-christian-osgood',
          message_ts: '1780000000.000001',
          thread_ts: null,
          sender_slack_user_id: 'U1',
          text: 'New book funnel: https://dylanvanas.com/getyourcopytoday/index.html',
          is_bot: false,
          observed_at: '2026-06-04T00:00:00.000Z',
        },
      ]),
    }
    const observation = { backfillChannelPeriod: vi.fn().mockResolvedValue({}) }
    const slackApi = {
      listConversations: vi.fn().mockResolvedValue([{ id: 'C1', name: 'roas-christian-osgood' }]),
      getPermalink: vi.fn().mockResolvedValue('https://slack.test/archives/C1/p1780000000000001'),
    }
    const service = new SlackArchiveSearchService(
      repository as never,
      observation as never,
      slackApi as never,
    )

    const result = await service.search({
      supabase: {} as never,
      orgId: 'org-1',
      slackTeamId: 'T1',
      botToken: 'xoxb-bot',
      query: 'in:#roas-christian-osgood book funnel',
      count: 10,
      now: new Date('2026-08-04T12:00:00.000Z'),
    })

    expect(observation.backfillChannelPeriod).toHaveBeenCalledOnce()
    expect(result?.search_mode).toBe('observation_archive')
    expect(result?.messages.matches[0]).toMatchObject({
      text: expect.stringContaining('getyourcopytoday'),
      permalink: 'https://slack.test/archives/C1/p1780000000000001',
    })
    expect(result?.coverage.status).toBe('complete')
  })
})
