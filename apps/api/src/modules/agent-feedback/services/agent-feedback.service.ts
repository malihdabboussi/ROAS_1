import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { ConversationPermissionsService } from '../../conversations/services/conversation-permissions.service'
import type {
  AgentFeedbackLookupTarget,
  SaveAgentFeedbackDto,
} from '../dto/agent-feedback.dto'
import { AgentFeedbackRepository } from '../repositories/agent-feedback.repository'

interface ResolvedTarget {
  orgId: string | null
  agentKey: string
  targetContext: Record<string, unknown>
}

@Injectable()
export class AgentFeedbackService {
  constructor(
    private readonly repository: AgentFeedbackRepository,
    private readonly conversationPermissions: ConversationPermissionsService,
  ) {}

  async saveFeedback(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    dto: SaveAgentFeedbackDto,
  ) {
    const resolved = await this.resolveTarget(supabase, userId, scope, dto)
    return this.repository.upsertFeedback(supabase, {
      user_id: userId,
      org_id: resolved.orgId,
      target_kind: dto.target_kind,
      target_id: dto.target_id,
      agent_key: resolved.agentKey,
      thumbs_up: dto.thumbs_up,
      tags: dto.tags ?? [],
      feedback_text: this.cleanText(dto.feedback_text),
      source_surface: dto.source_surface,
      target_context: resolved.targetContext,
    })
  }

  async lookupFeedback(
    supabase: SupabaseClient,
    userId: string,
    targets: AgentFeedbackLookupTarget[],
  ) {
    const feedback = await this.repository.lookupFeedback(supabase, userId, targets)
    return { feedback }
  }

  private async resolveTarget(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    dto: SaveAgentFeedbackDto,
  ): Promise<ResolvedTarget> {
    if (dto.target_kind === 'conversation_message') {
      return this.resolveConversationMessage(supabase, userId, scope, dto.target_id)
    }
    if (dto.target_kind === 'space_item_activity') {
      return this.resolveSpaceItemActivity(supabase, scope, dto.target_id)
    }
    return this.resolveMissionLog(supabase, scope, dto.target_id)
  }

  private async resolveConversationMessage(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    messageId: string,
  ): Promise<ResolvedTarget> {
    const message = await this.repository.findConversationMessage(supabase, messageId)
    if (!message) throw new NotFoundException('Feedback target message not found')
    if (message.role !== 'assistant') {
      throw new BadRequestException('Feedback target must be an assistant message')
    }
    const conversation = this.firstRelated(message.conversations)
    const conversationId = String(message.conversation_id ?? conversation?.id ?? '')
    if (!conversationId) throw new BadRequestException('Feedback target conversation missing')
    await this.conversationPermissions.assertCanAccessConversation(
      supabase,
      userId,
      scope.orgRole,
      conversationId,
      'view',
      scope.orgId,
    )
    const metadata = this.record(message.metadata)
    const agentKey =
      this.stringValue(metadata.agent_key) ??
      this.stringValue(conversation?.agent_id) ??
      'vibey'
    return {
      orgId: this.stringValue(conversation?.org_id) ?? scope.orgId ?? null,
      agentKey,
      targetContext: {
        conversation_id: conversationId,
        campaign_id: this.stringValue(conversation?.campaign_id),
        message_created_at: this.stringValue(message.created_at),
      },
    }
  }

  private async resolveSpaceItemActivity(
    supabase: SupabaseClient,
    scope: RequestScope,
    activityId: string,
  ): Promise<ResolvedTarget> {
    const activity = await this.repository.findSpaceItemActivity(supabase, activityId)
    if (!activity) throw new NotFoundException('Feedback target activity not found')
    this.assertOrgMatches(scope, this.stringValue(activity.org_id))
    const payload = this.record(activity.payload)
    const eventType = this.stringValue(activity.event_type)
    const actorKind = this.stringValue(activity.actor_kind)
    if (actorKind !== 'agent' && eventType !== 'agent_task_execution') {
      throw new BadRequestException('Feedback target must be an agent task activity')
    }
    return {
      orgId: this.stringValue(activity.org_id) ?? scope.orgId ?? null,
      agentKey: this.stringValue(payload.agent_key) ?? 'agent',
      targetContext: {
        space_id: this.stringValue(activity.space_id),
        item_id: this.stringValue(activity.item_id),
        event_type: eventType,
        created_at: this.stringValue(activity.created_at),
      },
    }
  }

  private async resolveMissionLog(
    supabase: SupabaseClient,
    scope: RequestScope,
    logId: string,
  ): Promise<ResolvedTarget> {
    const log = await this.repository.findMissionLog(supabase, logId)
    if (!log) throw new NotFoundException('Feedback target mission log not found')
    this.assertOrgMatches(scope, this.stringValue(log.org_id))
    const payload = this.record(log.payload)
    const eventType = this.stringValue(log.event_type)
    const agentKey = this.stringValue(log.agent_key) ?? this.stringValue(payload.agent_key)
    if (!agentKey && eventType !== 'mission.progress') {
      throw new BadRequestException('Feedback target must be an agent mission log')
    }
    return {
      orgId: this.stringValue(log.org_id) ?? scope.orgId ?? null,
      agentKey: agentKey ?? 'agent',
      targetContext: {
        mission_id: this.stringValue(log.mission_id),
        event_type: eventType,
        created_at: this.stringValue(log.created_at),
      },
    }
  }

  private assertOrgMatches(scope: RequestScope, targetOrgId: string | null): void {
    if (!targetOrgId || !scope.orgId) return
    if (targetOrgId !== scope.orgId) {
      throw new ForbiddenException('Feedback target is outside the active organization')
    }
  }

  private cleanText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private firstRelated(value: unknown): Record<string, unknown> | null {
    if (Array.isArray(value)) return this.record(value[0])
    return this.record(value)
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null
  }
}
