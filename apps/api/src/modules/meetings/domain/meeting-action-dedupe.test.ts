import { describe, expect, it } from 'vitest'
import {
  findMatchingMeetingAction,
  meetingActionTextsMatch,
  normalizeMeetingActionText,
} from './meeting-action-dedupe'

describe('meeting-action-dedupe', () => {
  it('normalizes punctuation and case for stable matching', () => {
    expect(normalizeMeetingActionText('  Send Recap to Nate! ')).toBe('send recap to nate')
    expect(meetingActionTextsMatch('Send recap to Nate.', 'send recap to nate')).toBe(true)
    expect(meetingActionTextsMatch('Send recap to Nate', 'Send deck to Nate')).toBe(false)
  })

  it('finds an existing action by title or source text', () => {
    const existing = [
      {
        id: 'provider-1',
        title: 'Send the recap to Nate',
        source_text: 'Send the recap to Nate',
        source_type: 'provider',
      },
      {
        id: 'manual-1',
        title: 'Book follow-up',
        source_text: 'Book follow-up',
        source_type: 'manual',
      },
    ]

    expect(findMatchingMeetingAction(existing, 'send the recap to nate!')).toEqual(existing[0])
    expect(findMatchingMeetingAction(existing, 'BOOK FOLLOW-UP')).toEqual(existing[1])
    expect(findMatchingMeetingAction(existing, 'Something else')).toBeNull()
  })
})
