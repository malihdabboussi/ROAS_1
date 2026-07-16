import { describe, expect, it } from 'vitest'
import {
  isEligiblePrecallEvent,
  localDayBounds,
  mapPrepItemToAgendaLink,
  scoreRelatedCallMatch,
} from '../meetings-precall-prep.helpers'

describe('meetings-precall-prep.helpers', () => {
  it('requires timed events with attendees or video', () => {
    expect(
      isEligiblePrecallEvent({
        id: '1',
        title: 'All day',
        start: '2026-07-16T00:00:00.000Z',
        end: '2026-07-17T00:00:00.000Z',
        all_day: true,
        video_url: null,
        attendees: [{ email: 'a@b.com' }],
      }),
    ).toBe(false)

    expect(
      isEligiblePrecallEvent({
        id: '2',
        title: 'Quick',
        start: '2026-07-16T16:00:00.000Z',
        end: '2026-07-16T16:10:00.000Z',
        all_day: false,
        video_url: 'https://meet.google.com/x',
        attendees: [],
      }),
    ).toBe(false)

    expect(
      isEligiblePrecallEvent({
        id: '3',
        title: 'Weekly',
        start: '2026-07-16T16:00:00.000Z',
        end: '2026-07-16T16:45:00.000Z',
        all_day: false,
        video_url: null,
        attendees: [{ email: 'nate@example.com', name: 'Nate' }],
      }),
    ).toBe(true)
  })

  it('maps prep item to agenda link', () => {
    expect(
      mapPrepItemToAgendaLink({
        id: 'item-1',
        space_id: 'space-1',
        title: 'Prep — Weekly',
        custom_data: { prep_status: 'ready', calendar_event_id: 'google:abc' },
      }),
    ).toEqual({
      status: 'ready',
      space_item_id: 'item-1',
      space_id: 'space-1',
      title: 'Prep — Weekly',
    })
  })

  it('computes local day bounds', () => {
    const { dayKey, startIso, endIso } = localDayBounds(
      new Date('2026-07-16T20:00:00.000Z'),
      'America/Los_Angeles',
    )
    expect(dayKey).toBe('2026-07-16')
    expect(new Date(startIso).getTime()).toBeLessThan(new Date(endIso).getTime())
  })

  it('scores related call matches by attendee overlap', () => {
    const event = {
      id: 'google:1',
      title: 'Nate Tilley & Dylan — Weekly Check-In',
      start: '2026-07-16T23:00:00.000Z',
      end: '2026-07-16T23:45:00.000Z',
      all_day: false,
      video_url: 'https://meet.google.com/x',
      attendees: [{ email: 'nate@example.com', name: 'Nate' }],
    }
    expect(
      scoreRelatedCallMatch(event, {
        title: 'Nate Tilley weekly',
        call_date: '2026-07-16T23:05:00.000Z',
        attendees: ['Nate Tilley', 'nate@example.com'],
      }),
    ).toBeGreaterThanOrEqual(10)
    expect(
      scoreRelatedCallMatch(event, {
        title: 'Unrelated',
        call_date: '2026-07-16T23:05:00.000Z',
        attendees: ['other@example.com'],
      }),
    ).toBe(0)
  })
})
