import { describe, expect, it, vi } from 'vitest'
import { MessageTimelineService } from './message-timeline.service'

describe('MessageTimelineService', () => {
  it('filters timeline reads by user, conversation, and message ordered by seq', async () => {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(async () => ({
        data: [
          {
            id: 'event-1',
            seq: 1,
            type: 'message_start',
            payload: {},
            created_at: '2026-05-28T13:00:00.000Z',
          },
        ],
        error: null,
      })),
    }
    const client = { from: vi.fn(() => query) }
    const service = new MessageTimelineService({ client } as any)

    const events = await service.listEventsForMessage({
      userId: 'user-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    })

    expect(client.from).toHaveBeenCalledWith('vb_message_timeline_events')
    expect(query.select).toHaveBeenCalledWith('id, seq, type, payload, created_at')
    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1')
    expect(query.eq).toHaveBeenNthCalledWith(2, 'conversation_id', 'conversation-1')
    expect(query.eq).toHaveBeenNthCalledWith(3, 'message_id', 'message-1')
    expect(query.order).toHaveBeenCalledWith('seq', { ascending: true })
    expect(events).toHaveLength(1)
  })
})
