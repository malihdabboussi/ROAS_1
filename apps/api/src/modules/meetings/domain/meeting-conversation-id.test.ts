import { describe, expect, it } from 'vitest'

import { buildMeetingConversationId } from './meeting-conversation-id'

describe('buildMeetingConversationId', () => {
  it('returns the same UUID for every attempt to create one meeting chat', () => {
    const first = buildMeetingConversationId('meeting-1')
    const second = buildMeetingConversationId('meeting-1')

    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('keeps different meetings in different conversations', () => {
    expect(buildMeetingConversationId('meeting-1')).not.toBe(
      buildMeetingConversationId('meeting-2'),
    )
  })
})
