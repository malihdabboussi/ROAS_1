import type { FathomSourceAction } from '../providers/fathom-meeting-source'
import { findMatchingMeetingAction, normalizeMeetingActionText } from './meeting-action-dedupe'

export type ProviderFollowUpUpsertPlan =
  | {
      kind: 'update'
      itemId: string
      title: string
      status: string
      customData: Record<string, unknown>
    }
  | {
      kind: 'insert'
      title: string
      status: string
      customData: Record<string, unknown>
    }

/**
 * Plan follow_up space_item writes from exact Fathom provider actions.
 * Manual rows match by normalized title and receive provider evidence (no duplicates).
 */
export function planProviderFollowUpUpserts(input: {
  meetingItemId: string
  meetingTitle: string | null
  actions: readonly FathomSourceAction[]
  existingFollowUps: ReadonlyArray<Record<string, unknown>>
}): ProviderFollowUpUpsertPlan[] {
  if (input.actions.length === 0) return []

  const claimed = new Set<string>()
  const plans: ProviderFollowUpUpsertPlan[] = []

  for (const action of input.actions) {
    const title = action.sourceText.trim().slice(0, 1000)
    if (!title) continue
    const normalized = normalizeMeetingActionText(title)
    if (normalized && claimed.has(normalized)) continue
    if (normalized) claimed.add(normalized)

    const byKey = input.existingFollowUps.find((row) => {
      const custom = record(row.custom_data)
      return String(custom.provider_source_key ?? '') === action.sourceKey
    })
    const byTitle = byKey ?? findMatchingMeetingAction(input.existingFollowUps, title) ?? null

    const status = action.completed ? 'done' : 'logged'
    const baseCustom: Record<string, unknown> = {
      entry_type: 'follow_up',
      source_call_item_id: input.meetingItemId,
      ...(input.meetingTitle ? { source_call: input.meetingTitle } : {}),
      provider_source_key: action.sourceKey,
      provider: 'fathom',
      ...(action.assigneeName ? { suggested_assignee_name: action.assigneeName } : {}),
      ...(action.assigneeEmail ? { suggested_assignee_email: action.assigneeEmail } : {}),
      provider_evidence: {
        recording_timestamp: action.recordingTimestamp,
        recording_playback_url: action.recordingPlaybackUrl,
        user_generated: action.userGenerated,
        cross_referenced_from: 'provider_recording',
      },
    }

    if (byTitle?.id) {
      const existingCustom = record(byTitle.custom_data)
      plans.push({
        kind: 'update',
        itemId: String(byTitle.id),
        title: String(byTitle.title ?? title).trim() || title,
        status:
          String(byTitle.status ?? '').toLowerCase() === 'done' || action.completed
            ? 'done'
            : String(byTitle.status ?? status),
        customData: {
          ...existingCustom,
          ...baseCustom,
          ...(existingCustom.suggestion_origin
            ? { suggestion_origin: existingCustom.suggestion_origin }
            : {}),
        },
      })
      continue
    }

    plans.push({
      kind: 'insert',
      title,
      status,
      customData: baseCustom,
    })
  }

  return plans
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
