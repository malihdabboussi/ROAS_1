import { describe, expect, it } from 'vitest'
import { readMeetingConversationLink } from './conversation-meeting-link'

describe('readMeetingConversationLink', () => {
  it('reads canonical meeting metadata', () => {
    expect(
      readMeetingConversationLink({
        context_type: 'meeting',
        meeting_item_id: 'meeting-1',
        space_id: 'space-1',
      }),
    ).toEqual({ meetingItemId: 'meeting-1', spaceId: 'space-1' })
  })

  it('accepts meeting_item_id without context_type', () => {
    expect(
      readMeetingConversationLink({
        meeting_item_id: 'meeting-2',
        space_id: 'space-2',
      }),
    ).toEqual({ meetingItemId: 'meeting-2', spaceId: 'space-2' })
  })

  it('returns null when the meeting identity is incomplete', () => {
    expect(readMeetingConversationLink(null)).toBeNull()
    expect(readMeetingConversationLink({})).toBeNull()
    expect(
      readMeetingConversationLink({
        context_type: 'meeting',
        meeting_item_id: 'meeting-1',
      }),
    ).toBeNull()
    expect(
      readMeetingConversationLink({
        context_type: 'meeting',
        space_id: 'space-1',
      }),
    ).toBeNull()
  })
})
