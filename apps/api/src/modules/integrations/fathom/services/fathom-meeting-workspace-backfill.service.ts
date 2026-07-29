import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MeetingRecordingBackfillRepository,
  type MeetingRecordingBackfillCursor,
} from '../../../meetings/repositories/meeting-recording-backfill.repository'
import { MeetingSourceIngestionService } from '../../../meetings/services/meeting-source-ingestion.service'
import { FathomApiService } from './fathom-api.service'

type BackfillResult = {
  scanned: number
  repaired: number
  unavailable: number
  failed: number
  next_cursor: MeetingRecordingBackfillCursor | null
  failures: Array<{ recording_id: string; error: string }>
}

@Injectable()
export class FathomMeetingWorkspaceBackfillService {
  private readonly logger = new Logger(FathomMeetingWorkspaceBackfillService.name)

  constructor(
    private readonly api: FathomApiService,
    private readonly repository: MeetingRecordingBackfillRepository,
    private readonly ingestion: MeetingSourceIngestionService,
  ) {}

  async backfillMissingTranscripts(
    supabase: SupabaseClient,
    input: { userId: string; limit: number; cursor?: MeetingRecordingBackfillCursor },
  ): Promise<BackfillResult> {
    const rows = await this.repository.listMissingTranscripts(supabase, input)
    const lastRow = rows.at(-1)
    const lastCreatedAt = text(lastRow?.created_at)
    const lastId = text(lastRow?.id)
    const result: BackfillResult = {
      scanned: rows.length,
      repaired: 0,
      unavailable: 0,
      failed: 0,
      next_cursor:
        rows.length === input.limit && lastCreatedAt && lastId
          ? { createdAt: lastCreatedAt, id: lastId }
          : null,
      failures: [],
    }
    for (const row of rows) {
      const recordingId = text(row.external_recording_id)
      const meetingItemId = text(row.meeting_item_id)
      const spaceId = text(row.space_id)
      if (!recordingId || !meetingItemId || !spaceId) {
        this.recordFailure(result, recordingId ?? 'unknown', 'Missing canonical meeting identity')
        continue
      }
      try {
        const transcriptResult = await this.api.getRecordingTranscript(
          supabase,
          input.userId,
          recordingId,
        )
        if (
          !Array.isArray(transcriptResult.transcript) ||
          transcriptResult.transcript.length === 0
        ) {
          result.unavailable += 1
          continue
        }
        const summaryResult = await this.api
          .getRecordingSummary(supabase, input.userId, recordingId)
          .catch(() => ({ summary: null }))
        await this.ingestion.ingestFathomSource(supabase, {
          meetingItemId,
          spaceId,
          userId: input.userId,
          orgId: text(row.org_id),
          calendarEventId: text(row.calendar_event_id),
          event: buildReplayEvent(row, transcriptResult.transcript, summaryResult.summary),
        })
        result.repaired += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`Meeting transcript backfill failed for ${recordingId}: ${message}`)
        this.recordFailure(result, recordingId, message)
      }
    }
    return result
  }

  private recordFailure(result: BackfillResult, recordingId: string, error: string): void {
    result.failed += 1
    result.failures.push({ recording_id: recordingId, error })
  }
}

function buildReplayEvent(
  row: Record<string, unknown>,
  transcript: Array<{ speaker?: { display_name?: string }; text?: string; timestamp?: string }>,
  summary: { template_name?: string; markdown_formatted?: string } | null,
): Record<string, unknown> {
  return {
    recording_id: text(row.external_recording_id),
    meeting_id: text(row.provider_meeting_id),
    calendar_event_id: text(row.calendar_event_id),
    title: text(row.title),
    url: text(row.recording_url),
    scheduled_start_time: text(row.scheduled_start_at),
    scheduled_end_time: text(row.scheduled_end_at),
    recording_start_time: text(row.recording_start_at),
    recording_end_time: text(row.recording_end_at),
    default_summary: summary,
    action_items: Array.isArray(row.provider_action_items) ? row.provider_action_items : [],
    calendar_invitees: Array.isArray(row.participant_emails)
      ? row.participant_emails.map((email) => ({ email }))
      : [],
    transcript,
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
