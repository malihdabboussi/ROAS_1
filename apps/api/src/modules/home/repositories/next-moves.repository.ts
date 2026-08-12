import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'

export type NextMoveCandidate = {
  id: string
  title: string
  spaceId: string
  meetingItemId: string
  meetingTitle: string
  meetingDate: string
}

@Injectable()
export class NextMovesRepository {
  async listCandidates(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<NextMoveCandidate[]> {
    let query = supabase
      .from('space_items')
      .select('id, title, space_id, parent_item_id, status, created_at, custom_data, source')
      .or('custom_data->>entry_type.eq.follow_up,source.eq.agent_suggested')
      .order('created_at', { ascending: false })
      .limit(30)
    query = scope.orgId
      ? query.eq('org_id', scope.orgId)
      : query.eq('user_id', scope.userId).is('org_id', null)

    const { data, error } = await query
    if (error) throw new Error(`Failed to load next-move candidates: ${error.message}`)

    const unresolved = (data ?? []).filter((row) => !isResolvedStatus(row.status))
    const meetingIds = [
      ...new Set(
        unresolved
          .map((row) => sourceMeetingId(row as Record<string, unknown>))
          .filter((id): id is string => Boolean(id)),
      ),
    ]
    if (meetingIds.length === 0) return []

    const meetings = await supabase
      .from('space_items')
      .select('id, title, created_at, custom_data')
      .in('id', meetingIds)
    if (meetings.error)
      throw new Error(`Failed to load next-move sources: ${meetings.error.message}`)
    const meetingById = new Map((meetings.data ?? []).map((row) => [String(row.id), row]))

    return unresolved.flatMap((row) => {
      const meetingItemId = sourceMeetingId(row as Record<string, unknown>)
      const meeting = meetingItemId ? meetingById.get(meetingItemId) : null
      if (!meetingItemId || !meeting) return []
      const meetingCustom = asRecord(meeting.custom_data)
      return [
        {
          id: String(row.id),
          title: String(row.title ?? '').trim() || 'Follow up from this call',
          spaceId: String(row.space_id),
          meetingItemId,
          meetingTitle: String(meeting.title ?? '').trim() || 'Recent call',
          meetingDate: String(
            meetingCustom.scheduled_start_at ??
              meetingCustom.recording_start_time ??
              meeting.created_at,
          ),
        },
      ]
    })
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

function sourceMeetingId(row: Record<string, unknown>): string | null {
  const custom = asRecord(row.custom_data)
  const value = custom.source_call_item_id ?? row.parent_item_id
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isResolvedStatus(value: unknown): boolean {
  return ['done', 'complete', 'completed', 'resolved', 'dismissed'].includes(
    String(value ?? '').toLowerCase(),
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
