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
      later.setTime(later.getTime() + 3 * 60 * 60 * 1000)
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

export function formatPresetRightLabel(key: DueDatePresetKey, date: Date): string {
  switch (key) {
    case 'today':
    case 'tomorrow':
    case 'this_weekend':
    case 'next_week':
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    case 'later':
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    case 'next_weekend':
    case 'two_weeks':
    case 'four_weeks':
      return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export function dueDatePresetRows(now = new Date()): Array<DueDatePreset & { rightLabel: string }> {
  return DUE_DATE_PRESETS.map((preset) => {
    const date = getPresetDate(preset.key, now)
    return { ...preset, rightLabel: formatPresetRightLabel(preset.key, date) }
  })
}
