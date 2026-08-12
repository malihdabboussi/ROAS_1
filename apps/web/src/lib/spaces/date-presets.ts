export type DueDatePresetKey =
  | 'today'
  | 'later'
  | 'tomorrow'
  | 'this_weekend'
  | 'next_week'
  | 'next_weekend'
  | 'two_weeks'
  | 'four_weeks'

export interface DueDatePreset {
  key: DueDatePresetKey
  label: string
  rightLabel?: string
}

const DEFAULT_DUE_HOUR = 17

export const DUE_DATE_PRESETS: DueDatePreset[] = [
  { key: 'today', label: 'Today' },
  { key: 'later', label: 'Later' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'this_weekend', label: 'This weekend' },
  { key: 'next_week', label: 'Next week' },
  { key: 'next_weekend', label: 'Next weekend' },
  { key: 'two_weeks', label: '2 weeks' },
  { key: 'four_weeks', label: '4 weeks' },
]

function atDefaultDueTime(date: Date): Date {
  const out = new Date(date)
  out.setHours(DEFAULT_DUE_HOUR, 0, 0, 0)
  return out
}

function shiftDays(date: Date, days: number): Date {
  const out = new Date(date)
  out.setDate(out.getDate() + days)
  return out
}

function nextDayOfWeek(base: Date, targetDay: number, minDaysAhead = 0): Date {
  const current = base.getDay()
  let delta = (targetDay - current + 7) % 7
  while (delta < minDaysAhead) delta += 7
  return shiftDays(base, delta)
}

export function getPresetDate(preset: DueDatePresetKey, nowInput = new Date()): Date {
  const now = new Date(nowInput)
  switch (preset) {
    case 'today':
      return atDefaultDueTime(now)
    case 'later': {
      const later = new Date(now)
      later.setHours(later.getHours() + 3, 0, 0, 0)
      return later
    }
    case 'tomorrow':
      return atDefaultDueTime(shiftDays(now, 1))
    case 'this_weekend':
      return atDefaultDueTime(nextDayOfWeek(now, 6, 0))
    case 'next_week':
      return atDefaultDueTime(nextDayOfWeek(now, 1, 1))
    case 'next_weekend':
      return atDefaultDueTime(nextDayOfWeek(now, 6, 7))
    case 'two_weeks':
      return atDefaultDueTime(shiftDays(now, 14))
    case 'four_weeks':
      return atDefaultDueTime(shiftDays(now, 28))
    default:
      return atDefaultDueTime(now)
  }
}
