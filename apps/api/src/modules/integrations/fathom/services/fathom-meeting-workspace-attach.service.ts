import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MeetingSourceIngestionService } from '../../../meetings/services/meeting-source-ingestion.service'
import { MeetingWorkspaceService } from '../../../meetings/services/meeting-workspace.service'
import { FathomApiService } from './fathom-api.service'

@Injectable()
export class FathomMeetingWorkspaceAttachService {
  constructor(
    private readonly api: FathomApiService,
    private readonly meetings: MeetingWorkspaceService,
    private readonly ingestion: MeetingSourceIngestionService,
  ) {}

  async attachRecording(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      userId: string
      orgId: string | null
      meeting: Record<string, unknown>
    },
  ): Promise<Record<string, unknown>> {
    await this.meetings.requireMeeting(supabase, {
      spaceId: input.spaceId,
      meetingItemId: input.meetingItemId,
    })

    const event = { ...input.meeting }
    const recordingId = firstText(event.recording_id, event.id, event.call_id)
    if (!recordingId) {
      throw new BadRequestException('meeting.recording_id (or id) is required')
    }

    await this.ensureTranscriptAndSummary(supabase, input.userId, recordingId, event)

    const result = await this.ingestion.ingestFathomSource(supabase, {
      meetingItemId: input.meetingItemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId: input.orgId,
      calendarEventId: firstText(event.calendar_event_id),
      event,
    })

    return {
      ...result,
      meeting_item_id: input.meetingItemId,
      space_id: input.spaceId,
    }
  }

  private async ensureTranscriptAndSummary(
    supabase: SupabaseClient,
    userId: string,
    recordingId: string,
    event: Record<string, unknown>,
  ): Promise<void> {
    const hasTranscript = Array.isArray(event.transcript) && event.transcript.length > 0
    if (!hasTranscript) {
      try {
        const transcriptResult = await this.api.getRecordingTranscript(
          supabase,
          userId,
          recordingId,
        )
        if (Array.isArray(transcriptResult.transcript) && transcriptResult.transcript.length > 0) {
          event.transcript = transcriptResult.transcript
        }
      } catch {
        // Linking still stores the recording/summary even when transcript is catching up.
      }
    }

    const summary = objectRecord(event.default_summary)
    if (!firstText(summary.markdown_formatted, event.summary, event.summary_text)) {
      try {
        const summaryResult = await this.api.getRecordingSummary(supabase, userId, recordingId)
        if (summaryResult.summary) event.default_summary = summaryResult.summary
      } catch {
        // Optional enrichment — attachment should not fail when summary is unavailable.
      }
    }
  }
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
