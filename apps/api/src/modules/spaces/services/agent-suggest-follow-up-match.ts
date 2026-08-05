import { findMatchingMeetingAction } from '../../meetings/domain/meeting-action-dedupe'

/**
 * Match an agent_suggest_tasks row to an existing follow_up (from Fathom ingest
 * or a prior manual +) so we enrich instead of duplicating.
 */
export function findExistingFollowUpForSuggestedTask(input: {
  existingFollowUps: ReadonlyArray<Record<string, unknown>>
  title: string
  meetingId: string | null
  sourceActionIndex: number | null
}): Record<string, unknown> | null {
  const providerKey =
    input.meetingId &&
    input.sourceActionIndex != null &&
    Number.isInteger(input.sourceActionIndex) &&
    input.sourceActionIndex >= 0
      ? `fathom:${input.meetingId}:action:${input.sourceActionIndex}`
      : null
  const legacyKey =
    input.meetingId &&
    input.sourceActionIndex != null &&
    Number.isInteger(input.sourceActionIndex) &&
    input.sourceActionIndex >= 0
      ? `${input.meetingId}:${input.sourceActionIndex}`
      : null

  if (providerKey || legacyKey) {
    const byKey = input.existingFollowUps.find((row) => {
      const custom = record(row.custom_data)
      const origin = record(custom.suggestion_origin)
      return (
        String(custom.provider_source_key ?? '') === providerKey ||
        String(origin.source_action_key ?? '') === legacyKey ||
        String(origin.source_action_key ?? '') === providerKey
      )
    })
    if (byKey) return byKey
  }

  return findMatchingMeetingAction(input.existingFollowUps, input.title)
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
