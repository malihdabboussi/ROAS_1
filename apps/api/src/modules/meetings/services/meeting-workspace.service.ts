import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ConversationsService } from '../../conversations/services/conversations.service'
import { MeetingWorkspaceReadRepository } from '../repositories/meeting-workspace-read.repository'
import { MeetingWorkspaceStateRepository } from '../repositories/meeting-workspace-state.repository'
import { MeetingWorkspaceRepository } from '../repositories/meeting-workspace.repository'

@Injectable()
export class MeetingWorkspaceService {
  constructor(
    private readonly repository: MeetingWorkspaceRepository,
    private readonly readRepository: MeetingWorkspaceReadRepository,
    private readonly stateRepository: MeetingWorkspaceStateRepository,
    private readonly conversations: ConversationsService,
  ) {}

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
    let conversationId = text(workspace.conversation_id)
    if (!conversationId) {
      const conversation = await this.conversations.createConversation(
        supabase,
        input.userId,
        {
          title: `Meeting — ${String(meeting.title ?? 'Untitled')}`.slice(0, 500),
          metadata: {
            context_type: 'meeting',
            meeting_item_id: input.meetingItemId,
            space_id: input.spaceId,
          },
        },
        input.orgId,
      )
      conversationId = String(conversation.id)
    }
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
    await this.getWorkspace(supabase, input)
    return this.stateRepository.createSnippet(supabase, {
      ...input,
      authorName: null,
    })
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
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
