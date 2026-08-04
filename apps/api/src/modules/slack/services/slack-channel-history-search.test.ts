import { describe, expect, it, vi } from 'vitest'
import { searchSlackChannelHistory } from './slack-channel-history-search'

describe('searchSlackChannelHistory', () => {
  it('finds an older channel link even when the date estimate and wording are approximate', async () => {
    const slackApi = {
      listConversations: vi
        .fn()
        .mockResolvedValue([{ id: 'C1', name: 'roas-christian-osgood', is_private: true }]),
      getChannelHistorySince: vi.fn().mockResolvedValue([
        {
          text: 'New book funnel (free + shipping): https://dylanvanas.com/getyourcopytoday/index.html',
          user: 'U-DYLAN',
          ts: '1780560000.000100',
        },
        { text: 'Unrelated campaign update', user: 'U2', ts: '1784000000.000100' },
      ]),
      getChannelHistory: vi.fn(),
      conversationsRepliesAll: vi.fn(),
    }

    const result = await searchSlackChannelHistory({
      slackApi: slackApi as never,
      botToken: 'xoxb-test',
      query: 'in:#roas-christian-osgood book funnel',
      count: 10,
      now: new Date('2026-08-04T20:00:00.000Z'),
    })

    expect(slackApi.getChannelHistorySince).toHaveBeenCalledOnce()
    expect(result.coverage.status).toBe('complete')
    expect(result.messages.matches).toEqual([
      expect.objectContaining({
        text: expect.stringContaining('getyourcopytoday'),
        channel: { id: 'C1', name: 'roas-christian-osgood' },
      }),
    ])
  })

  it('searches thread replies and ranks link evidence above a partial text match', async () => {
    const slackApi = {
      listConversations: vi.fn().mockResolvedValue([{ id: 'C1', name: 'client' }]),
      getChannelHistorySince: vi
        .fn()
        .mockResolvedValue([
          { text: 'Book funnel discussion', user: 'U1', ts: '2.0', reply_count: 1 },
        ]),
      getChannelHistory: vi.fn(),
      conversationsRepliesAll: vi.fn().mockResolvedValue([
        { text: 'Book funnel discussion', user: 'U1', ts: '2.0' },
        {
          text: 'Book funnel link https://example.com/funnel',
          user: 'U2',
          ts: '2.1',
          thread_ts: '2.0',
        },
      ]),
    }

    const result = await searchSlackChannelHistory({
      slackApi: slackApi as never,
      botToken: 'xoxb-test',
      query: 'in:#client book funnel link',
      count: 10,
      now: new Date('2026-08-04T20:00:00.000Z'),
    })

    expect(result.coverage.threads_expanded).toBe(1)
    expect(result.messages.matches[0]?.text).toContain('https://example.com/funnel')
  })
})
