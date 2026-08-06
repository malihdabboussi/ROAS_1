import { describe, expect, it, vi } from 'vitest'
import { FathomMeetingWorkspaceAttachService } from './fathom-meeting-workspace-attach.service'

describe('FathomMeetingWorkspaceAttachService', () => {
  it('attaches a selected Fathom recording to the target meeting workspace', async () => {
    const api = {
      listMeetings: vi.fn().mockResolvedValue({
        items: [
          {
            recording_id: 'fathom-99',
            title: 'Aaron x Dylan x Nate',
            action_items: [{ description: 'Send the follow-up' }],
          },
        ],
      }),
      getRecordingTranscript: vi.fn().mockResolvedValue({
        transcript: [{ speaker: { display_name: 'Dylan' }, text: 'Hello', timestamp: '00:00' }],
      }),
      getRecordingSummary: vi.fn().mockResolvedValue({
        summary: { template_name: 'default', markdown_formatted: '## Recap' },
      }),
    }
    const meetings = {
      requireMeeting: vi.fn().mockResolvedValue({ meeting: { id: 'meeting-1' } }),
    }
    const ingestion = {
      ingestFathomSource: vi.fn().mockResolvedValue({
        recording_id: 'rec-row-1',
        primary_recording_id: 'rec-row-1',
        transcript_doc_item_id: 'doc-1',
        provider_action_ids: [],
        recap_doc_item_id: 'recap-1',
      }),
    }
    const service = new FathomMeetingWorkspaceAttachService(
      api as never,
      meetings as never,
      ingestion as never,
    )

    const result = await service.attachRecording({} as never, {
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      userId: 'user-1',
      orgId: 'org-1',
      meeting: {
        recording_id: 'fathom-99',
        title: 'Aaron x Dylan x Nate',
        url: 'https://fathom.video/calls/99',
      },
    })

    expect(meetings.requireMeeting).toHaveBeenCalledWith(
      {},
      { spaceId: 'space-1', meetingItemId: 'meeting-1' },
    )
    expect(api.getRecordingTranscript).toHaveBeenCalledWith({}, 'user-1', 'fathom-99')
    expect(api.getRecordingSummary).toHaveBeenCalledWith({}, 'user-1', 'fathom-99')
    expect(ingestion.ingestFathomSource).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        meetingItemId: 'meeting-1',
        spaceId: 'space-1',
        userId: 'user-1',
        orgId: 'org-1',
        event: expect.objectContaining({
          recording_id: 'fathom-99',
          action_items: [{ description: 'Send the follow-up' }],
          transcript: [{ speaker: { display_name: 'Dylan' }, text: 'Hello', timestamp: '00:00' }],
          default_summary: { template_name: 'default', markdown_formatted: '## Recap' },
        }),
      }),
    )
    expect(result).toEqual(
      expect.objectContaining({
        recording_id: 'rec-row-1',
        meeting_item_id: 'meeting-1',
        space_id: 'space-1',
      }),
    )
  })

  it('rejects meetings without a recording id', async () => {
    const service = new FathomMeetingWorkspaceAttachService(
      { getRecordingTranscript: vi.fn(), getRecordingSummary: vi.fn() } as never,
      { requireMeeting: vi.fn().mockResolvedValue({}) } as never,
      { ingestFathomSource: vi.fn() } as never,
    )

    await expect(
      service.attachRecording({} as never, {
        spaceId: 'space-1',
        meetingItemId: 'meeting-1',
        userId: 'user-1',
        orgId: null,
        meeting: { title: 'No id' },
      }),
    ).rejects.toThrow('meeting.recording_id (or id) is required')
  })
})
