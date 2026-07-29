import { describe, expect, it, vi } from 'vitest'
import { MeetingSourceIngestionService } from './meeting-source-ingestion.service'

describe('MeetingSourceIngestionService', () => {
  it('resolves a second recording onto the existing canonical meeting', async () => {
    const repository = {
      listCandidateRecordings: vi.fn().mockResolvedValue([
        {
          id: 'source-precall',
          meeting_item_id: 'meeting-1',
          provider: 'fathom',
          external_recording_id: 'rec-precall',
          calendar_event_id: null,
          title: 'Dylan and Alex — Strategy Call',
          scheduled_start_at: '2026-07-28T17:00:00.000Z',
          scheduled_end_at: '2026-07-28T18:00:00.000Z',
          recording_start_at: '2026-07-28T16:55:00.000Z',
          recording_end_at: '2026-07-28T16:57:00.000Z',
          participant_emails: ['dylan@dylanvanas.com', 'alex@example.com'],
          transcript_entries: 12,
          provider_summary: 'Pre-call summary',
          provider_action_items: [{ description: 'Run the call' }],
        },
      ]),
    }
    const resolutionRepository = {
      findByCalendarEvent: vi.fn().mockResolvedValue(null),
      listScheduledMeetingCandidates: vi.fn().mockResolvedValue([]),
    }
    const service = new MeetingSourceIngestionService(
      repository as never,
      resolutionRepository as never,
      {} as never,
    )

    const result = await service.findMatchingMeetingItem({} as never, {
      spaceId: 'space-1',
      userId: 'user-1',
      event: {
        recording_id: 'rec-main',
        title: 'Dylan and Alex — Strategy Call',
        scheduled_start_time: '2026-07-28T17:00:00.000Z',
        scheduled_end_time: '2026-07-28T18:00:00.000Z',
        recording_start_time: '2026-07-28T17:00:00.000Z',
        recording_end_time: '2026-07-28T17:48:00.000Z',
        calendar_invitees: [{ email: 'dylan@dylanvanas.com' }, { email: 'alex@example.com' }],
      },
    })

    expect(result).toBe('meeting-1')
  })

  it('does not merge a recording when more than one canonical meeting matches', async () => {
    const candidate = {
      provider: 'fathom',
      calendar_event_id: null,
      title: 'Strategy Call',
      scheduled_start_at: '2026-07-28T17:00:00.000Z',
      scheduled_end_at: '2026-07-28T18:00:00.000Z',
      recording_start_at: '2026-07-28T17:00:00.000Z',
      recording_end_at: '2026-07-28T17:30:00.000Z',
      participant_emails: ['dylan@dylanvanas.com', 'alex@example.com'],
      transcript_entries: 10,
      provider_summary: null,
      provider_action_items: [],
    }
    const repository = {
      listCandidateRecordings: vi.fn().mockResolvedValue([
        {
          ...candidate,
          id: 'source-1',
          meeting_item_id: 'meeting-1',
          external_recording_id: 'rec-1',
        },
        {
          ...candidate,
          id: 'source-2',
          meeting_item_id: 'meeting-2',
          external_recording_id: 'rec-2',
        },
      ]),
    }
    const resolutionRepository = {
      findByCalendarEvent: vi.fn().mockResolvedValue(null),
      listScheduledMeetingCandidates: vi.fn().mockResolvedValue([]),
    }
    const service = new MeetingSourceIngestionService(
      repository as never,
      resolutionRepository as never,
      {} as never,
    )

    const result = await service.findMatchingMeetingItem({} as never, {
      spaceId: 'space-1',
      userId: 'user-1',
      event: {
        recording_id: 'rec-main',
        title: 'Strategy Call',
        scheduled_start_time: '2026-07-28T17:00:00.000Z',
        calendar_invitees: [{ email: 'dylan@dylanvanas.com' }, { email: 'alex@example.com' }],
      },
    })

    expect(result).toBeNull()
  })

  it('upserts one Fathom source, transcript deliverable, and exact provider actions', async () => {
    const repository = {
      upsertWorkspace: vi.fn().mockResolvedValue({ meeting_item_id: 'meeting-1' }),
      upsertParticipantContextLinks: vi.fn().mockResolvedValue(undefined),
      upsertRecording: vi.fn().mockResolvedValue({ id: 'source-1' }),
      upsertTranscriptDocument: vi.fn().mockResolvedValue({ id: 'doc-1' }),
      linkTranscriptDocument: vi.fn().mockResolvedValue(undefined),
      listAssigneeCandidates: vi.fn().mockResolvedValue([
        {
          type: 'user',
          id: 'user-1',
          name: 'Dylan Vanas',
          email: 'dylan@dylanvanas.com',
        },
      ]),
      upsertProviderActions: vi.fn().mockResolvedValue(['action-1']),
      listRecordings: vi.fn().mockResolvedValue([
        {
          id: 'source-1',
          provider: 'fathom',
          external_recording_id: 'rec-1',
          calendar_event_id: 'google:event-1',
          title: 'Strategy call',
          scheduled_start_at: '2026-07-28T17:00:00.000Z',
          scheduled_end_at: '2026-07-28T18:00:00.000Z',
          recording_start_at: '2026-07-28T17:00:00.000Z',
          recording_end_at: '2026-07-28T17:48:00.000Z',
          participant_emails: ['dylan@dylanvanas.com', 'alex@example.com'],
          transcript_entries: 2,
          provider_summary: 'Summary',
          provider_action_items: [{ description: 'Send the page' }],
        },
      ]),
      setPrimaryRecording: vi.fn().mockResolvedValue(undefined),
    }
    const recaps = {
      listActions: vi.fn().mockResolvedValue([
        {
          title: 'Send the page',
          canonical_assignee_name: 'Dylan Vanas',
        },
      ]),
      upsertRecap: vi.fn().mockResolvedValue('recap-1'),
    }
    const resolutionRepository = {
      findByMeetingItem: vi.fn().mockResolvedValue(null),
    }
    const service = new MeetingSourceIngestionService(
      repository as never,
      resolutionRepository as never,
      recaps as never,
    )

    const result = await service.ingestFathomSource({} as never, {
      meetingItemId: 'meeting-1',
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: null,
      calendarEventId: 'google:event-1',
      event: {
        recording_id: 'rec-1',
        title: 'Strategy call',
        url: 'https://fathom.video/share/rec-1',
        scheduled_start_time: '2026-07-28T17:00:00.000Z',
        scheduled_end_time: '2026-07-28T18:00:00.000Z',
        recording_start_time: '2026-07-28T17:00:00.000Z',
        recording_end_time: '2026-07-28T17:48:00.000Z',
        calendar_invitees: [{ email: 'dylan@dylanvanas.com' }, { email: 'alex@example.com' }],
        default_summary: { markdown_formatted: 'Summary' },
        action_items: [{ description: 'Send the page' }],
        transcript: [
          { speaker: { display_name: 'Alex' }, timestamp: '00:01', text: 'Hello' },
          { speaker: { display_name: 'Dylan' }, timestamp: '00:02', text: 'Hi' },
        ],
      },
    })

    expect(result).toEqual({
      recording_id: 'source-1',
      transcript_doc_item_id: 'doc-1',
      provider_action_ids: ['action-1'],
      primary_recording_id: 'source-1',
      recap_doc_item_id: 'recap-1',
    })
    expect(repository.upsertWorkspace).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ meetingItemId: 'meeting-1', phase: 'processing' }),
    )
    expect(repository.upsertWorkspace).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ meetingItemId: 'meeting-1', phase: 'complete' }),
    )
    expect(repository.upsertProviderActions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingItemId: 'meeting-1',
        recordingId: 'source-1',
        actions: [expect.objectContaining({ sourceKey: 'fathom:rec-1:action:0' })],
        assignees: expect.any(Map),
      }),
    )
    expect(repository.upsertParticipantContextLinks).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        participantEmails: ['dylan@dylanvanas.com', 'alex@example.com'],
      }),
    )
    expect(repository.setPrimaryRecording).toHaveBeenCalledWith(
      expect.anything(),
      'meeting-1',
      'source-1',
    )
    expect(recaps.upsertRecap).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingItemId: 'meeting-1',
        docBody: expect.stringContaining('Send the page — Dylan Vanas'),
      }),
    )
  })

  it('attaches the first Fathom recording to a matching scheduled calendar meeting', async () => {
    const repository = { listCandidateRecordings: vi.fn().mockResolvedValue([]) }
    const resolutionRepository = {
      findByCalendarEvent: vi.fn().mockResolvedValue(null),
      listScheduledMeetingCandidates: vi.fn().mockResolvedValue([
        {
          id: 'scheduled-meeting',
          title: 'Client strategy call',
          custom_data: {
            calendar_event_id: 'calendar-1',
            call_date: '2026-07-30T17:00:00.000Z',
            call_end: '2026-07-30T18:00:00.000Z',
            participant_emails: ['dylan@example.com', 'client@example.com'],
          },
        },
      ]),
    }
    const service = new MeetingSourceIngestionService(
      repository as never,
      resolutionRepository as never,
      {} as never,
    )

    const result = await service.findMatchingMeetingItem({} as never, {
      spaceId: 'space-1',
      userId: 'user-1',
      event: {
        recording_id: 'fathom-1',
        title: 'Client strategy call',
        scheduled_start_time: '2026-07-30T17:00:00.000Z',
        scheduled_end_time: '2026-07-30T18:00:00.000Z',
        calendar_invitees: [{ email: 'dylan@example.com' }, { email: 'client@example.com' }],
      },
    })

    expect(result).toBe('scheduled-meeting')
  })
})
