import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import { ConversationsService } from '../../conversations/services/conversations.service'
import {
  buildMeetingCallIdentity,
  resolveMeetingCallKind,
  shouldReplaceMeetingCallKind,
} from '../domain/meeting-call-kind'
import { buildMeetingConversationId } from '../domain/meeting-conversation-id'
import { buildFathomEventFromCallItem } from '../providers/build-fathom-event-from-call-item'
import { resolveCanonicalFathomTitle } from '../providers/fathom-meeting-source'
import { MeetingWorkspaceReadRepository } from '../repositories/meeting-workspace-read.repository'
import {
  MeetingWorkspaceResolutionRepository,
  type ScheduledMeetingEvent,
} from '../repositories/meeting-workspace-resolution.repository'
import { MeetingWorkspaceStateRepository } from '../repositories/meeting-workspace-state.repository'
import { MeetingWorkspaceRepository } from '../repositories/meeting-workspace.repository'
import { MeetingConversationDeduplicationService } from './meeting-conversation-deduplication.service'
import { MeetingSourceIngestionService } from './meeting-source-ingestion.service'

@Injectable()
export class MeetingWorkspaceService {
  private readonly logger = new Logger(MeetingWorkspaceService.name)

  constructor(
    private readonly repository: MeetingWorkspaceRepository,
    private readonly resolutionRepository: MeetingWorkspaceResolutionRepository,
    private readonly readRepository: MeetingWorkspaceReadRepository,
    private readonly stateRepository: MeetingWorkspaceStateRepository,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesRepository,
    @Optional() private readonly ingestion?: MeetingSourceIngestionService,
    @Optional() private readonly deduplication?: MeetingConversationDeduplicationService,
  ) {}

