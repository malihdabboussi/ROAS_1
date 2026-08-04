import { describe, expect, it } from 'vitest'
import { getConversationLastActivityAt } from './conversation-last-activity'
import type { Conversation } from './conversation.types'

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c-1',
    user_id: 'u-1',
    campaign_id: null,
    title: 'Chat',
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    created_at: '2026-06-01T12:00:00.000Z',
    updated_at: '2026-08-04T20:00:00.000Z',
    ...overrides,
  }
}

describe('getConversationLastActivityAt', () => {
  it('prefers last_message_at over updated_at so opens/title edits do not age the row', () => {
    expect(
      getConversationLastActivityAt(
        conversation({
          last_message_at: '2026-07-01T12:00:00.000Z',
          updated_at: '2026-08-04T20:00:00.000Z',
        }),
      ),
    ).toBe('2026-07-01T12:00:00.000Z')
  })

  it('falls back to created_at when there is no message activity', () => {
    expect(
      getConversationLastActivityAt(
        conversation({
          last_message_at: null,
          created_at: '2026-06-01T12:00:00.000Z',
          updated_at: '2026-08-04T20:00:00.000Z',
        }),
      ),
    ).toBe('2026-06-01T12:00:00.000Z')
  })
})
