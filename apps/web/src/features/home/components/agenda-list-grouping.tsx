'use client'

import { agendaListFetchWindow } from '@/features/home/lib/agenda-fetch-window'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

type DateRange = 'day' | 'week' | 'month'

export function dayKeyInTimeZone(dt: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt)
}

function utcMidnightMsFromDayKey(dayKey: string): number {
  const parts = dayKey.split('-').map(Number)
  const y = parts[0]!
  const mo = parts[1]!
  const d = parts[2]!
  return Date.UTC(y, mo - 1, d)
}

/** One line: "Tomorrow" / "Yesterday" / "Thursday 14 May" (never the word "Today"). */
function agendaListDayDividerLabel(dayKey: string, nowTick: number, timeZone: string): string {
  const todayKey = dayKeyInTimeZone(new Date(nowTick), timeZone)
  const delta = Math.round(
    (utcMidnightMsFromDayKey(dayKey) - utcMidnightMsFromDayKey(todayKey)) / 86_400_000,
  )
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'
  const parts = dayKey.split('-').map(Number)
  const y = parts[0]!
  const mo = parts[1]!
  const d = parts[2]!
  const utc = new Date(Date.UTC(y, mo - 1, d, 12))
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
    .format(utc)
    .replace(/,/g, '')
    .trim()
}

/** Anchor uses local navigator dates (`day` state); bucket keys honor `timezone`. */
export function enumerateDayKeysInNavRange(
  anchor: Date,
  range: DateRange,
  timeZone: string,
): string[] {
  const keys: string[] = []
  const { viewStart, viewEnd } = agendaListFetchWindow(anchor, range)
  let cur = viewStart
  while (cur.getTime() <= viewEnd.getTime()) {
    keys.push(dayKeyInTimeZone(cur, timeZone))
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 1)
  }
  return keys
}

export function eventsGroupedByDayKey(
  list: CalendarAgendaEvent[],
  timeZone: string,
): Map<string, CalendarAgendaEvent[]> {
  const m = new Map<string, CalendarAgendaEvent[]>()
  for (const ev of list) {
    const k = dayKeyInTimeZone(new Date(ev.start), timeZone)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(ev)
  }
  for (const [, arr] of m) {
    arr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }
  return m
}

export function AgendaWeekDaySeparator({
  dayKey,
  nowTick,
  timeZone,
}: {
  dayKey: string
  nowTick: number
  timeZone: string
}) {
  const label = agendaListDayDividerLabel(dayKey, nowTick, timeZone)

  return (
    <div className="relative flex items-center justify-center py-2.5">
      <div className="border-border absolute inset-x-0 top-1/2 border-t" />
      <div className="border-border text-foreground relative z-[1] max-w-[min(100%,20rem)] rounded-full border bg-[var(--color-card)] px-4 py-1.5 text-center text-xs font-semibold leading-none shadow-sm">
        {label}
      </div>
    </div>
  )
}
