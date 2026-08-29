import type { FathomSourceAction } from '../providers/fathom-meeting-source'

export function providerActionFromRow(row: Record<string, unknown>): FathomSourceAction | null {
  const sourceText = firstText(row.source_text, row.title)
  const sourceKey = firstText(row.source_key)
  if (!sourceText || !sourceKey) return null
  const evidence = record(row.evidence)
  return {
    sourceKey,
    sourceText,
    assigneeName: firstText(row.canonical_assignee_name) || null,
    assigneeEmail: firstText(row.canonical_assignee_email) || null,
    recordingTimestamp: firstText(evidence.recording_timestamp) || null,
    recordingPlaybackUrl: firstText(evidence.recording_playback_url) || null,
    completed: firstText(row.status).toLowerCase() === 'resolved',
    userGenerated: Boolean(evidence.user_generated),
    raw: row,
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function firstText(...values: unknown[]): string {
  return (
    values.find((value): value is string => typeof value === 'string' && !!value.trim())?.trim() ??
    ''
  )
}
