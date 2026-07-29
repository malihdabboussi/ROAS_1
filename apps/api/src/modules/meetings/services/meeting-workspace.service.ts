import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import { ConversationsService } from '../../conversations/services/conversations.service'
import { MeetingWorkspaceReadRepository } from '../repositories/meeting-workspace-read.repository'
import {
  MeetingWorkspaceResolutionRepository,
  type ScheduledMeetingEvent,
} from '../repositories/meeting-workspace-resolution.repository'
import { MeetingWorkspaceStateRepository } from '../repositories/meeting-workspace-state.repository'
import { MeetingWorkspaceRepository } from '../repositories/meeting-workspace.repository'

@Injectable()
export class MeetingWorkspaceService {
  constructor(
    private readonly repository: MeetingWorkspaceRepository,
    private readonly resolutionRepository: MeetingWorkspaceResolutionRepository,
    private readonly readRepository: MeetingWorkspaceReadRepository,
    private readonly stateRepository: MeetingWorkspaceStateRepository,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesRepository,
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
    const scopedInput = { ...input, orgId }
    const existing = await this.resolutionRepository.findByCalendarEvent(
      supabase,
      input.spaceId,
      input.event.calendarEventId,
    )
    const meetingItemId = text(existing?.meeting_item_id)
    const meeting =
      meetingItemId === null
        ? await this.resolutionRepository.createScheduledMeeting(supabase, scopedInput)
        : { id: meetingItemId, title: input.event.title }
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

  async getWorkspace(
    supabase: SupabaseClient,
    input: { spaceId: string; meetingItemId: string },
  ): Promise<Record<string, unknown>> {
    const workspace = await this.readRepository.getWorkspaceBundle(supabase, input)
    if (!workspace) throw new NotFoundException('Meeting not found')
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
    return this.stateRepository.updateAction(supabase, input)
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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
