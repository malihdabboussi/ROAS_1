import { describe, expect, it } from 'vitest'
import type { Message } from '@/lib/conversations/conversation.types'
import { filterMessagesByQuery } from './conversation-search'

function messageFixture(overrides: Partial<Message>): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-22T10:00:00.000Z',
    ...overrides,
  }
}

describe('filterMessagesByQuery', () => {
  const messages = [
    messageFixture({
      id: 'content-match',
      content: 'Launch notes are ready',
    }),
    messageFixture({
      id: 'block-match',
      content_blocks: [{ id: 'block-1', type: 'text', content: 'Internal roadmap update' }],
    }),
    messageFixture({
      id: 'miss',
      content: 'Nothing relevant',
      content_blocks: [{ id: 'block-2', type: 'text', content: 'Also unrelated' }],
    }),
  ]

  it('returns all messages for blank search text', () => {
    expect(filterMessagesByQuery(messages, '   ')).toBe(messages)
  })

  it('matches message content and content blocks case-insensitively', () => {
    expect(filterMessagesByQuery(messages, 'LAUNCH').map((message) => message.id)).toEqual([
      'content-match',
    ])
    expect(filterMessagesByQuery(messages, 'roadmap').map((message) => message.id)).toEqual([
      'block-match',
    ])
  })
})
