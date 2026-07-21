import { describe, expect, it, vi } from 'vitest'
import { SlackObservationService } from '../slack-observation.service'

describe('SlackObservationService', () => {
  it('fetches each selected channel once, expands threads, and advances exact cursors', async () => {
    const repository = {
      listChannelCursors: vi
        .fn()
        .mockResolvedValue([{ channel_id: 'C1', last_message_ts: '100.000001' }]),
      upsertChannels: vi.fn().mockResolvedValue(undefined),
      upsertEvents: vi.fn().mockResolvedValue({ inserted: 3, duplicates: 0 }),
      advanceChannelCursor: vi.fn().mockResolvedValue(undefined),
    }
    const slackApi = {
      listConversations: vi.fn().mockResolvedValue([
        { id: 'C1', name: 'client-alpha', is_member: true },
        { id: 'C2', name: 'internal', is_member: true },
      ]),
      getChannelHistorySince: vi.fn().mockResolvedValue([
        {
          ts: '101.000001',
          user: 'U1',
          text: 'Can we ship this today?',
          reply_count: 1,
        },
      ]),
      conversationsRepliesAll: vi.fn().mockResolvedValue([
        { ts: '101.000001', user: 'U1', text: 'Can we ship this today?' },
        { ts: '101.000002', thread_ts: '101.000001', user: 'U2', text: 'Yes, shipped.' },
      ]),
    }
    const service = new SlackObservationService(repository as never, slackApi as never)

    const result = await service.reconcile({
      supabase: {} as never,
      orgId: 'org-1',
      slackTeamId: 'T1',
      botToken: 'xoxb-test',
      channelIds: ['C1'],
      initialLookbackMinutes: 30,
    })

    expect(slackApi.listConversations).toHaveBeenCalledTimes(1)
    expect(slackApi.getChannelHistorySince).toHaveBeenCalledTimes(1)
    expect(slackApi.getChannelHistorySince).toHaveBeenCalledWith('xoxb-test', 'C1', '100.000001')
    expect(slackApi.conversationsRepliesAll).toHaveBeenCalledWith('xoxb-test', 'C1', '101.000001')
    expect(repository.upsertEvents).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ messageTs: '101.000002', threadTs: '101.000001' }),
      ]),
    )
    expect(repository.advanceChannelCursor).toHaveBeenCalledWith(expect.anything(), {
      orgId: 'org-1',
      slackTeamId: 'T1',
      channelId: 'C1',
      lastMessageTs: '101.000002',
    })
    expect(result).toMatchObject({
      channelsListed: 2,
      channelsReconciled: 1,
      historyRequests: 1,
      threadRequests: 1,
      eventsStored: 3,
    })
  })

  it('stores webhook messages without making Slack API requests', async () => {
    const repository = {
      findWorkspaceBySlackTeamId: vi.fn().mockResolvedValue({ org_id: 'org-1' }),
      upsertEvents: vi.fn().mockResolvedValue({ inserted: 1, duplicates: 0 }),
      advanceChannelCursor: vi.fn().mockResolvedValue(undefined),
    }
    const slackApi = {
      listConversations: vi.fn(),
      getChannelHistorySince: vi.fn(),
    }
    const service = new SlackObservationService(repository as never, slackApi as never)

    await service.recordWebhookEvent({
      supabase: {} as never,
      slackTeamId: 'T1',
      event: {
        type: 'message',
        channel: 'C1',
        user: 'U1',
        ts: '102.000001',
        thread_ts: '101.000001',
        text: 'Here is the update.',
      },
    })

    expect(repository.upsertEvents).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({
        orgId: 'org-1',
        source: 'webhook',
        messageTs: '102.000001',
        threadTs: '101.000001',
      }),
    ])
    expect(slackApi.listConversations).not.toHaveBeenCalled()
    expect(slackApi.getChannelHistorySince).not.toHaveBeenCalled()
    expect(repository.advanceChannelCursor).not.toHaveBeenCalled()
  })
})
