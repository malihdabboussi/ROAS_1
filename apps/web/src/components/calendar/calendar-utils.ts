import type { CalendarScope } from './types'

export const CALENDAR_HOURS = Array.from({ length: 24 }, (_, i) => i)

export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function defaultScheduleValue(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return toLocalInputValue(d.toISOString())
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function getWeekDays(date: Date, weekStart: 0 | 1 = 0): Date[] {
  const start = new Date(date)
  const day = start.getDay()
  const diff = weekStart === 1 ? (day === 0 ? -6 : 1 - day) : -day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function getMonthDays(date: Date, weekStart: 0 | 1 = 0): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const start = getWeekDays(monthStart, weekStart)[0]!
  const endWeek = getWeekDays(monthEnd, weekStart)
  const end = endWeek[6]!
  const result: Date[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    result.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function parseCalendarDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

export function buildLocalDateFromDayAndHour(day: string, hour: number, minute = 0): Date {
  const d = new Date(`${day}T00:00:00`)
  d.setHours(hour, minute, 0, 0)
  return d
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const cursor = startOfDay(start)
  const limit = startOfDay(end)
  while (cursor.getTime() <= limit.getTime()) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

/** Visible inclusive date range shown by CalendarBoard for a given scope — use to drive API/event fetches. */
export function getCalendarBoardVisibleWindow(
  scope: CalendarScope,
  selectedDay: Date,
  currentMonth: Date,
  weekStart: 0 | 1 = 0,
): { start: Date; end: Date } {
  if (scope === 'day') {
    return { start: startOfDay(selectedDay), end: endOfDay(selectedDay) }
  }
  if (scope === 'week') {
    const week = getWeekDays(selectedDay, weekStart)
    return { start: startOfDay(week[0]!), end: endOfDay(week[6]!) }
  }
  const md = getMonthDays(currentMonth, weekStart)
  if (md.length === 0) {
    return { start: startOfMonth(currentMonth), end: endOfDay(endOfMonth(currentMonth)) }
  }
  return { start: startOfDay(md[0]!), end: endOfDay(md[md.length - 1]!) }
}

export function getHeaderLabel(
  scope: CalendarScope,
  selectedDay: Date,
  currentMonth: Date,
  weekStart: 0 | 1 = 0,
): string {
  if (scope === 'day') {
    return selectedDay.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }
  if (scope === 'week') {
    const week = getWeekDays(selectedDay, weekStart)
    const first = week[0]!
    const last = week[6]!
    if (first.getMonth() === last.getMonth()) {
      return `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()} - ${last.getDate()}, ${first.getFullYear()}`
    }
    return `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()} - ${last.toLocaleDateString('en-US', { month: 'short' })} ${last.getDate()}, ${last.getFullYear()}`
  }
  return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