  async resolveScheduledMeeting(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      orgId: string | null
      event: ScheduledMeetingEvent
    },
  ): Promise<Record<string, unknown>> {
    const orgId = await this.resolutionRepository.findSpaceOrgId(supabase, input.spaceId)
    const profile = await this.resolutionRepository.findCallIdentityProfile(
      supabase,
      input.userId,
      orgId,
    )
    const identity = buildMeetingCallIdentity({
      email: profile.email,
      fathomAliases: profile.fathomAliases,
      fullName: profile.fullName,
      internalDomains: profile.internalDomains,
    })
    const callKind = resolveMeetingCallKind({
      identity,
      recordedByEmail: '',
      attendees: input.event.attendees,
      attendeeLabels: input.event.attendees.map(
        (attendee) => attendee.name?.trim() || attendee.email.trim(),
      ),
      titleHint: input.event.title,
      summary: input.event.description,
    })
    const scopedInput = { ...input, orgId, callKind }
    const existing = await this.resolutionRepository.findByCalendarEvent(
      supabase,
      input.spaceId,
      input.event.calendarEventId,
    )
    let meetingItemId = text(existing?.meeting_item_id)
    // Link to an existing Meetings call (Fathom or prior stub) before creating a
    // second calendar-sourced row for the same invite.
    let linkedExistingCall: Record<string, unknown> | null = null
    if (!meetingItemId) {
      linkedExistingCall = await this.resolutionRepository.findBestExistingCallForEvent(supabase, {
        spaceId: input.spaceId,
        userId: input.userId,
        calendarEventId: input.event.calendarEventId,
        title: input.event.title,
        start: input.event.start,
      })
      meetingItemId = text(linkedExistingCall?.id)
    }
    const meeting =
      meetingItemId === null
        ? await this.resolutionRepository.createScheduledMeeting(supabase, scopedInput)
        : {
            id: meetingItemId,
            title: String(linkedExistingCall?.title ?? input.event.title),
          }
    if (meetingItemId) {
      const customData = await this.resolutionRepository.findMeetingItemCustomData(
        supabase,
        meetingItemId,
      )
      if (shouldReplaceMeetingCallKind(customData)) {
        await this.resolutionRepository.updateMeetingItemCallKind(
          supabase,
          meetingItemId,
          customData,
          callKind,
        )
      }
    }
    let resolvedMeetingItemId = String(meeting.id)
    let workspace = existing
    if (!workspace) {
      try {
        workspace = await this.repository.upsertWorkspace(supabase, {
          meetingItemId: resolvedMeetingItemId,
          spaceId: input.spaceId,
          userId: input.userId,
          orgId,
          calendarEventId: input.event.calendarEventId,
          phase: 'scheduled',
        })
      } catch (error) {
        const racedWorkspace = await this.resolutionRepository.findByCalendarEvent(
          supabase,
          input.spaceId,
          input.event.calendarEventId,
        )
        const racedMeetingItemId = text(racedWorkspace?.meeting_item_id)
        if (!racedWorkspace || !racedMeetingItemId) throw error
        await this.resolutionRepository.deleteScheduledMeeting(
          supabase,
          resolvedMeetingItemId,
          input.event.calendarEventId,
        )
        workspace = racedWorkspace
        resolvedMeetingItemId = racedMeetingItemId
      }
    }
    await this.repository.upsertParticipantContextLinks(supabase, {
      meetingItemId: resolvedMeetingItemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId,
      participantEmails: input.event.attendees.map((attendee) => attendee.email),
    })
    const conversationId = await this.ensureConversation(supabase, {
      meetingItemId: resolvedMeetingItemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId,
      title: String(meeting.title ?? input.event.title),
      workspace,
    })
    return {
      space_id: input.spaceId,
      meeting_item_id: resolvedMeetingItemId,
      conversation_id: conversationId,
    }
  }

  async createInstantMeeting(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      orgId: string | null
      title: string
      attendeeEmails: string[]
    },
  ): Promise<Record<string, unknown>> {
    const orgId = await this.resolutionRepository.findSpaceOrgId(supabase, input.spaceId)
    const startedAt = new Date().toISOString()
    const meeting = await this.resolutionRepository.createInstantMeeting(supabase, {
      ...input,
      orgId,
      startedAt,
    })
    const meetingItemId = String(meeting.id)
    const workspace = await this.repository.upsertWorkspace(supabase, {
      meetingItemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId,
      calendarEventId: null,
      phase: 'live',
      liveStartedAt: startedAt,
    })
    await this.repository.upsertParticipantContextLinks(supabase, {
      meetingItemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId,
      participantEmails: input.attendeeEmails,
    })
    const conversationId = await this.ensureConversation(supabase, {
      meetingItemId,
      spaceId: input.spaceId,
      userId: input.userId,
      orgId,
      title: String(meeting.title ?? input.title),
      workspace,
    })
    return {
      space_id: input.spaceId,
      meeting_item_id: meetingItemId,
      conversation_id: conversationId,
    }
  }

  async requireMeeting(
    supabase: SupabaseClient,
    input: { spaceId: string; meetingItemId: string },
  ): Promise<Record<string, unknown>> {
    const workspace = await this.readRepository.getWorkspaceBundle(supabase, input)
    if (!workspace) throw new NotFoundException('Meeting not found')
    return normalizeWorkspaceDisplayTitles(workspace)
  }

  async getWorkspace(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      userId?: string
      orgId?: string | null
    },
  ): Promise<Record<string, unknown>> {
    let workspace = await this.requireMeeting(supabase, input)
    const recordings = Array.isArray(workspace.recordings) ? workspace.recordings : []
    if (recordings.length === 0) {
      const hydrated = await this.hydrateMissingRecording(supabase, input, workspace)
      if (hydrated) {
        workspace = await this.requireMeeting(supabase, input)
      }
    }
    const linkedConversationId = text(record(workspace.workspace).conversation_id)
    if (input.userId && linkedConversationId) {
      try {
        await this.deduplication?.archiveDuplicates(supabase, {
          userId: input.userId,
          meetingItemId: input.meetingItemId,
          keepConversationId: linkedConversationId,
          orgId: input.orgId,
        })
      } catch (error) {
        this.logger.warn(
          `Archive duplicate meeting chats failed for ${input.meetingItemId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }
    return workspace
  }

  async startCall(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      userId: string
      orgId: string | null
    },
  ): Promise<Record<string, unknown>> {
    const bundle = await this.getWorkspace(supabase, input)
    const meeting = record(bundle.meeting)
    let workspace = record(bundle.workspace)
    if (!workspace.meeting_item_id) {
      workspace = await this.repository.upsertWorkspace(supabase, {
        ...input,
        calendarEventId: text(record(meeting.custom_data).calendar_event_id),
      })
    }
    const conversationId = await this.ensureConversation(supabase, {
      ...input,
      title: String(meeting.title ?? 'Untitled'),
      workspace,
    })
    const isComplete = workspace.phase === 'complete'
    return this.stateRepository.updateWorkspace(supabase, input.meetingItemId, {
      phase: isComplete ? 'complete' : 'live',
      ...(isComplete
        ? {}
        : { live_started_at: workspace.live_started_at ?? new Date().toISOString() }),
      conversation_id: conversationId,
    })
  }

  async setPhase(
    supabase: SupabaseClient,
    meetingItemId: string,
    phase: 'scheduled' | 'live' | 'processing' | 'complete',
  ): Promise<Record<string, unknown>> {
    return this.stateRepository.updateWorkspace(supabase, meetingItemId, {
      phase,
      ...(phase === 'live' ? { live_started_at: new Date().toISOString() } : {}),
      ...(phase === 'processing' || phase === 'complete'
        ? { live_ended_at: new Date().toISOString() }
        : {}),
    })
  }

  async addSnippet(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      userId: string
      orgId: string | null
      sourceType: string
      text: string
      sourceRecordingId?: string | null
      occurredAt?: string | null
      sourceLabel?: string | null
    },
  ): Promise<Record<string, unknown>> {
    const bundle = await this.getWorkspace(supabase, input)
    const meeting = record(bundle.meeting)
    const workspace = record(bundle.workspace)
    const conversationId = await this.ensureConversation(supabase, {
      ...input,
      title: String(meeting.title ?? 'Untitled'),
      workspace,
    })
    const snippet = await this.stateRepository.createSnippet(supabase, {
      ...input,
      authorName: null,
    })
    const message = await this.messages.create(supabase, {
      conversation_id: conversationId,
      role: 'user',
      content: input.text,
      metadata: {
        meeting_item_id: input.meetingItemId,
        meeting_snippet_id: String(snippet.id),
        meeting_entry_type: input.sourceType,
        source_label: input.sourceLabel ?? null,
      },
    })
    return {
      snippet,
      conversation_id: conversationId,
      message_id: String(message.id),
    }
  }

  async updateAction(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      actionId: string
      patch: Record<string, unknown>
    },
  ): Promise<Record<string, unknown>> {
    await this.getWorkspace(supabase, input)
    return this.stateRepository.updateAction(supabase, {
      spaceId: input.spaceId,
      meetingItemId: input.meetingItemId,
      actionId: input.actionId,
      patch: input.patch,
    })
  }

  async createManualAction(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      userId: string
      orgId: string | null
      title: string
      assigneeName?: string | null
    },
  ): Promise<Record<string, unknown>> {
    await this.getWorkspace(supabase, input)
    return this.stateRepository.createManualAction(supabase, input)
  }

  private async hydrateMissingRecording(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      userId?: string
      orgId?: string | null
    },
    bundle: Record<string, unknown>,
  ): Promise<boolean> {
    // Same link the agenda already resolved: the opened call space_item's Fathom
    // identity in custom_data → meeting_recordings (no parallel Fathom list match).
    const meeting = record(bundle.meeting)
    const fromItem = buildFathomEventFromCallItem(meeting)
    if (!fromItem || !this.ingestion) return false

    const userId =
      text(input.userId) ??
      text(meeting.user_id) ??
      text(record(record(meeting.custom_data).external_automation).fathom_owner_user_id)
    if (!userId) return false
    const orgId = input.orgId !== undefined ? input.orgId : text(meeting.org_id)

    try {
      await this.ingestion.ingestFathomSource(supabase, {
        meetingItemId: input.meetingItemId,
        spaceId: input.spaceId,
        userId,
        orgId,
        calendarEventId: text(fromItem.calendar_event_id),
        event: fromItem,
      })
      return true
    } catch (error) {
      this.logger.warn(
        `Hydrate from agenda-linked call item failed for ${input.meetingItemId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return false
    }
  }

  private async ensureConversation(
    supabase: SupabaseClient,
    input: {
      meetingItemId: string
      spaceId: string
      userId: string
      orgId: string | null
      title: string
      workspace: Record<string, unknown>
    },
  ): Promise<string> {
    const existingConversationId = text(input.workspace.conversation_id)
    if (existingConversationId) return existingConversationId
    const conversation = await this.conversations.createConversation(
      supabase,
      input.userId,
      {
        id: buildMeetingConversationId(input.meetingItemId),
        title: `Meeting — ${input.title}`.slice(0, 500),
        metadata: {
          context_type: 'meeting',
          meeting_item_id: input.meetingItemId,
          space_id: input.spaceId,
        },
      },
      input.orgId,
    )
    const conversationId = String(conversation.id)
    await this.stateRepository.updateWorkspace(supabase, input.meetingItemId, {
      conversation_id: conversationId,
    })
    return conversationId
  }
}

export function normalizeWorkspaceDisplayTitles(
  workspace: Record<string, unknown>,
): Record<string, unknown> {
  const canonicalTitles = new Map<string, string>()
  const recordings: Array<Record<string, unknown>> = arrayOfRecords(workspace.recordings).map(
    (recording) => {
      const title = resolveCanonicalFathomTitle({
        rawTitle: text(recording.title),
        summary: text(recording.provider_summary),
      })
      const id = text(recording.id)
      if (id) canonicalTitles.set(id, title)
      return { ...recording, title }
    },
  )
  const primaryTitle =
    text(recordings.find((recording) => recording.is_primary === true)?.title) ??
    text(recordings[0]?.title)
  const deliverables = arrayOfRecords(workspace.deliverables).map((deliverable) => {
    const customData = record(deliverable.custom_data)
    const entryType = text(customData.entry_type)
    const recordingTitle = canonicalTitles.get(text(customData.meeting_recording_id) ?? '')
    if (entryType === 'meeting_transcript' && recordingTitle) {
      return { ...deliverable, title: `Transcript — ${recordingTitle}` }
    }
    if (entryType === 'meeting_recap' && primaryTitle) {
      return { ...deliverable, title: `Meeting recap — ${primaryTitle}` }
    }
    return deliverable
  })
  return { ...workspace, recordings, deliverables }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(record) : []
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
