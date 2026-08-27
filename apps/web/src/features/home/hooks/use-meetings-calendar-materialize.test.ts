import { describe, expect, it } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { uniqueMaterializableMeetingEvents } from './use-meetings-calendar-materialize'

function event(overrides: Partial<CalendarAgendaEvent> = {}): CalendarAgendaEvent {
  return {
    id: 'event-1',
    title: 'Client review',
    start: '2026-08-26T17:00:00.000Z',
    end: '2026-08-26T18:00:00.000Z',
    all_day: false,
    location: null,
    description: null,
    video_url: 'https://meet.google.com/abc-defg-hij',
    video_label: null,
    html_link: null,
    color_id: null,
    attendees: [],
    source: 'google_calendar',
    ...overrides,
  }
}

describe('uniqueMaterializableMeetingEvents', () => {
  it('excludes calendar notes and blocks without attendees or a meeting link', () => {
    expect(
      uniqueMaterializableMeetingEvents([
        event({ id: 'note', title: 'Agenda notes', video_url: null }),
        event({
          id: 'call',
          attendees: [{ email: 'client@example.com', name: 'Client', status: 'accepted' }],
        }),
      ]).map((row) => row.id),
    ).toEqual(['call'])
  })

  it('collapses the same invite returned through multiple calendar accounts', () => {
    const first = event({ id: 'account-a:event-1', ical_uid: 'shared-uid@example.com' })
    const second = event({ id: 'account-b:event-9', ical_uid: 'SHARED-UID@example.com' })

    expect(uniqueMaterializableMeetingEvents([first, second])).toEqual([first])
  })

  it('falls back to normalized title and start when iCal UID is missing', () => {
    const first = event({ id: 'one', ical_uid: null, title: 'Client Review!' })
    const second = event({ id: 'two', ical_uid: null, title: 'client-review' })

    expect(uniqueMaterializableMeetingEvents([first, second])).toEqual([first])
  })
})
