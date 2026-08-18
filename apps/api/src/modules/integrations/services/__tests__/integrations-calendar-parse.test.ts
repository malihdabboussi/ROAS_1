import { describe, expect, it } from 'vitest'
import { parseGoogleEventsListResponse } from '../integrations-calendar-parse'

describe('parseGoogleEventsListResponse', () => {
  it('skips cancelled items and keeps recurring instances', () => {
    const events = parseGoogleEventsListResponse({
      items: [
        {
          id: 'cancelled-id',
          status: 'cancelled',
          summary: 'Gone',
          start: { dateTime: '2026-08-18T16:00:00.000Z' },
          end: { dateTime: '2026-08-18T16:15:00.000Z' },
        },
        {
          id: 'weekly_20260818T161500Z',
          status: 'confirmed',
          summary: 'ROAS x Christian Osgood Weekly Standup',
          iCalUID: 'standup@google.com',
          start: { dateTime: '2026-08-18T16:15:00.000Z' },
          end: { dateTime: '2026-08-18T16:30:00.000Z' },
        },
      ],
    })
    expect(events.map((event) => event.title)).toEqual(['ROAS x Christian Osgood Weekly Standup'])
    expect(events[0]?.ical_uid).toBe('standup@google.com')
  })

  it('stamps the Google organizer as host identity', () => {
    const events = parseGoogleEventsListResponse({
      items: [
        {
          id: 'event-1',
          status: 'confirmed',
          summary: 'Client review',
          start: { dateTime: '2026-08-18T16:00:00.000Z' },
          end: { dateTime: '2026-08-18T16:30:00.000Z' },
          organizer: { email: 'dylan@roas.co', displayName: 'Dylan' },
        },
      ],
    })
    expect(events[0]?.organizer).toEqual({ email: 'dylan@roas.co', name: 'Dylan' })
  })
})
