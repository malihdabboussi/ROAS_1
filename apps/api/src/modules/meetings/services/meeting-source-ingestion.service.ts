import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveMeetingActionAssignees } from '../domain/meeting-assignee-identity'
import {
  reconcileMeetingRecordings,
  type MeetingRecordingCandidate,
} from '../domain/meeting-recording-reconciliation'
import { renderUnifiedMeetingRecap } from '../domain/meeting-unified-recap'
import {
  normalizeFathomMeetingSource,
  renderFathomTranscriptDocument,
} from '../providers/fathom-meeting-source'
import { MeetingRecapRepository } from '../repositories/meeting-recap.repository'
import { MeetingWorkspaceRepository } from '../repositories/meeting-workspace.repository'

type IngestFathomSourceInput = {
  meetingItemId: string
  spaceId: string
  userId: string
  orgId: string | null
  calendarEventId: string | null
  event: Record<string, unknown>
}

@Injectable()
export class MeetingSourceIngestionService {
  constructor(
    private readonly repository: MeetingWorkspaceRepository,
    private readonly recaps: MeetingRecapRepository,
  ) {}

  async findMatchingMeetingItem(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      event: Record<string, unknown>
    },
  ): Promise<string | null> {
    const source = normalizeFathomMeetingSource(input.event)
    const rows = await this.repository.listCandidateRecordings(supabase, {
      spaceId: input.spaceId,
      userId: input.userId,
      calendarEventId: source.calendarEventId,
      anchorAt: source.scheduledStart ?? source.recordingStart,
    })
    const rowsByMeeting = new Map<string, Record<string, unknown>[]>()
    for (const row of rows) {
      const meetingItemId = String(row.meeting_item_id ?? '').trim()
      if (!meetingItemId) continue
      const existing = rowsByMeeting.get(meetingItemId) ?? []
      existing.push(row)
      rowsByMeeting.set(meetingItemId, existing)
    }

    const matches: string[] = []
    const incoming = sourceToCandidate(source)
    for (const [meetingItemId, meetingRows] of rowsByMeeting) {
      const anchorRow = meetingRows[0]
      if (!anchorRow) continue
      const anchor = toCandidate(anchorRow)
      const result = reconcileMeetingRecordings(
        {
          calendarEventId: anchor.calendarEventId,
          title: anchor.title,
          scheduledStart: anchor.scheduledStart,
          scheduledEnd: anchor.scheduledEnd,
          participantEmails: anchor.participantEmails,
        },
        [incoming],
      )
      if (result.attached.length === 1) matches.push(meetingItemId)
    }

    return matches.length === 1 ? matches[0]! : null
  }

  async ingestFathomSource(
    supabase: SupabaseClient,
    input: IngestFathomSourceInput,
  ): Promise<{
    recording_id: string
    transcript_doc_item_id: string | null
    provider_action_ids: string[]
    primary_recording_id: string
    recap_doc_item_id: string
  }> {
    const source = normalizeFathomMeetingSource(input.event)
    const scope = {
      meetingItemId: input.meetingItemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId: input.orgId,
    }
    const calendarEventId = input.calendarEventId ?? source.calendarEventId
    await this.repository.upsertWorkspace(supabase, {
      ...scope,
      calendarEventId,
      phase: 'processing',
    })
    await this.repository.upsertParticipantContextLinks(supabase, {
      ...scope,
      participantEmails: source.participantEmails,
    })
    const recording = await this.repository.upsertRecording(supabase, { ...scope, source })
    const recordingId = String(recording.id)

    let transcriptDocItemId: string | null = null
    if (source.transcript.length > 0) {
      const document = await this.repository.upsertTranscriptDocument(supabase, {
        ...scope,
        recordingId,
        source,
        docBody: renderFathomTranscriptDocument(source),
      })
      transcriptDocItemId = String(document.id)
      await this.repository.linkTranscriptDocument(supabase, recordingId, transcriptDocItemId)
    }

    const assigneeCandidates = await this.repository.listAssigneeCandidates(supabase, {
      userId: input.userId,
      orgId: input.orgId,
    })
    const providerActionIds = await this.repository.upsertProviderActions(supabase, {
      ...scope,
      recordingId,
      actions: source.actions,
      assignees: resolveMeetingActionAssignees(source.actions, assigneeCandidates),
    })
    const recordings = await this.repository.listRecordings(supabase, input.meetingItemId)
    const candidates = recordings.map(toCandidate)
    const reconciliation = reconcileMeetingRecordings(
      {
        calendarEventId,
        title: source.title,
        scheduledStart: source.scheduledStart,
        scheduledEnd: source.scheduledEnd,
        participantEmails: source.participantEmails,
      },
      candidates,
    )
    const primaryExternalId =
      reconciliation.primary?.externalRecordingId ?? source.externalRecordingId
    const primaryRow = recordings.find(
      (row) => String(row.external_recording_id) === primaryExternalId,
    )
    const primaryRecordingId = String(primaryRow?.id ?? recordingId)
    await this.repository.setPrimaryRecording(supabase, input.meetingItemId, primaryRecordingId)
    const actions = await this.recaps.listActions(supabase, input.meetingItemId)
    const recapDocItemId = await this.recaps.upsertRecap(supabase, {
      ...scope,
      title: `Meeting recap — ${source.title}`.slice(0, 500),
      docBody: renderUnifiedMeetingRecap({
        title: source.title,
        recordings,
        actions,
      }),
    })
    await this.repository.upsertWorkspace(supabase, {
      ...scope,
      calendarEventId,
      phase: 'complete',
    })

    return {
      recording_id: recordingId,
      transcript_doc_item_id: transcriptDocItemId,
      provider_action_ids: providerActionIds,
      primary_recording_id: primaryRecordingId,
      recap_doc_item_id: recapDocItemId,
    }
  }
}

function toCandidate(row: Record<string, unknown>): MeetingRecordingCandidate {
  const actionItems = Array.isArray(row.provider_action_items) ? row.provider_action_items : []
  return {
    provider: String(row.provider ?? 'unknown'),
    externalRecordingId: String(row.external_recording_id ?? ''),
    calendarEventId: text(row.calendar_event_id),
    title: String(row.title ?? ''),
    scheduledStart: text(row.scheduled_start_at),
    scheduledEnd: text(row.scheduled_end_at),
    recordingStart: text(row.recording_start_at),
    recordingEnd: text(row.recording_end_at),
    participantEmails: Array.isArray(row.participant_emails)
      ? row.participant_emails.map((email) => String(email))
      : [],
    transcriptEntries: Number(row.transcript_entries ?? 0),
    hasSummary: Boolean(text(row.provider_summary)),
    actionItemCount: actionItems.length,
  }
}

function sourceToCandidate(
  source: ReturnType<typeof normalizeFathomMeetingSource>,
): MeetingRecordingCandidate {
  return {
    provider: source.provider,
    externalRecordingId: source.externalRecordingId,
    calendarEventId: source.calendarEventId,
    title: source.title,
    scheduledStart: source.scheduledStart,
    scheduledEnd: source.scheduledEnd,
    recordingStart: source.recordingStart,
    recordingEnd: source.recordingEnd,
    participantEmails: source.participantEmails,
    transcriptEntries: source.transcript.length,
    hasSummary: Boolean(source.providerSummary),
    actionItemCount: source.actions.length,
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
