import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import type { TaskRollupItem } from '../../programs/dto/task-rollup.dto'
import { TaskRollupService } from '../../programs/services/task-rollup.service'
import { NextMovesRepository } from '../repositories/next-moves.repository'

const MAX_NEXT_MOVES = 12
const DAY_MS = 86_400_000

export type NextMoveSnoozeDuration = 'week' | 'dismiss'
export type NextMoveFeedback = 'accepted' | 'false_positive'

@Injectable()
export class NextMovesService {
  constructor(
    private readonly repository: NextMovesRepository,
    private readonly taskRollup: TaskRollupService,
  ) {}

  async list(supabase: SupabaseClient, scope: RequestScope) {
    const [tasks, snoozed] = await Promise.all([
      this.taskRollup.list(
        supabase,
        scope.userId,
        { view: 'my', limit: 100 },
        scope.orgId,
        scope.orgRole,
      ),
      this.repository.listSnoozedKeys(supabase, scope),
    ])
    const suggestions = tasks
      .filter((item) => !snoozed.has(this.key(item.id)))
      .slice(0, MAX_NEXT_MOVES)
      .map(toSuggestion)
    await this.repository.recordEvents(
      supabase,
      scope,
      suggestions.map((item) => ({
        taskId: item.id,
        eventType: 'surfaced' as const,
        sourceKind: item.source.sourceKind,
      })),
    )
    return { suggestions }
  }

  async snooze(
    supabase: SupabaseClient,
    scope: RequestScope,
    id: string,
    duration: NextMoveSnoozeDuration,
  ): Promise<{ success: true }> {
    await this.assertAssignedTask(supabase, scope, id)
    const days = duration === 'week' ? 7 : 3650
    const snoozedUntil = new Date(Date.now() + days * DAY_MS).toISOString()
    await this.repository.recordEvents(supabase, scope, [
      {
        taskId: id,
        eventType: duration === 'week' ? 'snoozed' : 'dismissed',
        sourceKind: null,
      },
    ])
    await this.repository.upsertSnooze(supabase, scope, this.key(id), snoozedUntil)
    return { success: true }
  }

  async feedback(
    supabase: SupabaseClient,
    scope: RequestScope,
    id: string,
    feedback: NextMoveFeedback,
  ): Promise<{ success: true }> {
    await this.assertAssignedTask(supabase, scope, id)
    await this.repository.recordEvents(supabase, scope, [
      { taskId: id, eventType: feedback, sourceKind: null },
    ])
    if (feedback === 'false_positive') {
      const snoozedUntil = new Date(Date.now() + 3650 * DAY_MS).toISOString()
      await this.repository.upsertSnooze(supabase, scope, this.key(id), snoozedUntil)
    }
    return { success: true }
  }

  private key(id: string): string {
    return `next_move:${id}`
  }

  private async assertAssignedTask(
    supabase: SupabaseClient,
    scope: RequestScope,
    id: string,
  ): Promise<void> {
    if (!(await this.repository.isAssignedTask(supabase, scope, id))) {
      throw new NotFoundException('Assigned task not found')
    }
  }
}

function toSuggestion(item: TaskRollupItem) {
  const custom = item.custom_data ?? {}
  const provenance = asRecord(custom.action_provenance)
  const sourceKind = text(provenance.source_kind)
  const meetingItemId = text(provenance.meeting_item_id) ?? text(custom.source_call_item_id)
  const conversationId = text(provenance.conversation_id)
  const isMeeting =
    Boolean(meetingItemId) || sourceKind?.startsWith('meeting') || sourceKind === 'manual_note'
  const isSlack = sourceKind === 'slack_thread'
  const source = isMeeting
    ? {
        type: 'meeting' as const,
        title: text(custom.source_call) ?? 'Meeting action',
        occurredAt: item.created_at,
        url: meetingItemId
          ? `/spaces?space=${encodeURIComponent(item.space_id)}&item=${encodeURIComponent(meetingItemId)}`
          : item.source_url,
        sourceKind,
      }
    : isSlack
      ? {
          type: 'slack' as const,
          title: 'Slack conversation',
          occurredAt: slackOccurredAt(provenance.slack_message_ts) ?? item.created_at,
          url: conversationId ? `/home?conv=${encodeURIComponent(conversationId)}` : item.source_url,
          sourceKind,
        }
      : {
          type: 'task' as const,
          title: item.campaign_name ?? item.space_title,
          occurredAt: item.created_at,
          url: item.source_url,
          sourceKind,
        }
  return {
    id: item.id,
    title: item.title,
    prompt: `Open the source for "${item.title}" and help me complete it. Use the available context and show me a draft before taking any external action.`,
    source,
  }
}

function slackOccurredAt(value: unknown): string | null {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(seconds * 1000).toISOString()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
