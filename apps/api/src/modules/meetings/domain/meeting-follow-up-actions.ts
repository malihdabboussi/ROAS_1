/**
 * Map Meetings-space follow_up space_items into the meeting workspace action
 * shape so Home and Programs → Meetings share one action-item source.
 */
export function mapFollowUpSpaceItemToMeetingAction(
  item: Record<string, unknown>,
): Record<string, unknown> {
  const custom =
    item.custom_data && typeof item.custom_data === 'object' && !Array.isArray(item.custom_data)
      ? (item.custom_data as Record<string, unknown>)
      : {}
  const statusRaw = String(item.status ?? '')
    .trim()
    .toLowerCase()
  const resolved =
    statusRaw === 'done' ||
    statusRaw === 'complete' ||
    statusRaw === 'completed' ||
    statusRaw === 'resolved'
  const suggestionOrigin =
    custom.suggestion_origin &&
    typeof custom.suggestion_origin === 'object' &&
    !Array.isArray(custom.suggestion_origin)
      ? (custom.suggestion_origin as Record<string, unknown>)
      : {}
  const sourceType =
    String(item.source ?? '') === 'agent_suggested'
      ? suggestionOrigin.source_action === 'agent_suggest_tasks'
        ? 'ai'
        : 'provider'
      : String(item.source ?? '') === 'fathom'
        ? 'provider'
        : 'manual'
  const providerEvidence =
    custom.provider_evidence &&
    typeof custom.provider_evidence === 'object' &&
    !Array.isArray(custom.provider_evidence)
      ? (custom.provider_evidence as Record<string, unknown>)
      : {}
  const completionOrigin =
    custom.completion_origin &&
    typeof custom.completion_origin === 'object' &&
    !Array.isArray(custom.completion_origin)
      ? (custom.completion_origin as Record<string, unknown>)
      : null

  return {
    id: String(item.id),
    title: String(item.title ?? '').trim() || 'Action item',
    source_type: sourceType,
    source_key: `follow_up:${String(item.id)}`,
    source_text: String(item.title ?? '').trim() || null,
    status: resolved ? 'resolved' : 'confirmed',
    canonical_assignee_name: firstText(custom.suggested_assignee_name, item.assignee_name) ?? null,
    canonical_assignee_email:
      firstText(custom.suggested_assignee_email, item.assignee_email) ?? null,
    evidence: {
      origin: 'meetings_space_follow_up',
      space_item_id: String(item.id),
      entry_type: 'follow_up',
      ...(Object.keys(providerEvidence).length > 0 ? { provider_evidence: providerEvidence } : {}),
      ...(completionOrigin ? { completion_origin: completionOrigin } : {}),
    },
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
  }
}

export function meetingActionStatusToFollowUpStatus(status: unknown): 'done' | 'logged' {
  return String(status ?? '') === 'resolved' ? 'done' : 'logged'
}

export function isFollowUpSpaceItem(item: Record<string, unknown>): boolean {
  const custom =
    item.custom_data && typeof item.custom_data === 'object' && !Array.isArray(item.custom_data)
      ? (item.custom_data as Record<string, unknown>)
      : {}
  if (String(custom.entry_type ?? '') === 'follow_up') return true
  if (String(item.source ?? '') === 'agent_suggested') return true
  return false
}

export function isMeetingAgendaSpaceItem(item: Record<string, unknown>): boolean {
  const custom =
    item.custom_data && typeof item.custom_data === 'object' && !Array.isArray(item.custom_data)
      ? (item.custom_data as Record<string, unknown>)
      : {}
  return String(custom.entry_type ?? '') === 'meeting_agenda'
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}
