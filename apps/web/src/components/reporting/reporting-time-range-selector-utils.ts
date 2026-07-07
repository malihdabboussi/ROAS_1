import type { ReportingTimeRange } from '@/lib/reporting/resolve-reporting-dates'

export interface ReportingTimeRangePreset {
  key: ReportingTimeRange
  label: string
}

export const TIME_RANGE_PRESETS_DURATION: ReportingTimeRangePreset[] = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '15d', label: 'Last 15 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
]

export const TIME_RANGE_PRESETS_CALENDAR: ReportingTimeRangePreset[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_quarter', label: 'This quarter' },
  { key: 'last_quarter', label: 'Last quarter' },
  { key: 'this_year', label: 'This year' },
  { key: 'last_year', label: 'Last year' },
  { key: 'all', label: 'All time' },
]

export const TIME_RANGE_PRESETS: ReportingTimeRangePreset[] = [
  ...TIME_RANGE_PRESETS_DURATION,
  ...TIME_RANGE_PRESETS_CALENDAR,
]

export const CAL_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function parseIso(v: string | null | undefined): Date | null {
  if (!v) return null
  const d = new Date(v + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? null : d
}

export function fmtDate(v: string | null | undefined): string | null {
  if (!v) return null
  const d = parseIso(v)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
}

export function getMonthGrid(month: Date): { date: Date; isCurrentMonth: boolean }[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(start)
  gridStart.setDate(1 - start.getDay())
  const cells: { date: Date; isCurrentMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push({ date: d, isCurrentMonth: d.getMonth() === month.getMonth() })
  }
  return cells
}

export function toMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function isSameDay(a: Date | null, b: Date): boolean {
  if (!a) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatIsoDate(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
    day.getDate(),
  ).padStart(2, '0')}`
}
