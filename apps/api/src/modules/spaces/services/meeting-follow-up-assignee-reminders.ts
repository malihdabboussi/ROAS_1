/** Pure helpers: group meeting follow-ups by assignee and draft Shadow reminder DMs. */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  rewriteFollowUpTitlesWithKnowledge,
  type NameKnowledgeEntry,
} from './meeting-follow-up-name-knowledge'
import { resolveFollowUpOwner } from './meeting-follow-up-slack-message'

const JUNK_OWNERS = new Set(['impact team', 'team', 'unknown', 'unassigned', 'roas team'])

export type AssigneeFollowUpGroup = {
  key: string
  displayName: string
  email: string | null
  items: Array<Record<string, unknown>>
}

export function cleanAssigneeDisplayName(raw: string | null | undefined): string | null {
  if (!raw) return null
  let cleaned = String(raw).trim()
  cleaned = cleaned.replace(/@\S+/g, '')
  cleaned = cleaned.replace(/\b\d{3}[.\-\s]?\d{3}[.\-\s]?\d{4}\b/g, '')
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-|,]+|[-|,]+$/g, '')
  if (!cleaned || cleaned.length < 2) return null
  if (JUNK_OWNERS.has(cleaned.toLowerCase())) return null
  if (cleaned.includes('@') && cleaned.includes('.')) {
    // Email-as-owner: keep for matching, display local-part capitalized later if needed
    return cleaned
  }
  return cleaned
}

export function resolveFollowUpAssigneeEmail(item: Record<string, unknown>): string | null {
  const customData =
    item.custom_data && typeof item.custom_data === 'object'
      ? (item.custom_data as Record<string, unknown>)
      : {}
  const email = String(customData.suggested_assignee_email ?? '')
    .trim()
    .toLowerCase()
  if (email.includes('@')) return email
  const owner = resolveFollowUpOwner(item)
  if (owner && owner.includes('@')) return owner.trim().toLowerCase()
  return null
}

export function normalizeAssigneeKey(displayName: string, email: string | null): string {
  if (email) return `email:${email.toLowerCase()}`
  return `name:${displayName.trim().toLowerCase()}`
}

export function groupFollowUpsByAssignee(
  followUps: Array<Record<string, unknown>>,
): AssigneeFollowUpGroup[] {
  const groups = new Map<string, AssigneeFollowUpGroup>()
  for (const item of followUps) {
    const email = resolveFollowUpAssigneeEmail(item)
    const rawOwner = resolveFollowUpOwner(item)
    const displayName = cleanAssigneeDisplayName(rawOwner)
    if (!displayName && !email) continue
    const label =
      displayName && !displayName.includes('@')
        ? displayName
        : email
          ? email.split('@')[0]?.replace(/[._+]/g, ' ') || email
          : displayName!
    const key = normalizeAssigneeKey(label, email)
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
      if (!existing.email && email) existing.email = email
      continue
    }
    groups.set(key, {
      key,
      displayName: label.replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      items: [item],
    })
  }
  return [...groups.values()]
}

export function buildAssigneeActionReminderMessage(input: {
  callTitle: string
  fathomUrl?: string | null
  items: Array<Record<string, unknown>>
}): string {
  const title =
    String(input.callTitle || 'the team call earlier today').trim() || 'the team call earlier today'
  const bullets = input.items
    .map((item) => {
      const task = String(item.title ?? '').trim()
      return task ? `• ${task}` : null
    })
    .filter((line): line is string => !!line)

  const fathomUrl = String(input.fathomUrl ?? '').trim()
  const opener = fathomUrl
    ? `Hey — just a follow-up from the team call earlier today (<${fathomUrl}|linked here>).`
    : `Hey — just a follow-up from the team call earlier today (*${title}*).`

  return [
    opener,
    '',
    `These are some of the things that were assigned to you:`,
    ...(bullets.length > 0 ? bullets : ['• _(no titled tasks)_']),
    '',
    `Feel free to message me if you have questions.`,
  ].join('\n')
}

export type AssigneeReminderShadowDeps = {
  createShadowAction: (
    supabase: SupabaseClient,
    input: {
      orgId: string
      userId: string
      agentKey: string
      targetMemberId: string
      actionKind: 'message'
      proposedContent: string
      rationale: string
      metadata: Record<string, unknown>
    },
  ) => Promise<{ id: string }>
  findPersonByEmail: (
    supabase: SupabaseClient,
    orgId: string,
    email: string,
  ) => Promise<{
    id: string
    relationship_kind?: string | null
    delivery_mode?: string | null
  } | null>
  findPersonByDisplayName: (
    supabase: SupabaseClient,
    orgId: string,
    displayName: string,
  ) => Promise<{
    id: string
    relationship_kind?: string | null
    delivery_mode?: string | null
  } | null>
}

/** Create one Shadow message proposal per follow-up assignee (matched Slack person). */
export async function createAssigneeReminderShadowActions(input: {
  supabase: SupabaseClient
  userId: string
  slackOrgId: string
  spaceId: string
  callItemId: string
  callTitle: string
  fathomUrl: string | null
  followUps: Array<Record<string, unknown>>
  nameKnowledge: NameKnowledgeEntry[]
  people: AssigneeReminderShadowDeps
  onSkip?: (assigneeName: string, message: string) => void
}): Promise<string[]> {
  const groups = groupFollowUpsByAssignee(input.followUps)
  if (groups.length === 0) return []

  const createdIds: string[] = []
  for (const group of groups) {
    try {
      let person = group.email
        ? await input.people.findPersonByEmail(input.supabase, input.slackOrgId, group.email)
        : null
      if (!person) {
        person = await input.people.findPersonByDisplayName(
          input.supabase,
          input.slackOrgId,
          group.displayName,
        )
      }
      if (!person) continue
      if (person.relationship_kind === 'ignored') continue
      if (person.delivery_mode === 'off') continue

      const followUpIds = group.items
        .map((item) => String((item as { id?: string }).id ?? '').trim())
        .filter(Boolean)
      const items = rewriteFollowUpTitlesWithKnowledge(group.items, input.nameKnowledge)
      const action = await input.people.createShadowAction(input.supabase, {
        orgId: input.slackOrgId,
        userId: input.userId,
        agentKey: 'vibey',
        targetMemberId: person.id,
        actionKind: 'message',
        proposedContent: buildAssigneeActionReminderMessage({
          callTitle: input.callTitle,
          fathomUrl: input.fathomUrl,
          items,
        }),
        rationale: `Action-item reminder for ${group.displayName} from the meeting follow-up review.`,
        metadata: {
          source: 'meeting_follow_up_assignee_reminder',
          call_item_id: input.callItemId,
          space_id: input.spaceId,
          follow_up_ids: followUpIds,
          assignee_name: group.displayName,
          call_title: input.callTitle,
          ...(group.email ? { assignee_email: group.email } : {}),
        },
      })
      if (action?.id) createdIds.push(action.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      input.onSkip?.(group.displayName, message)
    }
  }
  return createdIds
}
