import { describe, expect, it } from 'vitest'
import {
  readMeetingConversationLink,
  readMeetingConversationTitle,
  resolveLinkedMeetingTitle,
} from './conversation-meeting-link'

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

describe('resolveLinkedMeetingTitle', () => {
  it('reads the stamped meeting title from metadata', () => {
    expect(
      readMeetingConversationTitle({
        meeting_title: '  Saminyasar Cloud Club onboarding strategy  ',
      }),
    ).toBe('Saminyasar Cloud Club onboarding strategy')
    expect(readMeetingConversationTitle({ meeting_title: '   ' })).toBeNull()
  })

  it('never falls back to a recap or chat title', () => {
    expect(
      resolveLinkedMeetingTitle({
        contextTitle: 'ROAS onboarding, Samin AI education scale',
        metadata: { meeting_title: 'Older meeting name' },
        workAreaTitle: 'Work area leftover',
      }),
    ).toBe('ROAS onboarding, Samin AI education scale')
    expect(
      resolveLinkedMeetingTitle({
        metadata: { meeting_title: 'Saminyasar Cloud Club onboarding strategy' },
        workAreaTitle: 'Write my post-call recap message for the client',
      }),
    ).toBe('Saminyasar Cloud Club onboarding strategy')
    expect(
      resolveLinkedMeetingTitle({
        workAreaTitle: 'Saminyasar Cloud Club onboarding strategy',
      }),
    ).toBe('Saminyasar Cloud Club onboarding strategy')
    expect(
      resolveLinkedMeetingTitle({
        metadata: { meeting_item_id: 'meeting-1', space_id: 'space-1' },
      }),
    ).toBe('Meeting')
  })
})
