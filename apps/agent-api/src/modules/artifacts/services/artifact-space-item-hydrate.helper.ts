type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function pickRecordingUrl(custom: UnknownRecord): string | null {
  return (
    asString(custom.recording_url) ??
    asString(custom.fathom_url) ??
    asString(custom.meeting_url) ??
    asString(custom.url)
  )
}

function isMeetingLikeItem(item: UnknownRecord, custom: UnknownRecord): boolean {
  if (asString(custom.entry_type) === 'call') return true
  if (pickRecordingUrl(custom)) return true
  if (asString(custom.fathom_meeting_id)) return true
  if (asString(item.source) === 'fathom') return true
  const automation = asRecord(custom.external_automation)
  return asString(automation.provider) === 'fathom'
}

/** Meeting-facing fields for get_space_item so agents can open attached calls. */
export function buildSpaceItemMeetingHydration(item: UnknownRecord): UnknownRecord | null {
  const custom = asRecord(item.custom_data)
  if (!isMeetingLikeItem(item, custom)) return null

  const automation = asRecord(custom.external_automation)
  const recordingUrl = pickRecordingUrl(custom)
  const transcriptEntries = Array.isArray(automation.transcript_entries)
    ? automation.transcript_entries
    : Array.isArray(custom.transcript_entries)
      ? custom.transcript_entries
      : null
  const transcriptText =
    asString(custom.transcript_text) ?? asString(custom.transcript) ?? asString(item.description)

  return {
    entry_type: asString(custom.entry_type) ?? 'call',
    call_kind: asString(custom.call_kind) ?? asString(automation.call_kind),
    call_date: asString(custom.call_date),
    recording_url: recordingUrl,
    transcript_link: recordingUrl,
    fathom_url: asString(custom.fathom_url) ?? recordingUrl,
    fathom_meeting_id:
      asString(custom.fathom_meeting_id) ??
      asString(automation.meeting_id) ??
      asString(automation.recording_id),
    attendees: custom.attendees ?? null,
    summary: asString(item.description) ?? asString(custom.summary),
    transcript_text: transcriptText,
    transcript_entries: transcriptEntries,
    action_items_raw: Array.isArray(custom.action_items) ? custom.action_items : null,
  }
}

export function shouldIncludeSpaceItemHydrationFlag(
  input: UnknownRecord,
  key: string,
  defaultInclude = true,
): boolean {
  const value = input[key]
  if (value === false || value === 'false') return false
  if (value === true || value === 'true') return true
  return defaultInclude
}
