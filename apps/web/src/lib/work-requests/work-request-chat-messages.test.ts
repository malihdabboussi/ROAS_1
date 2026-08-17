import { describe, expect, it } from 'vitest'
import { mapWorkRequestReviewChatMessages } from './work-request-chat-messages'

describe('mapWorkRequestReviewChatMessages', () => {
  it('maps review-token chat rows onto conversation messages', () => {
    expect(
      mapWorkRequestReviewChatMessages('conv-1', [
        {
          id: 'm1',
          conversation_id: 'conv-1',
          role: 'assistant',
          content: 'Review here',
          metadata: { source: 'pixel' },
          created_at: '2026-08-17T00:00:00.000Z',
        },
      ]),
    ).toEqual([
      {
        id: 'm1',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'Review here',
        content_blocks: null,
        created_at: '2026-08-17T00:00:00.000Z',
        metadata: { source: 'pixel' },
      },
    ])
  })
})
