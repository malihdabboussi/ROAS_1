import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncAgendaFathomRecordingToWorkspace } from './sync-agenda-fathom-recording'

const mocks = vi.hoisted(() => ({
  linkMeetingRecording: vi.fn(),
  listFathomMeetings: vi.fn(),
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  linkMeetingRecording: mocks.linkMeetingRecording,
}))

vi.mock('@/lib/brain', () => ({
  listFathomMeetings: mocks.listFathomMeetings,
}))

describe('syncAgendaFathomRecordingToWorkspace', () => {
  beforeEach(() => {
    mocks.linkMeetingRecording.mockReset()
    mocks.listFathomMeetings.mockReset()
  })

  it('links using the agenda related external_recording_id', async () => {
    mocks.linkMeetingRecording.mockResolvedValue({ success: true })
    const synced = await syncAgendaFathomRecordingToWorkspace({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      agendaEvent: {
        id: 'fathom:call-1',
        title: 'Aaron x Dylan x Nate',
        start: '2026-08-04T17:00:00.000Z',
        end: '2026-08-04T17:30:00.000Z',
        all_day: false,
        video_url: 'https://fathom.video/calls/1',
        video_label: 'Fathom',
        html_link: null,
        color_id: null,
        attendees: [],
        source: 'fathom',
        related: {
          space_id: 'space-1',
          call_item_id: 'call-1',
          title: 'Aaron x Dylan x Nate',
          recording_url: 'https://fathom.video/calls/1',
          external_recording_id: '170082749',
          follow_ups: [],
        },
      },
      bundle: {
        meeting: {
          id: 'meeting-1',
          title: 'Aaron x Dylan x Nate',
          description: null,
          custom_data: {},
        },
        workspace: null,
        recordings: [],
        actions: [],
        snippets: [],
        deliverables: [],
        context_links: [],
        continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
      },
    })

    expect(synced).toBe(true)
    expect(mocks.linkMeetingRecording).toHaveBeenCalledWith(
      'space-1',
      'meeting-1',
      expect.objectContaining({
        recording_id: '170082749',
        url: 'https://fathom.video/calls/1',
      }),
    )
    expect(mocks.listFathomMeetings).not.toHaveBeenCalled()
  })

  it('links from merged calendar card video_url even when source is not fathom', async () => {
    mocks.linkMeetingRecording.mockResolvedValue({ success: true })
    mocks.listFathomMeetings.mockResolvedValue({
      items: [
        {
          recording_id: '170082749',
          title: 'Aaron x Dylan x Nate',
          url: 'https://fathom.video/calls/170082749',
          share_url: null,
        },
      ],
    })

    const synced = await syncAgendaFathomRecordingToWorkspace({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      agendaEvent: {
        id: 'google:abc',
        title: 'AARON X DYLAN X NATE',
        start: '2026-08-04T17:00:00.000Z',
        end: '2026-08-04T17:30:00.000Z',
        all_day: false,
        video_url: 'https://fathom.video/calls/170082749',
        video_label: 'Fathom',
        html_link: null,
        color_id: null,
        attendees: [],
        source: 'google_calendar',
        related: null,
      },
      bundle: {
        meeting: {
          id: 'meeting-1',
          title: 'AARON X DYLAN X NATE',
          description: null,
          custom_data: {},
        },
        workspace: null,
        recordings: [],
        actions: [],
        snippets: [],
        deliverables: [],
        context_links: [],
        continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
      },
    })

    expect(synced).toBe(true)
    expect(mocks.listFathomMeetings).toHaveBeenCalled()
    expect(mocks.linkMeetingRecording).toHaveBeenCalledWith(
      'space-1',
      'meeting-1',
      expect.objectContaining({ recording_id: '170082749' }),
    )
  })

  it('does nothing when recordings are already present', async () => {
    const synced = await syncAgendaFathomRecordingToWorkspace({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      agendaEvent: {
        id: 'fathom:call-1',
        title: 'Call',
        start: '2026-08-04T17:00:00.000Z',
        end: '2026-08-04T17:30:00.000Z',
        all_day: false,
        video_url: 'https://fathom.video/calls/1',
        video_label: 'Fathom',
        html_link: null,
        color_id: null,
        attendees: [],
        source: 'fathom',
        related: {
          space_id: 'space-1',
          call_item_id: 'call-1',
          title: 'Call',
          recording_url: 'https://fathom.video/calls/1',
          external_recording_id: '99',
          follow_ups: [],
        },
      },
      bundle: {
        meeting: { id: 'meeting-1', title: 'Call', description: null, custom_data: {} },
        workspace: null,
        recordings: [
          {
            id: 'rec-1',
            title: 'Call',
            provider: 'fathom',
            recording_url: 'https://fathom.video/calls/1',
            duration_seconds: 60,
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
      },
    })

    expect(synced).toBe(false)
    expect(mocks.linkMeetingRecording).not.toHaveBeenCalled()
  })
})
