import { describe, expect, it, vi } from 'vitest'
import { ArtifactCalendarService } from './artifact-calendar.service'

function target() {
  return {
    mainApiCall: vi.fn(async () => ({ success: true })),
  }
}

describe('ArtifactCalendarService', () => {
  it('lists calendar events through the integrations agenda endpoint', async () => {
    const service = new ArtifactCalendarService()
    const t = target()

    await service.getHandlers(t).list_calendar_events(
      {
        start: '2026-06-18T00:00:00.000Z',
        end: '2026-06-19T00:00:00.000Z',
        timezone: 'Asia/Nicosia',
        provider: 'google_calendar',
      },
      'session-key',
    )

    expect(t.mainApiCall).toHaveBeenCalledWith(
      'GET',
      '/api/integrations/calendar/agenda?start=2026-06-18T00%3A00%3A00.000Z&end=2026-06-19T00%3A00%3A00.000Z&timezone=Asia%2FNicosia&provider=google_calendar',
      'session-key',
    )
  })

  it('creates provider calendar events through the calendar events endpoint', async () => {
    const service = new ArtifactCalendarService()
    const t = target()

    await service.getHandlers(t).create_calendar_event(
      {
        provider: 'outlook',
        title: 'Review launch tasks',
        start: '2026-06-18T10:00:00.000Z',
        end: '2026-06-18T10:30:00.000Z',
        timezone: 'Asia/Nicosia',
      },
      'session-key',
    )

    expect(t.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/integrations/calendar/events',
      'session-key',
      {
        provider: 'outlook',
        title: 'Review launch tasks',
        start: '2026-06-18T10:00:00.000Z',
        end: '2026-06-18T10:30:00.000Z',
        timezone: 'Asia/Nicosia',
      },
    )
  })

  it('encodes provider event ids for update and delete paths', async () => {
    const service = new ArtifactCalendarService()
    const t = target()

    await service.getHandlers(t).update_calendar_event(
      { provider: 'google_calendar', event_id: 'google:event/123', end: '2026-06-18T11:00:00Z' },
      'session-key',
    )
    await service.getHandlers(t).delete_calendar_event(
      { provider: 'google_calendar', event_id: 'google:event/123' },
      'session-key',
    )

    expect(t.mainApiCall).toHaveBeenNthCalledWith(
      1,
      'PATCH',
      '/api/integrations/calendar/events/google_calendar/google%3Aevent%2F123',
      'session-key',
      { end: '2026-06-18T11:00:00Z' },
    )
    expect(t.mainApiCall).toHaveBeenNthCalledWith(
      2,
      'DELETE',
      '/api/integrations/calendar/events/google_calendar/google%3Aevent%2F123',
      'session-key',
    )
  })
})
