/**
 * Pure helpers for enriching the synthetic Fathom Space item created on webhook.
 * Attendee tags default to transcript speakers; calendar invitees are fallback only.
 */

import { stripMeetingTitlePrefix } from './fathom-meeting-title'

const ATTENDEE_TAG_COLORS = [
  'blue',
  'green',
  'violet',
  'amber',
  'orange',
  'cyan',
  'rose',
  'slate',
] as const

export type FathomAttendeeLike = {
  email?: string | null
  name?: string | null
  display_name?: string | null
  matched_speaker_display_name?: string | null
}

export type FathomTranscriptEntryLike = {
  speaker?: { display_name?: string | null; name?: string | null } | null
  text?: string | null
}

export function extractFathomCallDateIso(event: Record<string, unknown>): string | null {
  const raw =
    event.started_at ||
    event.recorded_at ||
    event.meeting_start ||
    event.recording_start_time ||
    event.scheduled_start_time ||
    event.created_at ||
    null
  if (typeof raw !== 'string' || !raw.trim()) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function fathomPersonLabel(person: FathomAttendeeLike): string {
  const name = String(
    person.name ?? person.display_name ?? person.matched_speaker_display_name ?? '',
  ).trim()
  const email = String(person.email ?? '').trim()
  if (name) return name
  return email || 'Unknown'
}

export function collectFathomInviteeLabels(attendees: FathomAttendeeLike[]): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const person of attendees) {
    const label = fathomPersonLabel(person)
    const key = label.toLowerCase()
    if (!label || label === 'Unknown' || seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}

const JUNK_SPEAKER = /^(starting transcription\.?.*|speaker\s*\d+|unknown|you|me)$/i

export function collectFathomSpeakerLabels(transcript: FathomTranscriptEntryLike[]): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const entry of transcript) {
    const speaker = entry.speaker
    const label = String(speaker?.display_name ?? speaker?.name ?? '').trim()
    const key = label.toLowerCase()
    if (!label || JUNK_SPEAKER.test(label) || seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}

/**
 * True when invitee list is empty or every invitee is the recording host.
 * Fathom often returns only the host even when others were on the call.
 */
export function isHostOnlyAttendeeList(
  attendees: FathomAttendeeLike[],
  recordedByEmail: string,
): boolean {
  const hostEmail = recordedByEmail.trim().toLowerCase()
  if (attendees.length === 0) return true
  if (!hostEmail) return attendees.length <= 1

  return attendees.every((person) => {
    const email = String(person.email ?? '')
      .trim()
      .toLowerCase()
    if (email && email === hostEmail) return true
    if (email) return false
    // Name-only rows: treat as host-only only when there is a single person
    return attendees.length === 1
  })
}

export function resolveFathomAttendeeLabels(input: {
  attendees: FathomAttendeeLike[]
  transcript: FathomTranscriptEntryLike[]
  recordedByEmail: string
  titleHint?: string | null
}): { labels: string[]; usedSpeakers: boolean } {
  // Default: who actually spoke on the call (invite lists are often wrong/incomplete).
  const speakerLabels = collectFathomSpeakerLabels(input.transcript)
  if (speakerLabels.length > 0) {
    return { labels: speakerLabels, usedSpeakers: true }
  }

  const inviteeLabels = collectFathomInviteeLabels(input.attendees)
  // Real multi-person invite roster when speakers are unavailable.
  if (inviteeLabels.length > 0 && !isHostOnlyAttendeeList(input.attendees, input.recordedByEmail)) {
    return { labels: inviteeLabels, usedSpeakers: false }
  }

  // Host-only / empty invitees: try title pair before accepting the host-only list.
  const fromTitle = labelsFromMeetingTitleHint(input.titleHint)
  if (fromTitle.length > 0) {
    return { labels: fromTitle, usedSpeakers: true }
  }
  return { labels: inviteeLabels, usedSpeakers: false }
}

/** e.g. "Carol <> Dylan" / "Carol x Dylan" → Carol + Dylan when speakers + invitees are weak. */
export function labelsFromMeetingTitleHint(title: string | null | undefined): string[] {
  const raw = stripMeetingTitlePrefix(String(title ?? ''))
  if (!raw) return []
  const pair = raw.match(/^(.+?)\s*(?:<>|✕|x|—|-)\s*(.+)$/i)
  if (!pair) return []
  const a = pair[1].trim()
  const b = pair[2].trim()
  if (!a || !b || a.length > 40 || b.length > 40) return []
  if (/impromptu|untitled|working session|zoom/i.test(a) || /impromptu|untitled|zoom/i.test(b)) {
    return []
  }
  return [a, b]
}

function slugAttendeeOptionId(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  return slug ? `att_${slug}` : `att_${Date.now()}`
}

export type MultiSelectOption = { id: string; label: string; color?: string }

export function schemaHasSelectOption(
  schema: Record<string, unknown> | null | undefined,
  fieldId: string,
  optionId: string,
): boolean {
  const fields = Array.isArray(schema?.fields) ? (schema.fields as unknown[]) : []
  const field = fields.find(
    (f) => f && typeof f === 'object' && String((f as { id?: unknown }).id ?? '') === fieldId,
  ) as { options?: Array<{ id?: unknown }> } | undefined
  if (!field || !Array.isArray(field.options)) return false
  return field.options.some((opt) => String(opt.id ?? '') === optionId)
}

export function splitPersonDisplayName(label: string): {
  first_name: string | null
  last_name: string | null
} {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first_name: null, last_name: null }
  if (parts.length === 1) return { first_name: parts[0], last_name: null }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

/** Attendees with emails — candidates for CRM People upsert. */
export function collectFathomAttendeesWithEmail(
  attendees: FathomAttendeeLike[],
): Array<{ email: string; first_name: string | null; last_name: string | null }> {
  const seen = new Set<string>()
  const out: Array<{ email: string; first_name: string | null; last_name: string | null }> = []
  for (const person of attendees) {
    const email = String(person.email ?? '')
      .trim()
      .toLowerCase()
    if (!email || !email.includes('@') || seen.has(email)) continue
    seen.add(email)
    const label = fathomPersonLabel(person)
    const names =
      label && label !== 'Unknown' && !label.includes('@')
        ? splitPersonDisplayName(label)
        : { first_name: null, last_name: null }
    out.push({ email, ...names })
  }
  return out
}

/**
 * Upsert multi_select options for attendee tags. Returns option ids for the given labels
 * and a schema whether options changed.
 */
export function upsertAttendeeTagOptions(
  schema: Record<string, unknown> | null | undefined,
  labels: string[],
  fieldId = 'attendees',
): { optionIds: string[]; nextSchema: Record<string, unknown> | null; optionsChanged: boolean } {
  if (!schema || labels.length === 0) {
    return { optionIds: [], nextSchema: schema ? { ...schema } : null, optionsChanged: false }
  }
  const fields = Array.isArray(schema.fields) ? [...(schema.fields as unknown[])] : []
  const fieldIndex = fields.findIndex(
    (field) =>
      field &&
      typeof field === 'object' &&
      String((field as { id?: unknown }).id ?? '') === fieldId,
  )
  if (fieldIndex < 0) {
    return { optionIds: [], nextSchema: { ...schema }, optionsChanged: false }
  }

  const field = { ...(fields[fieldIndex] as Record<string, unknown>) }
  if (String(field.type ?? '') !== 'multi_select') {
    return { optionIds: [], nextSchema: { ...schema }, optionsChanged: false }
  }

  const existing = Array.isArray(field.options)
    ? ([...(field.options as MultiSelectOption[])] as MultiSelectOption[])
    : []
  const byLabel = new Map(existing.map((opt) => [String(opt.label).toLowerCase(), opt]))
  const usedIds = new Set(existing.map((opt) => opt.id))
  let optionsChanged = false
  const optionIds: string[] = []

  for (const label of labels) {
    const key = label.toLowerCase()
    let option = byLabel.get(key)
    if (!option) {
      let id = slugAttendeeOptionId(label)
      if (usedIds.has(id)) id = `${id}_${usedIds.size}`
      option = {
        id,
        label,
        color: ATTENDEE_TAG_COLORS[usedIds.size % ATTENDEE_TAG_COLORS.length],
      }
      existing.push(option)
      byLabel.set(key, option)
      usedIds.add(id)
      optionsChanged = true
    }
    optionIds.push(option.id)
  }

  field.options = existing
  fields[fieldIndex] = field
  return {
    optionIds,
    nextSchema: { ...schema, fields },
    optionsChanged,
  }
}
