import { describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { resolveScheduledMeeting } from './meeting-workspace-api'

const mocks = vi.hoisted(() => ({ backendPost: vi.fn() }))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: mocks.backendPost,
}))

const baseEvent: CalendarAgendaEvent = {
  id: 'workspace:person-1:event-1',
  title: 'Client review',
  start: '2026-08-12T17:00:00.000Z',
  end: '2026-08-12T18:00:00.000Z',
  all_day: false,
  video_url: null,
  video_label: null,
  html_link: null,
  color_id: null,
  attendees: [],
  source: 'google_calendar',
}

describe('resolveScheduledMeeting', () => {
  it('sends the stable ical_uid so persistence does not key on the agenda row id', async () => {
    mocks.backendPost.mockResolvedValue({})

    await resolveScheduledMeeting('space-1', { ...baseEvent, ical_uid: 'uid-1@google.com' })

    expect(mocks.backendPost).toHaveBeenCalledWith(
      '/api/spaces/space-1/meetings/resolve',
      expect.objectContaining({
        calendar_event_id: 'workspace:person-1:event-1',
        ical_uid: 'uid-1@google.com',
      }),
    )
  })

  it('sends a null ical_uid when the agenda row has none', async () => {
    mocks.backendPost.mockResolvedValue({})

    await resolveScheduledMeeting('space-1', baseEvent)

    expect(mocks.backendPost).toHaveBeenCalledWith(
      '/api/spaces/space-1/meetings/resolve',
      expect.objectContaining({ ical_uid: null }),
    )
  })
})
