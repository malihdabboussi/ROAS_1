/**
 * Build a Fathom ingest event from an existing Meetings call space_item.
 * Used to hydrate `meeting_recordings` when agenda already knows the recording
 * via custom_data but ingest never wrote the workspace recording row.
 */
export function buildFathomEventFromCallItem(
  meeting: Record<string, unknown>,
): Record<string, unknown> | null {
  const custom = objectRecord(meeting.custom_data)
  const external = objectRecord(custom.external_automation)
  const recordingId = firstText(
    external.meeting_id,
    custom.recording_id,
    custom.fathom_recording_id,
  )
  if (!recordingId) return null

  const provider = firstText(external.provider, meeting.source)?.toLowerCase()
  const recordingUrl = httpUrl(custom.recording_url) ?? httpUrl(custom.fathom_url)
  if (provider !== 'fathom' && !recordingUrl) return null

  const transcriptEntries = Array.isArray(external.transcript_entries)
    ? external.transcript_entries
    : []

  return {
    id: recordingId,
    recording_id: recordingId,
    meeting_id: recordingId,
    title: firstText(meeting.title) ?? 'Untitled Meeting',
    url: recordingUrl,
    share_url: recordingUrl,
    summary: firstText(custom.summary),
    summary_text: firstText(custom.summary, custom.transcript_text),
    scheduled_start_time: firstText(custom.call_date, custom.scheduled_start),
    recording_start_time: firstText(custom.call_date, custom.recording_start),
    calendar_event_id: firstText(custom.calendar_event_id),
    transcript: transcriptEntries,
    recorded_by: firstText(external.recorded_by_email)
      ? { email: String(external.recorded_by_email).trim() }
      : undefined,
  }
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}
