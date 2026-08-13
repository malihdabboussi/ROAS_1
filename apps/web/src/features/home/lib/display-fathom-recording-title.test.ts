import { describe, expect, it } from 'vitest'
import { displayFathomRecordingTitle } from './display-fathom-recording-title'

describe('displayFathomRecordingTitle', () => {
  it('keeps specific titles', () => {
    expect(displayFathomRecordingTitle({ title: 'ROAS Team and Shawn Kaplan' })).toBe(
      'ROAS Team and Shawn Kaplan',
    )
  })

  it('uses the canonical provider title when supplied', () => {
    expect(
      displayFathomRecordingTitle({
        title: 'Impromptu Call',
        canonical_title: 'Align on the new high-ticket offer strategy',
        recorded_by: { name: 'Dylan Vanas' },
      }),
    ).toBe('Align on the new high-ticket offer strategy')
  })

  it('replaces Impromptu Zoom Meeting with invitee names', () => {
    expect(
      displayFathomRecordingTitle({
        title: 'Impromptu Zoom Meeting',
        calendar_invitees: [
          { name: 'Aaron Scott', email: 'aaron@roas.co' },
          { name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' },
          { name: 'Nate', email: 'nate@roas.co' },
        ],
      }),
    ).toBe('Aaron + Dylan')
  })

  it('falls back to a single invitee label', () => {
    expect(
      displayFathomRecordingTitle({
        title: 'Untitled Meeting',
        calendar_invitees: [{ name: 'Shawn Kaplan' }],
      }),
    ).toBe('Shawn call')
  })
})
