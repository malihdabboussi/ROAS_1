import type { RecurrenceSpec } from '../types'
import { isCreateNewTask, isUpdateSameItem } from './recurrence-flags'

export const DEFAULT_RECURRENCE_SPEC: RecurrenceSpec = {
  frequency: 'weekly',
  interval: 1,
  trigger: 'status_change',
  trigger_status: 'done',
  create_new_task: true,
  update_same_item: false,
  sync_to_due_date: true,
  end: { type: 'forever' },
}

function cap(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const UNIT_LABELS: Record<string, [string, string]> = {
  day: ['day', 'days'],
  week: ['week', 'weeks'],
  month: ['month', 'months'],
  year: ['year', 'years'],
}

function unitLabel(unit: string, count: number): string {
  const pair = UNIT_LABELS[unit]
  if (!pair) return unit
  return count === 1 ? pair[0] : pair[1]
}

export function addRecurrenceInterval(base: Date, recurrence: RecurrenceSpec): Date {
  const next = new Date(base)
  const rawInterval = Number(recurrence.interval)
  const interval = Number.isFinite(rawInterval) && rawInterval > 0 ? Math.floor(rawInterval) : 1

  if (recurrence.frequency === 'days_after') {
    const rawDaysAfter = Number(recurrence.days_after_count)
    const daysAfter =
      Number.isFinite(rawDaysAfter) && rawDaysAfter > 0 ? Math.floor(rawDaysAfter) : 1
    next.setDate(next.getDate() + daysAfter)
    return next
  }

  if (recurrence.frequency === 'custom') {
    const unit = recurrence.custom_unit ?? 'week'
    switch (unit) {
      case 'day':
        next.setDate(next.getDate() + interval)
        return next
      case 'week':
        next.setDate(next.getDate() + interval * 7)
        return next
      case 'month':
        next.setMonth(next.getMonth() + interval)
        return next
      case 'year':
        next.setFullYear(next.getFullYear() + interval)
        return next
      default:
        return next
    }
  }

  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      return next
    case 'weekly':
      next.setDate(next.getDate() + interval * 7)
      return next
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      return next
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      return next
    default:
      return next
  }
}

export function nextOccurrence(recurrence: RecurrenceSpec, anchor: string | Date): Date | null {
  const base = anchor instanceof Date ? new Date(anchor) : new Date(anchor)
  if (Number.isNaN(base.getTime())) return null
  return addRecurrenceInterval(base, recurrence)
}

export function describeRecurrence(recurrence: RecurrenceSpec | null): string {
  if (!recurrence) return ''

  let frequencyLabel: string
  if (recurrence.frequency === 'days_after') {
    const n = recurrence.days_after_count ?? 1
    frequencyLabel = `${n} ${unitLabel('day', n)} after completion`
  } else if (recurrence.frequency === 'custom') {
    const unit = recurrence.custom_unit ?? 'week'
    frequencyLabel = `${recurrence.interval} ${unitLabel(unit, recurrence.interval)}`
  } else {
    const every = recurrence.interval > 1 ? `${recurrence.interval}` : ''
    frequencyLabel = every ? `${every} ${cap(recurrence.frequency)}` : cap(recurrence.frequency)
  }

  const trigger =
    recurrence.trigger === 'status_change'
      ? `On ${cap((recurrence.trigger_status ?? 'done').replace('_', ' '))}`
      : 'On schedule'
  const partsMode: string[] = []
  if (isCreateNewTask(recurrence)) {
    partsMode.push('New task')
  }
  if (isUpdateSameItem(recurrence)) {
    partsMode.push(`Row → ${cap((recurrence.reset_status ?? 'todo').replace(/_/g, ' '))}`)
  }
  const mode = partsMode.length > 0 ? partsMode.join(' + ') : '—'
  const end =
    recurrence.end.type === 'forever'
      ? ''
      : recurrence.end.type === 'count'
        ? `${recurrence.end.count}x`
        : `Until ${new Date(recurrence.end.until).toLocaleDateString()}`

  const parts = [frequencyLabel, trigger, mode]
  if (end) parts.push(end)
  return parts.join(' · ')
}
