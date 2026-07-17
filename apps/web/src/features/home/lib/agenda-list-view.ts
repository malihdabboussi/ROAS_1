'use client'

import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { dayKeyInTimeZone } from '@/features/home/components/agenda-list-grouping'

/** Collapse duplicate meetings from multi-calendar / multi-account merges. */
export function dedupeAgendaEvents(events: CalendarAgendaEvent[]): CalendarAgendaEvent[] {
  const seen = new Map<string, CalendarAgendaEvent>()
  for (const ev of events) {
    const title = (ev.title ?? '').trim().toLowerCase()
    const key = `${ev.start}|${ev.end}|${title}|${ev.html_link ?? ''}`
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, ev)
      continue
    }
    // Prefer primary / default calendar labels when colliding.
    const existingPrimary = /primary|default/i.test(String(existing.account_label ?? ''))
    const nextPrimary = /primary|default/i.test(String(ev.account_label ?? ''))
    if (!existingPrimary && nextPrimary) seen.set(key, ev)
  }
  return [...seen.values()]
}

export function pickNextAgendaEvent(
  events: CalendarAgendaEvent[],
  nowTick: number,
): CalendarAgendaEvent | null {
  const upcoming = events
    .filter((ev) => new Date(ev.end).getTime() > nowTick)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  return upcoming[0] ?? null
}

export function tomorrowDayKey(nowTick: number, timeZone: string): string {
  const d = new Date(nowTick)
  d.setDate(d.getDate() + 1)
  return dayKeyInTimeZone(d, timeZone)
}
