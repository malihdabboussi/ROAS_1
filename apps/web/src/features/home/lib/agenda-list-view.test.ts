import { describe, expect, it } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { dedupeAgendaEvents, pickNextAgendaEvent, splitTodayAgendaEvents } from './agenda-list-view'

function ev(
  partial: Partial<CalendarAgendaEvent> & Pick<CalendarAgendaEvent, 'id' | 'start' | 'end'>,
): CalendarAgendaEvent {
  return {
    title: partial.title ?? partial.id,
    all_day: false,
    location: null,
    video_url: null,
    video_label: null,
    html_link: null,
    color_id: null,
    attendees: [],
    source: 'google_calendar',
    ...partial,
  }
}

describe('agenda-list-view', () => {
  it('picks the next unfinished event', () => {
    const now = Date.parse('2026-07-20T18:00:00.000Z')
    const next = pickNextAgendaEvent(
      [
        ev({ id: 'past', start: '2026-07-20T15:00:00.000Z', end: '2026-07-20T15:30:00.000Z' }),
        ev({ id: 'soon', start: '2026-07-21T15:00:00.000Z', end: '2026-07-21T15:30:00.000Z' }),
        ev({ id: 'later', start: '2026-07-21T16:00:00.000Z', end: '2026-07-21T16:30:00.000Z' }),
      ],
      now,
    )
    expect(next?.id).toBe('soon')
  })

  it('does not promote a recording-only Fathom row as the next live meeting', () => {
    const now = Date.parse('2026-08-11T15:00:00.000Z')
    const next = pickNextAgendaEvent(
      [
        ev({
          id: 'recording',
          source: 'fathom',
          start: '2026-08-11T15:30:00.000Z',
          end: '2026-08-11T16:00:00.000Z',
        }),
        ev({
          id: 'calendar',
          start: '2026-08-11T16:30:00.000Z',
          end: '2026-08-11T17:00:00.000Z',
        }),
      ],
      now,
    )

    expect(next?.id).toBe('calendar')
  })

  it('splits earlier and later today around the next hero', () => {
    const now = Date.parse('2026-07-20T18:00:00.000Z')
    const keyFn = (e: CalendarAgendaEvent) => e.id
    const { earlier, later } = splitTodayAgendaEvents(
      [
        ev({ id: 'morning', start: '2026-07-20T14:00:00.000Z', end: '2026-07-20T14:30:00.000Z' }),
        ev({ id: 'next', start: '2026-07-20T19:00:00.000Z', end: '2026-07-20T19:30:00.000Z' }),
        ev({ id: 'evening', start: '2026-07-20T21:00:00.000Z', end: '2026-07-20T21:30:00.000Z' }),
      ],
      now,
      'next',
      keyFn,
    )
    expect(earlier.map((e) => e.id)).toEqual(['morning'])
    expect(later.map((e) => e.id)).toEqual(['evening'])
  })

  it('collapses near-duplicate 1DS weekly titles at the same slot', () => {
    const deduped = dedupeAgendaEvents([
      ev({
        id: 'a',
        title: '1DS / ROAS Weekly Check in',
        start: '2026-07-21T22:00:00.000Z',
        end: '2026-07-21T22:30:00.000Z',
        html_link: 'https://cal/a',
      }),
      ev({
        id: 'b',
        title: '1DS - ROAS Weekly Check in',
        start: '2026-07-21T22:00:00.000Z',
        end: '2026-07-21T22:30:00.000Z',
        video_url: 'https://zoom.us/j/1',
        html_link: 'https://cal/b',
      }),
      ev({
        id: 'c',
        title: '1DS x ROAS Weekly Session',
        start: '2026-07-21T22:00:00.000Z',
        end: '2026-07-21T22:30:00.000Z',
        html_link: 'https://cal/c',
      }),
    ])
    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.video_url).toBe('https://zoom.us/j/1')
  })
})
