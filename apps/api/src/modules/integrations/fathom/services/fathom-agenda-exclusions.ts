export type FathomAgendaExclusion = {
  key: string
  eventId: string
  title: string
  start: string
  source: 'google_calendar' | 'outlook' | 'fathom'
  accountId: string | null
}

export const AGENDA_EXCLUSIONS_PREFERENCE_KEY = 'agenda_minimized_occurrences'

const MAX_STORED_EXCLUSIONS = 200
const START_MATCH_TOLERANCE_MS = 45 * 60 * 1000

function normalizedTitle(value: unknown): string {
  return typeof value === 'string'
    ? value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
    : ''
}

function eventStartMs(event: Record<string, unknown>): number | null {
  for (const key of [
    'scheduled_start_time',
    'recording_start_time',
    'started_at',
    'created_at',
  ] as const) {
    const value = event[key]
    if (typeof value !== 'string') continue
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

export function readFathomAgendaExclusions(
  metadata: Record<string, unknown>,
): FathomAgendaExclusion[] {
  const raw = metadata[AGENDA_EXCLUSIONS_PREFERENCE_KEY]
  if (!Array.isArray(raw)) return []
  return raw.filter((value): value is FathomAgendaExclusion => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const row = value as Record<string, unknown>
    return (
      typeof row.key === 'string' &&
      typeof row.eventId === 'string' &&
      typeof row.title === 'string' &&
      typeof row.start === 'string' &&
      ['google_calendar', 'outlook', 'fathom'].includes(String(row.source)) &&
      (row.accountId === null || typeof row.accountId === 'string')
    )
  })
}

export function updateFathomAgendaExclusions(
  current: FathomAgendaExclusion[],
  exclusion: FathomAgendaExclusion,
  minimized: boolean,
): FathomAgendaExclusion[] {
  const withoutOccurrence = current.filter((row) => row.key !== exclusion.key)
  if (!minimized) return withoutOccurrence
  return [...withoutOccurrence, exclusion].slice(-MAX_STORED_EXCLUSIONS)
}

export function matchesFathomAgendaExclusion(
  exclusions: FathomAgendaExclusion[],
  event: Record<string, unknown>,
): boolean {
  const calendarEventId =
    typeof event.calendar_event_id === 'string'
      ? event.calendar_event_id
      : typeof event.calendarEventId === 'string'
        ? event.calendarEventId
        : null
  if (calendarEventId && exclusions.some((row) => row.eventId === calendarEventId)) return true

  const title = normalizedTitle(event.title ?? event.meeting_title)
  const start = eventStartMs(event)
  if (!title || start === null) return false
  return exclusions.some((row) => {
    const exclusionStart = Date.parse(row.start)
    return (
      normalizedTitle(row.title) === title &&
      !Number.isNaN(exclusionStart) &&
      Math.abs(exclusionStart - start) <= START_MATCH_TOLERANCE_MS
    )
  })
}
