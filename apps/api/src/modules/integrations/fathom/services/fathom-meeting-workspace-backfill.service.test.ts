import { describe, expect, it, vi } from 'vitest'
import { FathomMeetingWorkspaceBackfillService } from './fathom-meeting-workspace-backfill.service'

describe('FathomMeetingWorkspaceBackfillService', () => {
  it('fetches missing transcripts and reuses canonical meeting ingestion', async () => {
    const api = {
      getRecordingTranscript: vi.fn().mockResolvedValue({
        transcript: [{ speaker: { display_name: 'Dylan' }, text: 'Useful context' }],
      }),
      getRecordingSummary: vi.fn().mockResolvedValue({
        summary: { markdown_formatted: 'Summary' },
      }),
    }
    const repository = {
      listMissingTranscripts: vi.fn().mockResolvedValue([
        {
          id: 'recording-row',
          created_at: '2026-07-28T12:00:00.000Z',
          meeting_item_id: 'meeting-item',
          space_id: 'space',
          user_id: 'user',
          org_id: 'org',
          external_recording_id: '123',
          calendar_event_id: 'calendar-event',
          title: 'Team call',
          recording_url: 'https://fathom.video/calls/123',
          scheduled_start_at: '2026-07-28T10:00:00.000Z',
          scheduled_end_at: '2026-07-28T11:00:00.000Z',
          recording_start_at: '2026-07-28T10:01:00.000Z',
          recording_end_at: '2026-07-28T10:59:00.000Z',
          provider_action_items: [{ description: 'Follow up' }],
          participant_emails: ['dylan@example.com'],
        },
      ]),
    }
    const ingestion = {
      ingestFathomSource: vi.fn().mockResolvedValue({
        transcript_doc_item_id: 'transcript-doc',
      }),
    }
    const service = new FathomMeetingWorkspaceBackfillService(
      api as never,
      repository as never,
      ingestion as never,
    )

    const result = await service.backfillMissingTranscripts({} as never, {
      userId: 'user',
      limit: 25,
    })

    expect(result).toEqual({
      scanned: 1,
      repaired: 1,
      unavailable: 0,
      failed: 0,
      next_cursor: null,
      failures: [],
    })
    expect(api.getRecordingTranscript).toHaveBeenCalledWith({}, 'user', '123')
    expect(ingestion.ingestFathomSource).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        meetingItemId: 'meeting-item',
        spaceId: 'space',
        userId: 'user',
        orgId: 'org',
        calendarEventId: 'calendar-event',
        event: expect.objectContaining({
          recording_id: '123',
          transcript: [{ speaker: { display_name: 'Dylan' }, text: 'Useful context' }],
          default_summary: { markdown_formatted: 'Summary' },
        }),
      }),
    )
  })

  it('reports unavailable transcripts without duplicating meeting ingestion', async () => {
    const api = {
      getRecordingTranscript: vi.fn().mockResolvedValue({ transcript: [] }),
      getRecordingSummary: vi.fn(),
    }
    const repository = {
      listMissingTranscripts: vi.fn().mockResolvedValue([
        {
          meeting_item_id: 'meeting-item',
          space_id: 'space',
          external_recording_id: '456',
          created_at: '2026-07-28T11:00:00.000Z',
        },
      ]),
    }
    const ingestion = { ingestFathomSource: vi.fn() }
    const service = new FathomMeetingWorkspaceBackfillService(
      api as never,
      repository as never,
      ingestion as never,
    )

    const result = await service.backfillMissingTranscripts({} as never, {
      userId: 'user',
      limit: 10,
    })

    expect(result.unavailable).toBe(1)
    expect(result.failed).toBe(0)
    expect(ingestion.ingestFathomSource).not.toHaveBeenCalled()
  })

  it('returns a stable cursor so unavailable rows cannot block older recordings', async () => {
    const api = {
      getRecordingTranscript: vi.fn().mockResolvedValue({ transcript: [] }),
      getRecordingSummary: vi.fn(),
    }
    const repository = {
      listMissingTranscripts: vi.fn().mockResolvedValue([
        {
          meeting_item_id: 'meeting-item-1',
          space_id: 'space',
          external_recording_id: '1',
          id: 'recording-1',
          created_at: '2026-07-28T11:00:00.000Z',
        },
        {
          meeting_item_id: 'meeting-item-2',
          space_id: 'space',
          external_recording_id: '2',
          id: 'recording-2',
          created_at: '2026-07-28T10:00:00.000Z',
        },
      ]),
    }
    const service = new FathomMeetingWorkspaceBackfillService(
      api as never,
      repository as never,
      { ingestFathomSource: vi.fn() } as never,
    )

    const result = await service.backfillMissingTranscripts({} as never, {
      userId: 'user',
      limit: 2,
      cursor: {
        createdAt: '2026-07-28T12:00:00.000Z',
        id: 'recording-before',
      },
    })

    expect(repository.listMissingTranscripts).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        cursor: {
          createdAt: '2026-07-28T12:00:00.000Z',
          id: 'recording-before',
        },
      }),
    )
    expect(result.next_cursor).toEqual({
      createdAt: '2026-07-28T10:00:00.000Z',
      id: 'recording-2',
    })
    expect(result.unavailable).toBe(2)
  })
})
