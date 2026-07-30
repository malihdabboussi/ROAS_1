import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole, SupabaseServiceClient } from '@vibey/api-shared'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import { ConversationPermissionsService } from '../../conversations/services/conversation-permissions.service'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'
import { classifyChatStreamError } from '../chat-stream-errors'
import { ChatRunEventStoreService } from './chat-run-event-store.service'
import { MessageTimelineService, type TimelineEventRecord } from './message-timeline.service'
import { StreamRegistryService } from './stream-registry.service'

export interface ActiveTurnSnapshot {
  active: boolean
  messageId: string | null
  runId?: string | null
  resumeCursor?: string | null
  lastEventAt?: string | null
  failureCode?: 'stream_interrupted' | 'context_window_exceeded'
  message?: Record<string, unknown> | null
  timelineEvents?: TimelineEventRecord[]
}

@Injectable()
export class ChatTurnQueryService {
  constructor(
    private readonly messages: MessagesRepository,
    private readonly conversationPermissions: ConversationPermissionsService,
    private readonly chatRunEvents: ChatRunEventStoreService,
    private readonly streamRegistry: StreamRegistryService,
    private readonly messageTimeline: MessageTimelineService,
    private readonly svc?: SupabaseServiceClient,
    private readonly runtimeRepository: ChatRuntimeRepository = new ChatRuntimeRepository(),
  ) {}

  async verifyConversationAccess(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
    requiredLevel: 'view' | 'edit' | 'admin' = 'view',
  ): Promise<boolean> {
    const level = await this.conversationPermissions.resolveEffectiveLevel(
      supabase,
      userId,
      orgRole,
      conversationId,
      orgId,
    )
    if (!level) return false
    const weights = { view: 1, edit: 2, admin: 3 } as const
    return weights[level] >= weights[requiredLevel]
  }

  async getActiveTurnSnapshot(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ): Promise<ActiveTurnSnapshot> {
    const hasAccess = await this.verifyConversationAccess(
      supabase,
      conversationId,
      userId,
      orgId,
      orgRole,
      'view',
    )
    if (!hasAccess) {
      throw new Error('Conversation not found')
    }

    const activeRun = await this.chatRunEvents
      .getActiveRunForConversation(conversationId)
      .catch(() => null)
    const latestDurableRun =
      activeRun || !this.svc
        ? null
        : await this.runtimeRepository
            .findLatestRuntimeRunForConversation(this.svc.client, conversationId)
            .catch(() => null)
    const durableFailure =
      latestDurableRun?.status === 'failed_recoverable' ? latestDurableRun : null
    const memoryActive = this.streamRegistry.isActive(conversationId)
    const active = Boolean(activeRun) || memoryActive
    const messageId =
      (activeRun?.messageId ??
        (memoryActive
          ? this.streamRegistry.getMessageId(conversationId)
          : typeof durableFailure?.message_id === 'string'
            ? durableFailure.message_id
            : null)) ??
      null
    const runId =
      activeRun?.runId ??
      (typeof durableFailure?.run_id === 'string' ? durableFailure.run_id : null) ??
      messageId
    const resumeCursor = activeRun?.lastCursor ?? null
    const lastEventAt = activeRun?.lastEventAt ?? null
    const durableFailureCode =
      typeof durableFailure?.error === 'string' &&
      classifyChatStreamError(durableFailure.error) === 'context_window_exceeded'
        ? ('context_window_exceeded' as const)
        : durableFailure
          ? ('stream_interrupted' as const)
          : undefined
    const activeFailureCode =
      typeof activeRun?.error === 'string'
        ? classifyChatStreamError(activeRun.error) === 'context_window_exceeded'
          ? ('context_window_exceeded' as const)
          : ('stream_interrupted' as const)
        : undefined
    const failureCode = activeFailureCode ?? durableFailureCode
    if (!messageId) return { active, messageId, failureCode, lastEventAt }

    const message = await this.messages.findById(supabase, messageId)
    if (!message || (message.conversation_id as string | undefined) !== conversationId) {
      return { active, messageId, runId, resumeCursor, failureCode, lastEventAt }
    }

    const timelineEvents = await this.messageTimeline.listEventsForMessage({
      userId,
      conversationId,
      messageId,
    })

    return {
      active,
      messageId,
      runId,
      resumeCursor,
      failureCode,
      lastEventAt,
      message,
      timelineEvents,
    }
  }
}
