import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import {
  buildNextMoveViewer,
  isNextMoveForViewer,
  mergeMeetingAudienceData,
  type NextMoveViewer,
} from './next-moves-audience'

export type NextMoveCandidate = {
  id: string
  title: string
  spaceId: string
  meetingItemId: string
  meetingTitle: string
  meetingDate: string
}

const FOLLOW_UP_SELECT =
  'id, title, space_id, parent_item_id, status, created_at, custom_data, source, assignee_type, assignee_id, assignees'
const RECENT_LIMIT = 80
const ASSIGNED_LIMIT = 40
const ATTENDED_MEETING_LIMIT = 40

@Injectable()
export class NextMovesRepository {
  async listCandidates(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<NextMoveCandidate[]> {
    const viewer = await this.loadViewer(supabase, scope)
    const rows = await this.listFollowUpRows(supabase, scope, viewer)
    const unresolved = rows.filter((row) => !isResolvedStatus(row.status))
    const meetingIds = [
      ...new Set(
        unresolved.map((row) => sourceMeetingId(row)).filter((id): id is string => Boolean(id)),
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
    const recordingEmails = await this.listRecordingEmails(supabase, meetingIds)

    return unresolved.flatMap((row) => {
      const meetingItemId = sourceMeetingId(row)
      const meeting = meetingItemId ? meetingById.get(meetingItemId) : null
      if (!meetingItemId || !meeting) return []
      const meetingCustom = mergeMeetingAudienceData(
        asRecord(meeting.custom_data),
        recordingEmails.get(meetingItemId) ?? [],
      )
      if (!isNextMoveForViewer(row, meetingCustom, viewer)) return []
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
              meetingCustom.call_date ??
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

  private async loadViewer(supabase: SupabaseClient, scope: RequestScope): Promise<NextMoveViewer> {
    const [{ data: profile, error }, auth, teammates] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, full_name, fathom_aliases')
        .eq('id', scope.userId)
        .maybeSingle(),
      supabase.auth.getUser(),
      this.listTeammates(supabase, scope),
    ])
    if (error) throw new Error(`Failed to load next-move viewer: ${error.message}`)
    return buildNextMoveViewer({
      userId: scope.userId,
      email: (profile?.email as string | null | undefined) ?? auth.data.user?.email ?? null,
      fullName: (profile?.full_name as string | null | undefined) ?? null,
      aliases: profile?.fathom_aliases,
      teammates,
    })
  }

  private async listTeammates(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<Array<{ email?: string | null; fullName?: string | null }>> {
    if (!scope.orgId) return []
    const members = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', scope.orgId)
      .eq('status', 'active')
      .limit(200)
    if (members.error)
      throw new Error(`Failed to load next-move teammates: ${members.error.message}`)
    const userIds = [
      ...new Set((members.data ?? []).map((row) => String(row.user_id)).filter(Boolean)),
    ].filter((id) => id !== scope.userId)
    if (userIds.length === 0) return []
    const profiles = await supabase.from('profiles').select('email, full_name').in('id', userIds)
    if (profiles.error)
      throw new Error(`Failed to load next-move teammate profiles: ${profiles.error.message}`)
    return (profiles.data ?? []).map((row) => ({
      email: (row.email as string | null | undefined) ?? null,
      fullName: (row.full_name as string | null | undefined) ?? null,
    }))
  }

  private async listFollowUpRows(
    supabase: SupabaseClient,
    scope: RequestScope,
    viewer: NextMoveViewer,
  ): Promise<Record<string, unknown>[]> {
    const byId = new Map<string, Record<string, unknown>>()
    const attendedMeetingIds = await this.listAttendedMeetingIds(supabase, scope, viewer)
    const results = await Promise.all([
      this.followUpQuery(supabase, scope)
        .order('created_at', { ascending: false })
        .limit(RECENT_LIMIT),
      this.followUpQuery(supabase, scope)
        .eq('assignee_type', 'human')
        .eq('assignee_id', scope.userId)
        .limit(ASSIGNED_LIMIT),
      this.followUpQuery(supabase, scope)
        .filter('assignees', 'cs', JSON.stringify([{ type: 'human', id: scope.userId }]))
        .limit(ASSIGNED_LIMIT),
      ...viewer.emails
        .slice(0, 3)
        .map((email) =>
          this.followUpQuery(supabase, scope)
            .eq('custom_data->>suggested_assignee_email', email)
            .limit(ASSIGNED_LIMIT),
        ),
      ...(attendedMeetingIds.length > 0
        ? [
            this.followUpQuery(supabase, scope)
              .in('parent_item_id', attendedMeetingIds)
              .limit(ASSIGNED_LIMIT),
            this.followUpQuery(supabase, scope)
              .in('custom_data->>source_call_item_id', attendedMeetingIds)
              .limit(ASSIGNED_LIMIT),
          ]
        : []),
    ])
    for (const result of results) {
      if (result.error)
        throw new Error(`Failed to load next-move candidates: ${result.error.message}`)
      for (const row of result.data ?? []) {
        byId.set(String(row.id), row as Record<string, unknown>)
      }
    }
    return [...byId.values()]
  }

  private async listAttendedMeetingIds(
    supabase: SupabaseClient,
    scope: RequestScope,
    viewer: NextMoveViewer,
  ): Promise<string[]> {
    if (viewer.emails.length === 0) return []
    let query = supabase
      .from('meeting_recordings')
      .select('meeting_item_id')
      .overlaps('participant_emails', viewer.emails)
      .limit(ATTENDED_MEETING_LIMIT)
    query = scope.orgId
      ? query.eq('org_id', scope.orgId)
      : query.eq('user_id', scope.userId).is('org_id', null)
    const { data, error } = await query
    if (error) throw new Error(`Failed to load attended next-move meetings: ${error.message}`)
    return [...new Set((data ?? []).map((row) => String(row.meeting_item_id)).filter(Boolean))]
  }

  private async listRecordingEmails(
    supabase: SupabaseClient,
    meetingIds: string[],
  ): Promise<Map<string, string[]>> {
    const emailsByMeeting = new Map<string, string[]>()
    if (meetingIds.length === 0) return emailsByMeeting
    const { data, error } = await supabase
      .from('meeting_recordings')
      .select('meeting_item_id, participant_emails')
      .in('meeting_item_id', meetingIds)
    if (error) throw new Error(`Failed to load next-move recording attendees: ${error.message}`)
    for (const row of data ?? []) {
      const meetingId = String(row.meeting_item_id ?? '')
      if (!meetingId) continue
      const emails = Array.isArray(row.participant_emails)
        ? row.participant_emails.map((email) => String(email))
        : []
      emailsByMeeting.set(meetingId, [...(emailsByMeeting.get(meetingId) ?? []), ...emails])
    }
    return emailsByMeeting
  }

  private followUpQuery(supabase: SupabaseClient, scope: RequestScope) {
    let query = supabase
      .from('space_items')
      .select(FOLLOW_UP_SELECT)
      .or('custom_data->>entry_type.eq.follow_up,source.eq.agent_suggested')
    query = scope.orgId
      ? query.eq('org_id', scope.orgId)
      : query.eq('user_id', scope.userId).is('org_id', null)
    return query
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
