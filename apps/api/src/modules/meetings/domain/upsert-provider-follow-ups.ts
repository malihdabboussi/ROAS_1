import type { FathomSourceAction } from '../providers/fathom-meeting-source'
import { findMatchingMeetingAction, normalizeMeetingActionText } from './meeting-action-dedupe'
import type { CanonicalMeetingAssignee } from './meeting-assignee-identity'

type ProviderFollowUpAssignment = {
  assignee_type: 'human'
  assignee_id: string
  assignees: Array<{ type: 'human'; id: string }>
}

export type ProviderFollowUpUpsertPlan =
  | {
      kind: 'update'
      itemId: string
      title: string
      status: string
      customData: Record<string, unknown>
      assignment: ProviderFollowUpAssignment | null
    }
  | {
      kind: 'insert'
      title: string
      status: string
      customData: Record<string, unknown>
      assignment: ProviderFollowUpAssignment | null
    }

/**
 * Plan follow_up space_item writes from exact Fathom provider actions.
 * Manual rows match by normalized title and receive provider evidence (no duplicates).
 */
export function planProviderFollowUpUpserts(input: {
  meetingItemId: string
  meetingTitle: string | null
  recordingId?: string | null
  externalRecordingId?: string | null
  transcriptDocItemId?: string | null
  recordingUrl?: string | null
  actions: readonly FathomSourceAction[]
  assignees?: ReadonlyMap<string, CanonicalMeetingAssignee>
  existingFollowUps: ReadonlyArray<Record<string, unknown>>
  reopenDismissed?: boolean
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
    const canonicalAssignee = input.assignees?.get(action.sourceKey) ?? null
    const assignment =
      canonicalAssignee?.type === 'user'
        ? {
            assignee_type: 'human' as const,
            assignee_id: canonicalAssignee.id,
            assignees: [{ type: 'human' as const, id: canonicalAssignee.id }],
          }
        : null
    const baseCustom: Record<string, unknown> = {
      entry_type: 'follow_up',
      source_call_item_id: input.meetingItemId,
      ...(input.meetingTitle ? { source_call: input.meetingTitle } : {}),
      provider_source_key: action.sourceKey,
      provider: 'fathom',
      ...(action.assigneeName ? { suggested_assignee_name: action.assigneeName } : {}),
      ...(action.assigneeEmail ? { suggested_assignee_email: action.assigneeEmail } : {}),
      ...(canonicalAssignee
        ? {
            canonical_assignee_type: canonicalAssignee.type,
            canonical_assignee_id: canonicalAssignee.id,
            canonical_assignee_name: canonicalAssignee.name,
            canonical_assignee_email: canonicalAssignee.email,
          }
        : {}),
      provider_evidence: {
        recording_timestamp: action.recordingTimestamp,
        recording_playback_url: action.recordingPlaybackUrl,
        user_generated: action.userGenerated,
        completed_in_provider: action.completed,
        cross_referenced_from: 'provider_recording',
      },
      action_provenance: {
        source_kind: action.evidence?.sourceKind ?? 'meeting_summary',
        source_id: action.sourceKey,
        source_excerpt: action.evidence?.excerpt ?? action.sourceText,
        meeting_item_id: input.meetingItemId,
        recording_id: input.recordingId ?? null,
        external_recording_id: input.externalRecordingId ?? null,
        transcript_doc_item_id: input.transcriptDocItemId ?? null,
        recording_url: action.recordingPlaybackUrl ?? input.recordingUrl ?? null,
        recording_timestamp: action.evidence?.timestamp ?? action.recordingTimestamp,
        transcript_turn_index: action.evidence?.transcriptTurnIndex ?? null,
        speaker_name: action.evidence?.speakerName ?? null,
        provider: 'fathom',
      },
      ...(action.refinement ? { refinement: action.refinement } : {}),
    }

    if (byTitle?.id) {
      const existingCustom = record(byTitle.custom_data)
      const customData: Record<string, unknown> = {
        ...existingCustom,
        ...baseCustom,
        ...(existingCustom.suggestion_origin
          ? { suggestion_origin: existingCustom.suggestion_origin }
          : {}),
      }
      if (input.reopenDismissed) delete customData.dismissed_at
      plans.push({
        kind: 'update',
        itemId: String(byTitle.id),
        title: String(byTitle.title ?? title).trim() || title,
        status:
          String(byTitle.status ?? '').toLowerCase() === 'done' || action.completed
            ? 'done'
            : String(byTitle.status ?? status),
        customData,
        assignment,
      })
      continue
    }

    plans.push({
      kind: 'insert',
      title,
      status,
      customData: baseCustom,
      assignment,
    })
  }

  return plans
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
