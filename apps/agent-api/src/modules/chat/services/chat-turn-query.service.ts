import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import { ConversationPermissionsService } from '../../conversations/services/conversation-permissions.service'
import { ChatRunEventStoreService } from './chat-run-event-store.service'
import { MessageTimelineService, type TimelineEventRecord } from './message-timeline.service'
import { StreamRegistryService } from './stream-registry.service'

export interface ActiveTurnSnapshot {
  active: boolean
  messageId: string | null
  runId?: string | null
  resumeCursor?: string | null
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
    const memoryActive = this.streamRegistry.isActive(conversationId)
    const active = Boolean(activeRun) || memoryActive
    const messageId =
      activeRun?.messageId ??
      (memoryActive ? this.streamRegistry.getMessageId(conversationId) : null)
    const runId = activeRun?.runId ?? messageId
    const resumeCursor = activeRun?.lastCursor ?? null
    if (!messageId) return { active, messageId }

    const message = await this.messages.findById(supabase, messageId)
    if (!message || (message.conversation_id as string | undefined) !== conversationId) {
      return { active, messageId, runId, resumeCursor }
    }

    const timelineEvents = await this.messageTimeline.listEventsForMessage({
      userId,
      conversationId,
      messageId,
    })

    return { active, messageId, runId, resumeCursor, message, timelineEvents }
  }
}
