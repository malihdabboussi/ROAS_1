import { describe, expect, it, vi } from 'vitest'
import { fetchGoogleMultiCalendarAgenda } from '../integrations-calendar-google-agenda'

describe('fetchGoogleMultiCalendarAgenda', () => {
  it('loads the unified all-calendars feed without truncating or primary-only fallback', async () => {
    const executeTool = vi.fn().mockResolvedValue({
      data: {
        items: [{ id: 'secondary-event' }],
      },
    })
    const parseEvents = vi.fn().mockReturnValue([
      {
        id: 'google:secondary-event',
        title: 'Nate X Dylan BOW Huddle',
        start: '2026-08-10T17:00:00.000Z',
        end: '2026-08-10T17:50:00.000Z',
        all_day: false,
        video_url: null,
        video_label: null,
        html_link: null,
        color_id: null,
        attendees: [],
        source: 'google_calendar',
      },
    ])

    const result = await fetchGoogleMultiCalendarAgenda({
      executeTool,
      userId: 'user-1',
      connectionId: 'connection-1',
      start: '2026-08-10T07:00:00.000Z',
      end: '2026-08-11T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
      parseEvents,
    })

    expect(executeTool).toHaveBeenCalledTimes(1)
    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS',
      'user-1',
      expect.objectContaining({
        time_min: '2026-08-10T07:00:00.000Z',
        time_max: '2026-08-11T07:00:00.000Z',
        single_events: true,
        response_detail: 'full',
      }),
      'connection-1',
    )
    expect(result.events).toHaveLength(1)
    expect(result.errors).toEqual([])
  })

  it('returns an observable account error instead of silently falling back to primary', async () => {
    const executeTool = vi.fn().mockRejectedValue(new Error('Google authorization expired'))

    const result = await fetchGoogleMultiCalendarAgenda({
      executeTool,
      userId: 'user-1',
      connectionId: 'connection-1',
      start: '2026-08-10T07:00:00.000Z',
      end: '2026-08-11T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
      parseEvents: vi.fn().mockReturnValue([]),
    })

    expect(result.events).toEqual([])
    expect(result.errors).toEqual(['Google Calendar: Google authorization expired'])
  })
})
