import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'

export type ActionRecommendationEventType =
  | 'surfaced'
  | 'accepted'
  | 'snoozed'
  | 'dismissed'
  | 'false_positive'

@Injectable()
export class NextMovesRepository {
  async isAssignedTask(
    supabase: SupabaseClient,
    scope: RequestScope,
    taskId: string,
  ): Promise<boolean> {
    const assignee = JSON.stringify([{ type: 'human', id: scope.userId }])
    let query = supabase
      .from('space_items')
      .select('id')
      .eq('id', taskId)
      .contains('assignees', assignee)
    query = scope.orgId
      ? query.eq('org_id', scope.orgId)
      : query.eq('user_id', scope.userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to verify assigned next move: ${error.message}`)
    return Boolean(data?.id)
  }

  async listSnoozedKeys(supabase: SupabaseClient, scope: RequestScope): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('home_recommendation_dismissals')
      .select('recommendation_key')
      .eq('user_id', scope.userId)
      .eq('scope_key', scope.orgId ?? 'personal')
      .like('recommendation_key', 'next_move:%')
      .gt('snoozed_until', new Date().toISOString())
    if (error) throw new Error(`Failed to load next-move dismissals: ${error.message}`)
    return new Set((data ?? []).map((row) => String(row.recommendation_key)))
  }

  async recordEvents(
    supabase: SupabaseClient,
    scope: RequestScope,
    events: Array<{
      taskId: string
      eventType: ActionRecommendationEventType
      sourceKind: string | null
    }>,
  ): Promise<void> {
    if (events.length === 0) return
    const { error } = await supabase.from('action_recommendation_events').insert(
      events.map((event) => ({
        user_id: scope.userId,
        org_id: scope.orgId,
        task_id: event.taskId,
        event_type: event.eventType,
        source_kind: event.sourceKind,
      })),
    )
    if (error) throw new Error(`Failed to record next-move feedback: ${error.message}`)
  }

  async upsertSnooze(
    supabase: SupabaseClient,
    scope: RequestScope,
    key: string,
    snoozedUntil: string,
  ): Promise<void> {
    const { error } = await supabase.from('home_recommendation_dismissals').upsert(
      {
        user_id: scope.userId,
        org_id: scope.orgId,
        recommendation_key: key,
        dismissed_at: new Date().toISOString(),
        snoozed_until: snoozedUntil,
      },
      { onConflict: 'user_id,scope_key,recommendation_key' },
    )
    if (error) throw new Error(`Failed to snooze next move: ${error.message}`)
  }
}
