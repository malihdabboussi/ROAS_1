import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

const MINIMIZED_STORAGE_KEY = 'vibey-home-agenda-minimized'
const LEGACY_DISMISSED_STORAGE_KEY = 'vibey-home-agenda-dismissed'

/** Stable key for minimizing one agenda occurrence without affecting the whole series. */
export function agendaEventMinimizeKey(
  ev: Pick<CalendarAgendaEvent, 'id' | 'start' | 'source' | 'account_id'>,
): string {
  return `${ev.account_id ?? ev.source}:${ev.id}:${ev.start}`
}

function parseStoredKeys(raw: string | null): Set<string> {
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function readMinimizedAgendaKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const minimized = parseStoredKeys(window.localStorage.getItem(MINIMIZED_STORAGE_KEY))
  if (minimized.size > 0 || !window.localStorage.getItem(LEGACY_DISMISSED_STORAGE_KEY)) {
    return minimized
  }

  const migrated = parseStoredKeys(window.localStorage.getItem(LEGACY_DISMISSED_STORAGE_KEY))
  writeMinimizedAgendaKeys(migrated)
  window.localStorage.removeItem(LEGACY_DISMISSED_STORAGE_KEY)
  return migrated
}

export function writeMinimizedAgendaKeys(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MINIMIZED_STORAGE_KEY, JSON.stringify([...ids]))
}

export function setAgendaEventMinimized(
  ev: CalendarAgendaEvent,
  minimized: boolean,
): Set<string> {
  const next = readMinimizedAgendaKeys()
  const key = agendaEventMinimizeKey(ev)
  if (minimized) next.add(key)
  else next.delete(key)
  writeMinimizedAgendaKeys(next)
  return next
}
