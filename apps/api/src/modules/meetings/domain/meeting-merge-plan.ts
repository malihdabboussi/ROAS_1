/**
 * Pure merge rules for combining duplicate meeting call items into a survivor.
 * The relational repointing happens in the merge_meeting_items Postgres function;
 * this module only decides eligibility and the survivor's field patch.
 */

const CALL_TITLE_PATTERN = /^(Meeting:|Fathom meeting:)/i
const RECORDING_EVIDENCE_KEYS = [
  'recording_url',
  'fathom_url',
  'fathom_meeting_id',
  'external_automation',
] as const
/** Keys that describe an item's identity/links rather than meeting data. */
const STRUCTURAL_KEYS = new Set([
  'entry_type',
  '_view_type',
  'source_call_item_id',
  'merged_from_item_ids',
])
const UNION_KEYS = ['attendees', 'participant_emails', 'tags'] as const

export interface MeetingMergeSurvivorPatch {
  custom_data: Record<string, unknown>
  description: string | null
  notes: string | null
}

/** Mirrors the web resolveSpaceEntryType heuristics for call rows. */
export function isMeetingCallItem(row: Record<string, unknown>): boolean {
  const customData = asRecord(row.custom_data)
  const explicit = customData.entry_type
  if (explicit === 'call') return true
  if (typeof explicit === 'string' && explicit.trim()) return false
  if (row.source === 'fathom') return true
  if (row.source === 'agent_suggested') return false
  if (CALL_TITLE_PATTERN.test(String(row.title ?? ''))) return true
  if (RECORDING_EVIDENCE_KEYS.some((key) => customData[key])) return true
  return false
}

/**
 * Survivor values always win; missing scalars fill from duplicates in the
 * given order, list fields union, and merged ids are recorded as a breadcrumb.
 */
export function buildMeetingMergeSurvivorPatch(
  survivor: Record<string, unknown>,
  duplicates: Record<string, unknown>[],
): MeetingMergeSurvivorPatch {
  const survivorData = asRecord(survivor.custom_data)
  const duplicateData = duplicates.map((dup) => asRecord(dup.custom_data))
  const merged: Record<string, unknown> = { ...survivorData }

  for (const dupData of duplicateData) {
    for (const [key, value] of Object.entries(dupData)) {
      if (STRUCTURAL_KEYS.has(key) || (UNION_KEYS as readonly string[]).includes(key)) continue
      if (isEmptyValue(merged[key]) && !isEmptyValue(value)) merged[key] = value
    }
  }

  for (const key of UNION_KEYS) {
    const union = unionStrings(
      [survivorData, ...duplicateData].map((data) => data[key]),
      key === 'participant_emails',
    )
    if (union.length > 0) merged[key] = union
  }

  merged.entry_type = 'call'
  const previous = Array.isArray(survivorData.merged_from_item_ids)
    ? survivorData.merged_from_item_ids.map(String)
    : []
  const duplicateIds = duplicates.map((dup) => String(dup.id))
  merged.merged_from_item_ids = [
    ...previous,
    ...duplicateIds.filter((id) => !previous.includes(id)),
  ]

  return {
    custom_data: merged,
    description: fillText(
      survivor.description,
      duplicates.map((dup) => dup.description),
    ),
    notes: fillText(
      survivor.notes,
      duplicates.map((dup) => dup.notes),
    ),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function isEmptyValue(value: unknown): boolean {
  return value == null || value === ''
}

function unionStrings(sources: unknown[], caseInsensitive: boolean): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const source of sources) {
    if (!Array.isArray(source)) continue
    for (const entry of source) {
      if (typeof entry !== 'string' || !entry.trim()) continue
      const key = caseInsensitive ? entry.trim().toLowerCase() : entry.trim()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(caseInsensitive ? entry.trim().toLowerCase() : entry)
    }
  }
  return out
}

function fillText(survivorValue: unknown, duplicateValues: unknown[]): string | null {
  if (typeof survivorValue === 'string' && survivorValue.trim()) return survivorValue
  for (const value of duplicateValues) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}
