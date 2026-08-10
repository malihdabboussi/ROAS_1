import { describe, expect, it } from 'vitest'
import {
  matchesFathomAgendaExclusion,
  updateFathomAgendaExclusions,
  type FathomAgendaExclusion,
} from './fathom-agenda-exclusions'

const EXCLUSION: FathomAgendaExclusion = {
  key: 'account-1:event-1:2026-07-30T17:00:00.000Z',
  eventId: 'event-1',
  title: 'Weekly Campaign Review',
  start: '2026-07-30T17:00:00.000Z',
  source: 'google_calendar',
  accountId: 'account-1',
}

describe('Fathom agenda exclusions', () => {
  it('matches the exact calendar event id when Fathom supplies it', () => {
    expect(
      matchesFathomAgendaExclusion([EXCLUSION], {
        calendar_event_id: 'event-1',
        title: 'A renamed meeting',
        scheduled_start_time: '2026-07-30T17:00:00.000Z',
      }),
    ).toBe(true)
  })

  it('matches the normalized title and nearby scheduled start when the id is absent', () => {
    expect(
      matchesFathomAgendaExclusion([EXCLUSION], {
        title: '  Weekly campaign-review! ',
        scheduled_start_time: '2026-07-30T17:05:00.000Z',
      }),
    ).toBe(true)
  })

  it('does not suppress a different occurrence with the same title', () => {
    expect(
      matchesFathomAgendaExclusion([EXCLUSION], {
        title: 'Weekly Campaign Review',
        scheduled_start_time: '2026-08-06T17:00:00.000Z',
      }),
    ).toBe(false)
  })

  it('adds and restores one occurrence without changing the others', () => {
    const second = { ...EXCLUSION, key: 'second', eventId: 'event-2' }
    expect(updateFathomAgendaExclusions([second], EXCLUSION, true)).toEqual([second, EXCLUSION])
    expect(updateFathomAgendaExclusions([second, EXCLUSION], EXCLUSION, false)).toEqual([second])
  })
})
