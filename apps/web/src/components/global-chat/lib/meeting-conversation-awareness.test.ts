import { describe, expect, it } from 'vitest'
import { buildMeetingConversationAwareness } from './meeting-conversation-awareness'

describe('buildMeetingConversationAwareness', () => {
  it('tells the agent the open thread is already the meeting', () => {
    const awareness = buildMeetingConversationAwareness({
      meetingItemId: 'meeting-1',
      spaceId: 'space-1',
      title: 'Dylan and Nancy',
    })
    expect(awareness).toContain('Do not ask which meeting.')
    expect(awareness).toContain('Meeting: Dylan and Nancy')
    expect(awareness).toContain('Meeting item: meeting-1')
    expect(awareness).toContain('Space: space-1')
  })
})
