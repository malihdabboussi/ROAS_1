import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestUploadAttachment } from '../../shared/services/request-context.service'
import {
  ArtifactTasksRepository,
  type ArtifactTaskActivityInput,
} from '../repositories/artifact-tasks.repository'
import { parseConversationIdFromSessionKey } from './artifact-action.registry'

export type AgentActivityMeta = {
  actor_kind: 'agent'
  agent_message_id?: string | null
  tool_call_id?: string | null
}

const TASK_UPDATE_SCALAR_FIELDS = [
  'title',
  'priority',
  'start_date',
  'due_date',
  'sort_order',
  'parent_item_id',
  'description',
  'notes',
  'recurrence',
] as const

export class ArtifactTaskActivityHelper {
  constructor(private readonly tasksRepository: ArtifactTasksRepository) {}

  resolveAgentActivityMeta(target: Record<string, any>, sessionKey?: string): AgentActivityMeta {
    return {
      actor_kind: 'agent',
      agent_message_id:
        typeof target.resolveAgentMessageId === 'function'
          ? (target.resolveAgentMessageId(sessionKey) as string | null)
          : null,
      tool_call_id: null,
    }
  }

  buildDeleteConfirmBlock(input: {
    action: string
    entityType: string
    entityId: string
    entityName: string
  }) {
    return {
      type: 'delete_confirm',
      id: `delete-${input.entityType}-${input.entityId}-${Date.now()}`,
      delete_action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
      status: 'pending',
    }
  }

  buildTaskUpdateActivity(
    oldItem: Record<string, unknown>,
    updates: Record<string, unknown>,
    base: {
      item_id: string
      space_id: string
      user_id: string
      org_id: string | null
    },
  ): ArtifactTaskActivityInput[] {
    const entries: ArtifactTaskActivityInput[] = []
    const push = (event_type: string, payload: Record<string, unknown>) =>
      entries.push({ ...base, event_type, payload })

    if (updates.status !== undefined && updates.status !== oldItem.status) {
      // Match `diffUpdateActivity` in apps/api space-item-activity.helpers (string from/to, never null).
      push('status_change', {
        from: String(oldItem.status ?? ''),
        to: String(updates.status ?? ''),
      })
    }

    if (
      (updates.assignee_type !== undefined && updates.assignee_type !== oldItem.assignee_type) ||
      (updates.assignee_id !== undefined && updates.assignee_id !== oldItem.assignee_id) ||
      (updates.assignees !== undefined &&
        JSON.stringify(updates.assignees) !== JSON.stringify(oldItem.assignees ?? []))
    ) {
      push('assignee_change', {
        from: oldItem.assignees ?? [
          { type: oldItem.assignee_type ?? null, id: oldItem.assignee_id ?? null },
        ],
        to: {
          assignees: updates.assignees ?? oldItem.assignees ?? [],
          primary: {
            type: updates.assignee_type ?? oldItem.assignee_type ?? null,
            id: updates.assignee_id ?? oldItem.assignee_id ?? null,
          },
        },
      })
    }

    for (const field of TASK_UPDATE_SCALAR_FIELDS) {
      if (
        updates[field] !== undefined &&
        JSON.stringify(updates[field]) !== JSON.stringify(oldItem[field])
      ) {
        push('field_change', { field, from: oldItem[field] ?? null, to: updates[field] ?? null })
      }
    }

    if (updates.custom_data !== undefined) {
      const oldCustom = (oldItem.custom_data ?? {}) as Record<string, unknown>
      for (const [key, val] of Object.entries(
        (updates.custom_data ?? {}) as Record<string, unknown>,
      )) {
        const oldVal = oldCustom[key]
        if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
          push('field_change', { field: key, from: oldVal ?? null, to: val ?? null })
        }
      }
    }

    return entries
  }

  resolveTaskCreationAttachments(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Record<string, unknown>[] {
    if (input.attachments !== undefined) return this.normalizeActivityAttachments(input.attachments)
    const conversationId = parseConversationIdFromSessionKey(sessionKey)
    if (!conversationId) return []
    const uploaded =
      typeof target.requestContext?.getUploadedAttachments === 'function'
        ? (target.requestContext.getUploadedAttachments(
            conversationId,
          ) as RequestUploadAttachment[])
        : []
    return this.normalizeActivityAttachments(uploaded)
  }

  resolveSlackTaskProvenance(
    target: Record<string, any>,
    title: unknown,
    sessionKey?: string,
  ): Record<string, unknown> | null {
    const conversationId = parseConversationIdFromSessionKey(sessionKey)
    if (!conversationId || typeof target.requestContext?.get !== 'function') return null
    const context = target.requestContext.get(conversationId) as {
      channel?: unknown
      channelMember?: {
        platform_id?: unknown
        source_context?: Record<string, unknown> | null
      } | null
    } | null
    if (context?.channel !== 'slack') return null
    const source = context.channelMember?.source_context ?? {}
    const sourceId =
      typeof source.slack_message_ts === 'string' && source.slack_message_ts.trim()
        ? `slack:${String(source.slack_team_id ?? '')}:${String(source.slack_channel_id ?? '')}:${source.slack_message_ts}`
        : `slack:${conversationId}`
    return {
      source_kind: 'slack_thread',
      source_id: sourceId,
      source_excerpt:
        typeof source.source_excerpt === 'string' && source.source_excerpt.trim()
          ? source.source_excerpt.trim().slice(0, 500)
          : String(title ?? '')
              .trim()
              .slice(0, 500),
      conversation_id: conversationId,
      slack_team_id: source.slack_team_id ?? null,
      slack_channel_id: source.slack_channel_id ?? null,
      slack_thread_ts: source.slack_thread_ts ?? null,
      slack_message_ts: source.slack_message_ts ?? null,
      slack_user_id:
        typeof context.channelMember?.platform_id === 'string'
          ? context.channelMember.platform_id
          : null,
    }
  }

  async createActivity(
    supabase: SupabaseClient,
    input: ArtifactTaskActivityInput,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.tasksRepository.createActivity(supabase, input)
    if (error) throw error
    return data
  }

  async createActivities(
    supabase: SupabaseClient,
    inputs: ArtifactTaskActivityInput[],
  ): Promise<void> {
    if (inputs.length === 0) return
    const { error } = await this.tasksRepository.createActivities(supabase, inputs)
    if (error) throw error
  }

  private normalizeActivityAttachments(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return []
    return value.filter(
      (entry): entry is Record<string, unknown> =>
        !!entry && typeof entry === 'object' && !Array.isArray(entry),
    )
  }
}
