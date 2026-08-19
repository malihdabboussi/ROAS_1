import { describe, expect, it } from 'vitest'
import {
  isCallDateInPastThroughTomorrow,
  resolveCallDateWindow,
} from '../meetings-call-date-window'

describe('meetings call date window', () => {
  it('defaults All Meetings to past through tomorrow', () => {
    expect(resolveCallDateWindow({ id: 'all-meetings' })).toBe('past_through_tomorrow')
    expect(resolveCallDateWindow({ id: 'all-meetings', toolbar_call_date_window: 'all' })).toBe(
      'all',
    )
  })

  it('keeps past and tomorrow, hides later future', () => {
    const now = new Date('2026-08-18T15:00:00.000Z')
    expect(isCallDateInPastThroughTomorrow('2026-08-01T17:00:00.000Z', now)).toBe(true)
    expect(isCallDateInPastThroughTomorrow('2026-08-19T17:00:00.000Z', now)).toBe(true)
    expect(isCallDateInPastThroughTomorrow('2026-08-21T17:00:00.000Z', now)).toBe(false)
    // Undated calls stay visible so quick-added meetings don't vanish.
    expect(isCallDateInPastThroughTomorrow(null, now)).toBe(true)
  })
})
