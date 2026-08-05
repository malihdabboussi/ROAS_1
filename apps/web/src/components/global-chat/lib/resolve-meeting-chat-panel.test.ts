import { describe, expect, it } from 'vitest'
import { resolveMeetingChatPanel } from './resolve-meeting-chat-panel'

const stored = {
  spaceId: 'space-1',
  meetingItemId: 'meeting-1',
  conversationId: 'conversation-1',
  awarenessContext: 'LIVE CALL MODE',
  timelineVersion: 2,
}

describe('resolveMeetingChatPanel', () => {
  it('prefers the meeting conversation before the active id matches', () => {
    const resolved = resolveMeetingChatPanel({
      storedMeetingContext: stored,
      activeConversationId: null,
    })
    expect(resolved.meetingContext).toEqual(stored)
    expect(resolved.preferredConversationId).toBe('conversation-1')
    expect(resolved.awarenessContext).toBeUndefined()
  })

  it('applies awareness only when the active conversation is the meeting thread', () => {
    const resolved = resolveMeetingChatPanel({
      storedMeetingContext: stored,
      activeConversationId: 'conversation-1',
    })
    expect(resolved.preferredConversationId).toBe('conversation-1')
    expect(resolved.awarenessContext).toBe('LIVE CALL MODE')
  })

  it('returns empty when no meeting context is attached', () => {
    expect(
      resolveMeetingChatPanel({
        storedMeetingContext: null,
        activeConversationId: 'conversation-1',
      }),
    ).toEqual({
      meetingContext: null,
      preferredConversationId: null,
      awarenessContext: undefined,
    })
  })
})
