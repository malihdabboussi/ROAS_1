/** Parse GOOGLECALENDAR_LIST_CALENDARS payload into calendar ids for agenda fetch. */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function unwrapComposioPayload(raw: unknown): unknown {
  const root = asRecord(raw)
  if (!root) return raw
  if (root.data !== undefined) return root.data
  return raw
}

export function extractGoogleCalendarIds(raw: unknown): string[] {
  const unwrapped = unwrapComposioPayload(raw)
  const rec = asRecord(unwrapped)
  const items =
    (rec && Array.isArray(rec.items) ? rec.items : null) ??
    (rec && Array.isArray(rec.calendars) ? rec.calendars : null) ??
    (Array.isArray(unwrapped) ? unwrapped : null)
  if (!items || items.length === 0) return ['primary']

  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const row = asRecord(item)
    if (!row) continue
    const access = String(row.accessRole ?? row.access_role ?? '').toLowerCase()
    if (access === 'freebusyreader' || access === 'reader') {
      // Still include readable calendars for agenda; skip only if explicitly hidden.
    }
    if (row.hidden === true || row.deleted === true) continue
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids.length > 0 ? ids : ['primary']
}
