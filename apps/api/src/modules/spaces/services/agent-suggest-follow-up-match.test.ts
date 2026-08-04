import { describe, expect, it } from 'vitest'
import { findExistingFollowUpForSuggestedTask } from './agent-suggest-follow-up-match'

describe('findExistingFollowUpForSuggestedTask', () => {
  it('matches by provider_source_key from Fathom ingest', () => {
    const existing = [
      {
        id: 'fu-1',
        title: 'Send recap',
        custom_data: {
          entry_type: 'follow_up',
          provider_source_key: 'fathom:170:action:0',
        },
      },
    ]
    expect(
      findExistingFollowUpForSuggestedTask({
        existingFollowUps: existing,
        title: 'Send the recap email',
        meetingId: '170',
        sourceActionIndex: 0,
      }),
    ).toEqual(existing[0])
  })

  it('falls back to normalized title match for manual rows', () => {
    const existing = [
      {
        id: 'fu-2',
        title: 'Book follow-up',
        custom_data: { entry_type: 'follow_up' },
      },
    ]
    expect(
      findExistingFollowUpForSuggestedTask({
        existingFollowUps: existing,
        title: 'book follow-up!',
        meetingId: '170',
        sourceActionIndex: null,
      }),
    ).toEqual(existing[0])
  })
})
