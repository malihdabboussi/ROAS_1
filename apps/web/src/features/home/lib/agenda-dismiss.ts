import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

const DISMISS_STORAGE_KEY = 'vibey-home-agenda-dismissed'

/** Stable key for soft-dismissing one agenda occurrence (not the whole series forever). */
export function agendaEventDismissKey(
  ev: Pick<CalendarAgendaEvent, 'id' | 'start' | 'source' | 'account_id'>,
): string {
  return `${ev.account_id ?? ev.source}:${ev.id}:${ev.start}`
}

export function readDismissedAgendaKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function writeDismissedAgendaKeys(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...ids]))
}

export function dismissAgendaEvent(ev: CalendarAgendaEvent): Set<string> {
  const next = readDismissedAgendaKeys()
  next.add(agendaEventDismissKey(ev))
  writeDismissedAgendaKeys(next)
  return next
}
