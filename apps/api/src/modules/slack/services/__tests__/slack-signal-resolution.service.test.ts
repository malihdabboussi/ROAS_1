import { describe, expect, it, vi } from 'vitest'
import { SlackSignalResolutionService } from '../slack-signal-resolution.service'

describe('SlackSignalResolutionService', () => {
  it('marks a signal resolved when its source thread has a later human reply', async () => {
    const people = {
      listShadowActions: vi.fn().mockResolvedValue([
        {
          id: 'signal-1',
          target_member_id: null,
          source_channel_id: 'C1',
          source_message_ts: '100.1',
          metadata: { source_thread_ts: '100.1' },
        },
      ]),
      findOrgSlackIntegration: vi
        .fn()
        .mockResolvedValue({ access_token: 'xoxb', user_id: 'owner', metadata: {} }),
    }
    const signals = {
      updateSignalMetadata: vi
        .fn()
        .mockImplementation((_client, input) =>
          Promise.resolve({ id: input.actionId, metadata: input.metadata }),
        ),
    }
    const slackApi = {
      conversationsRepliesAll: vi.fn().mockResolvedValue([
        { ts: '100.1', user: 'UCLIENT', text: 'Can someone help?' },
        { ts: '101.1', user: 'UINTERNAL', text: 'Handled.' },
      ]),
      getChannelHistoryPage: vi.fn(),
    }
    const service = new SlackSignalResolutionService(
      people as never,
      slackApi as never,
      signals as never,
    )

    const result = await service.refresh({} as never, 'org-1', 'signal-1')

    expect(result.resolution.resolved).toBe(true)
    expect(result.resolution.reply_count).toBe(1)
    expect(signals.updateSignalMetadata).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          resolution: expect.objectContaining({ resolved: true }),
        }),
      }),
    )
  })

  it('marks a non-thread question resolved by the next nearby channel reply', async () => {
    const service = new SlackSignalResolutionService(
      {
        findOrgSlackIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb' }),
      } as never,
      {
        conversationsRepliesAll: vi.fn().mockResolvedValue([
          {
            ts: '100.1',
            user: 'UDYLAN',
            text: '<@UNATE> what time do you need it for?',
          },
        ]),
        getChannelHistoryPage: vi.fn().mockResolvedValue({
          messages: [
            { ts: '107.1', user: 'UNATE', text: 'EOD today preferably.' },
            {
              ts: '100.1',
              user: 'UDYLAN',
              text: '<@UNATE> what time do you need it for?',
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      } as never,
      {} as never,
    )

    const result = await service.inspectSource({} as never, 'org-1', {
      channelId: 'C1',
      sourceMessageTs: '100.1',
    })

    expect(result).toMatchObject({
      resolved: true,
      reply_count: 1,
      reason: expect.stringMatching(/channel reply/i),
    })
  })

  it('does not treat an unrelated later channel message as a reply', async () => {
    const service = new SlackSignalResolutionService(
      {
        findOrgSlackIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb' }),
      } as never,
      {
        conversationsRepliesAll: vi.fn().mockResolvedValue([
          { ts: '100.1', user: 'UDYLAN', text: '<@UNATE> what time do you need it for?' },
        ]),
        getChannelHistoryPage: vi.fn().mockResolvedValue({
          messages: [{ ts: '107.1', user: 'UOTHER', text: 'New creative is ready.' }],
          nextCursor: null,
          hasMore: false,
        }),
      } as never,
      {} as never,
    )

    const result = await service.inspectSource({} as never, 'org-1', {
      channelId: 'C1',
      sourceMessageTs: '100.1',
    })

    expect(result.resolved).toBe(false)
  })

  it('marks a signal resolved when the source has a checkmark reaction', async () => {
    const signal = {
      id: 'signal-1',
      target_member_id: null,
      source_channel_id: 'C1',
      source_message_ts: '100.1',
      metadata: { source_thread_ts: '100.1' },
    }
    const signals = {
      updateSignalMetadata: vi
        .fn()
        .mockImplementation((_client, input) =>
          Promise.resolve({ ...signal, metadata: input.metadata }),
        ),
    }
    const service = new SlackSignalResolutionService(
      {
        listShadowActions: vi.fn().mockResolvedValue([signal]),
        findOrgSlackIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb' }),
      } as never,
      {
        conversationsRepliesAll: vi.fn().mockResolvedValue([
          {
            ts: '100.1',
            user: 'UCLIENT',
            text: 'Can someone help?',
            reactions: [{ name: 'white_check_mark', count: 1 }],
          },
        ]),
      } as never,
      signals as never,
    )

    const result = await service.refresh({} as never, 'org-1', 'signal-1')

    expect(result.resolution.resolved).toBe(true)
    expect(result.resolution.reason).toContain('white_check_mark')
  })

  it('refreshes a person-targeted proposal before delivery', async () => {
    const signal = {
      id: 'proposal-1',
      target_member_id: 'member-1',
      source_channel_id: 'C1',
      source_message_ts: '100.1',
      metadata: { source_thread_ts: '100.1', lifecycle_state: 'cooling' },
    }
    const service = new SlackSignalResolutionService(
      {
        listShadowActions: vi.fn().mockResolvedValue([signal]),
        findOrgSlackIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb' }),
      } as never,
      {
        conversationsRepliesAll: vi
          .fn()
          .mockResolvedValue([{ ts: '100.1', user: 'UCLIENT', text: 'Can someone help?' }]),
        getChannelHistoryPage: vi.fn().mockResolvedValue({
          messages: [],
          nextCursor: null,
          hasMore: false,
        }),
      } as never,
      {
        updateSignalMetadata: vi
          .fn()
          .mockImplementation((_client, input) =>
            Promise.resolve({ ...signal, metadata: input.metadata }),
          ),
      } as never,
    )

    const result = await service.refresh({} as never, 'org-1', 'proposal-1')

    expect(result.action.target_member_id).toBe('member-1')
    expect(result.resolution.resolved).toBe(false)
  })
})
