import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlackDiscoveredPerson, SlackShadowAction } from '../types/slack.types'
import type { SlackPeopleRepository } from './slack-people.repository'

export async function findSlackPersonByDisplayName(
  repo: SlackPeopleRepository,
  supabase: SupabaseClient,
  orgId: string,
  displayName: string,
): Promise<SlackDiscoveredPerson | null> {
  const needle = displayName.trim().toLowerCase()
  if (!needle) return null
  const people = await repo.listPeople(supabase, orgId)
  const exact = people.filter((person) => {
    const name = String(person.display_name ?? '')
      .trim()
      .toLowerCase()
    const username = String(person.username ?? '')
      .trim()
      .toLowerCase()
    return name === needle || username === needle
  })
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return null

  const first = needle.split(/\s+/)[0] ?? ''
  if (first.length < 2) return null
  const partial = people.filter((person) => {
    const name = String(person.display_name ?? '')
      .trim()
      .toLowerCase()
    return name === first || name.startsWith(`${first} `)
  })
  return partial.length === 1 ? partial[0] : null
}

export async function findAssigneeReminderBySlackMessage(
  supabase: SupabaseClient,
  input: { orgId?: string | null; channelId: string; messageTs: string },
): Promise<SlackShadowAction | null> {
  const messageTs = input.messageTs.trim()
  if (!messageTs) return null
  let query = supabase
    .from('slack_shadow_actions')
    .select(
      'id, agent_key, target_member_id, action_kind, proposed_content, rationale, status, source_channel_id, source_message_ts, workflow_key, reviewed_by, reviewed_at, sent_at, metadata, created_at, updated_at, org_id, user_id',
    )
    .eq('action_kind', 'message')
    .eq('metadata->>source', 'meeting_follow_up_assignee_reminder')
    .eq('metadata->>slack_message_ts', messageTs)
    .order('sent_at', { ascending: false })
    .limit(5)
  if (input.orgId) query = query.eq('org_id', input.orgId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to find assignee reminder Shadow: ${error.message}`)
  const rows = (data ?? []) as Array<SlackShadowAction & { org_id?: string }>
  if (rows.length === 0) return null
  const channelId = input.channelId.trim()
  const channelMatch = rows.find((row) => {
    const meta =
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {}
    return String(meta.slack_channel_id ?? '').trim() === channelId
  })
  return channelMatch ?? rows[0] ?? null
}
