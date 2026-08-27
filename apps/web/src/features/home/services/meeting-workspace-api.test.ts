import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import {
  addMeetingSnippet,
  ensureMeetingConversation,
  fetchMeetingWorkspaceEvent,
  materializeScheduledMeetings,
  resolveScheduledMeeting,
  toggleMeetingActionStatus,
} from './meeting-workspace-api'

const mocks = vi.hoisted(() => ({
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
  updateSpaceItem: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
  backendPatch: mocks.backendPatch,
  backendPost: mocks.backendPost,
}))

vi.mock('@/lib/spaces/spaces-api', () => ({ updateSpaceItem: mocks.updateSpaceItem }))

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset()
})

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

  it('stamps the persisted meeting item id even when the lookup used another identity', async () => {
    mocks.backendGet.mockResolvedValue({
      meeting: {
        id: 'call-9',
        title: 'Client review',
        description: null,
        source: 'google_calendar',
        custom_data: { calendar_event_id: 'calendar-9' },
      },
      workspace: null,
      recordings: [],
      actions: [],
      snippets: [],
      deliverables: [],
      context_links: [],
      continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
    })

    await expect(fetchMeetingWorkspaceEvent('space-1', 'calendar-9')).resolves.toEqual(
      expect.objectContaining({
        id: 'calendar-9',
        related: expect.objectContaining({ call_item_id: 'call-9' }),
      }),
    )
  })
})

describe('meeting workspace API', () => {
  it('ensures the meeting chat without starting the call', async () => {
    mocks.backendPost.mockResolvedValue({ conversation_id: 'conversation-1' })

    await ensureMeetingConversation('space-1', 'meeting-1')

    expect(mocks.backendPost).toHaveBeenCalledWith(
      '/api/spaces/space-1/meetings/meeting-1/conversation',
      {},
    )
  })

  it('unwraps a newly saved note so the UI can render it immediately', async () => {
    const snippet = {
      id: 'note-1',
      source_type: 'observation',
      text: 'Deck: https://docs.google.com/presentation/d/example',
      source_label: null,
      created_at: '2026-08-13T20:00:00.000Z',
    }
    mocks.backendPost.mockResolvedValue({
      snippet,
      conversation_id: 'conversation-1',
      message_id: 'message-1',
    })

    await expect(
      addMeetingSnippet('space-1', 'meeting-1', { text: snippet.text }),
    ).resolves.toEqual(snippet)
  })

  it('updates a mirrored follow-up through the canonical task endpoint', async () => {
    mocks.updateSpaceItem.mockResolvedValue({ updated_at: '2026-08-13T20:00:00.000Z' })
    const action = {
      id: 'task-1',
      title: 'Send notes',
      source_type: 'provider' as const,
      status: 'confirmed',
      canonical_assignee_name: 'Dylan',
      canonical_assignee_email: null,
      evidence: { origin: 'meetings_space_follow_up' },
    }

    const result = await toggleMeetingActionStatus('space-1', 'meeting-1', action)

    expect(mocks.updateSpaceItem).toHaveBeenCalledWith(
      'space-1',
      'task-1',
      expect.objectContaining({ status: 'done' }),
    )
    expect(result.status).toBe('resolved')
    expect(result.evidence.completion_origin).toEqual(expect.objectContaining({ kind: 'user' }))
  })
})

describe('materializeScheduledMeetings', () => {
  it('normalises all-day dates and drops values the API would reject instead of failing the whole batch', async () => {
    mocks.backendPost.mockResolvedValue({ created: 0, linked: 0, skipped: 0 })

    await materializeScheduledMeetings('space-1', [
      {
        ...baseEvent,
        title: '   ',
        start: '2026-08-01',
        end: '2026-08-04',
        all_day: true,
        video_url: 'not a url',
        html_link: 'https://calendar.google.com/event?eid=abc',
        attendees: [
          { email: 'ok@example.com', name: 'Ok', response_status: 'accepted', self: false },
          { email: 'Room 4B (no email)', name: null, response_status: null, self: false },
        ] as never,
        organizer: { email: 'resource-calendar', name: 'Room' },
      },
    ])

    expect(mocks.backendPost).toHaveBeenCalledWith('/api/spaces/space-1/meetings/materialize', {
      events: [
        expect.objectContaining({
          title: 'Untitled meeting',
          start: new Date('2026-08-01').toISOString(),
          end: new Date('2026-08-04').toISOString(),
          video_url: null,
          html_link: 'https://calendar.google.com/event?eid=abc',
          attendees: [{ email: 'ok@example.com', name: 'Ok' }],
          organizer: null,
        }),
      ],
    })
  })
})
