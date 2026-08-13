import { describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { fetchMeetingWorkspaceEvent, resolveScheduledMeeting } from './meeting-workspace-api'

const mocks = vi.hoisted(() => ({ backendGet: vi.fn(), backendPost: vi.fn() }))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
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

describe('fetchMeetingWorkspaceEvent', () => {
  it('rebuilds a route event from the persisted meeting identified by space and item', async () => {
    mocks.backendGet.mockResolvedValue({
      meeting: {
        id: 'call-9',
        title: 'Client review',
        description: 'Weekly scorecard',
        source: 'fathom',
        custom_data: {
          calendar_event_id: 'calendar-9',
          scheduled_start_at: '2026-07-30T17:00:00.000Z',
          scheduled_end_at: '2026-07-30T18:00:00.000Z',
        },
      },
      workspace: null,
      recordings: [
        {
          id: 'recording-1',
          title: 'Client review',
          provider: 'fathom',
          recording_url: 'https://example.com/recording',
          duration_seconds: 3600,
          is_primary: true,
          provider_summary: null,
          transcript_doc_item_id: null,
        },
      ],
      actions: [],
      snippets: [],
      deliverables: [],
      context_links: [],
      continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
    })

    await expect(fetchMeetingWorkspaceEvent('space-1', 'call-9')).resolves.toEqual(
      expect.objectContaining({
        id: 'calendar-9',
        title: 'Client review',
        start: '2026-07-30T17:00:00.000Z',
        end: '2026-07-30T18:00:00.000Z',
        source: 'fathom',
        related: expect.objectContaining({
          space_id: 'space-1',
          call_item_id: 'call-9',
          recording_url: 'https://example.com/recording',
        }),
      }),
    )
    expect(mocks.backendGet).toHaveBeenCalledWith('/api/spaces/space-1/meetings/call-9')
  })
})
