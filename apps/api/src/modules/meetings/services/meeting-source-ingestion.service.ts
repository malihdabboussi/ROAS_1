import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmbeddingService } from '../../brain/services/embedding.service'
import {
  applyFathomActionRefinement,
  buildFathomActionRefinementPrompt,
  FATHOM_ACTION_REFINEMENT_SCHEMA,
  FATHOM_ACTION_REFINEMENT_SYSTEM_PROMPT,
} from '../domain/fathom-action-refinement'
import { resolveMeetingActionAssignees } from '../domain/meeting-assignee-identity'
import {
  buildMeetingCallIdentity,
  resolveMeetingCallKind,
  shouldReplaceMeetingCallKind,
} from '../domain/meeting-call-kind'
import { resolveMeetingHost } from '../domain/meeting-host'
import {
  reconcileMeetingRecordings,
  type MeetingRecordingCandidate,
} from '../domain/meeting-recording-reconciliation'
import { renderUnifiedMeetingRecap } from '../domain/meeting-unified-recap'
import {
  normalizeFathomMeetingSource,
  renderFathomTranscriptDocument,
  type FathomMeetingSource,
  type FathomSourceAction,
} from '../providers/fathom-meeting-source'
import { MeetingProviderActionsRepository } from '../repositories/meeting-provider-actions.repository'
import { MeetingRecapRepository } from '../repositories/meeting-recap.repository'
import { MeetingWorkspaceResolutionRepository } from '../repositories/meeting-workspace-resolution.repository'
import { MeetingWorkspaceStateRepository } from '../repositories/meeting-workspace-state.repository'
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
  private readonly logger = new Logger(MeetingSourceIngestionService.name)

  constructor(
    private readonly repository: MeetingWorkspaceRepository,
    private readonly providerActions: MeetingProviderActionsRepository,
    private readonly resolutionRepository: MeetingWorkspaceResolutionRepository,
    private readonly recaps: MeetingRecapRepository,
    private readonly stateRepository: MeetingWorkspaceStateRepository,
    @Optional() private readonly embeddingService?: EmbeddingService,
  ) {}

  /**
   * LLM judgment pass over raw Fathom actions (see fathom-action-refinement).
   * Any failure or missing LLM config falls back to the raw list — ingestion
   * must never depend on the model being available.
   */
  private async refineSourceActions(
    source: FathomMeetingSource,
    input: { userId: string; orgId: string | null },
  ): Promise<FathomSourceAction[]> {
    if (source.actions.length === 0 || !this.embeddingService) return source.actions
    try {
      const completion = await this.embeddingService.callGeminiWithUsage(
        buildFathomActionRefinementPrompt({
          actions: source.actions,
          transcript: source.transcript,
          providerSummary: source.providerSummary,
          meetingTitle: source.title,
          meetingStart: source.scheduledStart ?? source.recordingStart,
        }),
        FATHOM_ACTION_REFINEMENT_SYSTEM_PROMPT,
        { userId: input.userId, orgId: input.orgId },
        {
          maxOutputTokens: 4096,
          responseSchema: FATHOM_ACTION_REFINEMENT_SCHEMA as unknown as Record<string, unknown>,
        },
      )
      return applyFathomActionRefinement(source.actions, JSON.parse(completion.text))
    } catch (err) {
      this.logger.warn(
        `Fathom action refinement failed; using raw actions: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      return source.actions
    }
  }

  async findMatchingMeetingItem(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      event: Record<string, unknown>
    },
  ): Promise<string | null> {
    const source = normalizeFathomMeetingSource(input.event)
    if (source.calendarEventId) {
      const exactScheduled = await this.resolutionRepository.findByCalendarEvent(
        supabase,
        input.spaceId,
        source.calendarEventId,
      )
      const exactMeetingItemId = text(exactScheduled?.meeting_item_id)
      if (exactMeetingItemId) return exactMeetingItemId
    }
    const scheduledCandidates = await this.resolutionRepository.listMeetingCandidates(supabase, {
      spaceId: input.spaceId,
      userId: input.userId,
      anchorAt: source.scheduledStart ?? source.recordingStart,
    })
    const scheduledMatches = scheduledCandidates.filter((row) => {
      const result = reconcileMeetingRecordings(scheduledRowToCandidate(row), [
        sourceToCandidate(source),
      ])
      return result.attached.length === 1
    })
    if (scheduledMatches.length === 1) return String(scheduledMatches[0]?.id)

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
    await this.syncAutomaticCallKind(supabase, input, source)
    await this.syncCallItemFathomRecording(supabase, input, source)
    const existingWorkspace = await this.resolutionRepository.findByMeetingItem(
      supabase,
      input.meetingItemId,
    )
    const scope = {
      meetingItemId: input.meetingItemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId: input.orgId,
    }
    const calendarEventId =
      input.calendarEventId ?? source.calendarEventId ?? text(existingWorkspace?.calendar_event_id)
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
    const refinedActions = await this.refineSourceActions(source, {
      userId: input.userId,
      orgId: input.orgId,
    })
    const providerActionIds = await this.providerActions.upsertProviderActions(supabase, {
      ...scope,
      recordingId,
      actions: refinedActions,
      assignees: resolveMeetingActionAssignees(refinedActions, assigneeCandidates),
    })
    // Canonical Action items UI reads follow_up space_items — refined
    // commitments land there; raw Fathom items stay archived on the recording.
    await this.stateRepository.upsertProviderFollowUps(supabase, {
      ...scope,
      actions: refinedActions,
      meetingTitle: source.title,
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

  private async syncAutomaticCallKind(
    supabase: SupabaseClient,
    input: IngestFathomSourceInput,
    source: ReturnType<typeof normalizeFathomMeetingSource>,
  ): Promise<void> {
    const customData = await this.resolutionRepository.findMeetingItemCustomData(
      supabase,
      input.meetingItemId,
    )
    if (!shouldReplaceMeetingCallKind(customData)) return

    const profile = await this.resolutionRepository.findCallIdentityProfile(
      supabase,
      input.userId,
      input.orgId,
    )
    const identity = buildMeetingCallIdentity({
      email: profile.email,
      fathomAliases: profile.fathomAliases,
      fullName: profile.fullName,
      internalDomains: profile.internalDomains,
      internalEmails: [recordedByEmail(input.event)],
    })
    const callKind = resolveMeetingCallKind({
      identity,
      recordedByEmail: recordedByEmail(input.event),
      attendees: source.participantEmails.map((email) => ({ email })),
      attendeeLabels: attendeeLabels(input.event),
      titleHint: source.title,
      summary: source.providerSummary,
    })
    await this.resolutionRepository.updateMeetingItemCallKind(
      supabase,
      input.meetingItemId,
      customData,
      callKind,
    )
  }

  private async syncCallItemFathomRecording(
    supabase: SupabaseClient,
    input: IngestFathomSourceInput,
    source: ReturnType<typeof normalizeFathomMeetingSource>,
  ): Promise<void> {
    const customData = await this.resolutionRepository.findMeetingItemCustomData(
      supabase,
      input.meetingItemId,
    )
    await this.resolutionRepository.updateMeetingItemFathomRecording(
      supabase,
      input.meetingItemId,
      customData,
      {
        recordingUrl: source.recordingUrl,
        externalRecordingId: source.externalRecordingId,
        providerMeetingId: source.providerMeetingId,
        host: resolveMeetingHost({
          recordedBy: {
            email: recordedByEmail(input.event),
            name: text(record(input.event.recorded_by).name),
          },
        }),
      },
    )
  }
}

function scheduledRowToCandidate(row: Record<string, unknown>): MeetingRecordingCandidate {
  const customData = record(row.custom_data)
  const participantEmails = Array.isArray(customData.participant_emails)
    ? customData.participant_emails.map((email) => String(email))
    : []
  return {
    provider: 'calendar',
    externalRecordingId: `calendar:${String(row.id ?? '')}`,
    calendarEventId: text(customData.calendar_event_id),
    title: String(row.title ?? ''),
    scheduledStart: text(customData.call_date),
    scheduledEnd: text(customData.call_end),
    recordingStart: null,
    recordingEnd: null,
    participantEmails,
    transcriptEntries: 0,
    hasSummary: false,
    actionItemCount: 0,
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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function recordedByEmail(event: Record<string, unknown>): string {
  return text(event.recorded_by_email) ?? text(record(event.recorded_by).email) ?? ''
}

function attendeeLabels(event: Record<string, unknown>): string[] {
  const labels = new Set<string>()
  for (const key of ['calendar_invitees', 'attendees', 'invitees', 'shared_with']) {
    const rows = event[key]
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      const person = record(row)
      const label =
        text(person.name) ??
        text(person.display_name) ??
        text(person.matched_speaker_display_name) ??
        text(person.email)
      if (label) labels.add(label)
    }
  }
  return [...labels]
}
