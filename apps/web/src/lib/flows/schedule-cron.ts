/**
 * Web mirror of `apps/api/src/modules/spaces/services/space-automation-scheduler.service.ts`'s
 * `scheduleToCron`. Used by the TriggerBuilder for live next-fire previews and
 * by the publishable validator to surface invalid configs before save.
 *
 * Keep the two implementations in sync - the API layer is the source of truth.
 */
import parser from 'cron-parser'

export type FlowAutomationSchedule =
  | {
      mode: 'custom'
      cron: string
    }
  | {
      mode: 'preset'
      preset: 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
      interval?: number
      time?: string
      weekdays?: number[]
      day_of_week?: number
      day_of_month?: number
      month?: number
    }

export function scheduleToCron(schedule: FlowAutomationSchedule): string {
  if (schedule.mode === 'custom') {
    const expr = schedule.cron.trim()
    if (!expr) throw new Error('Custom cron expression is empty')
    parser.parseExpression(expr, { tz: 'UTC' })
    return expr
  }

  const interval = Math.max(1, Math.floor(schedule.interval ?? 1))
  switch (schedule.preset) {
    case 'minutes': {
      const n = Math.min(59, interval)
      if (n === 1) return '* * * * *'
      return `*/${n} * * * *`
    }
    case 'hourly':
      return interval === 1 ? '0 * * * *' : `0 */${interval} * * *`
    case 'daily': {
      const [h, m] = parseTime(schedule.time)
      return interval === 1 ? `${m} ${h} * * *` : `${m} ${h} */${interval} * *`
    }
    case 'weekly': {
      const [h, minute] = parseTime(schedule.time)
      const fromWeekdays =
        schedule.weekdays && schedule.weekdays.length > 0
          ? [...new Set(schedule.weekdays)].sort((a, b) => a - b)
          : [schedule.day_of_week ?? 1]
      const dow = fromWeekdays.join(',')
      if (interval !== 1) {
        throw new Error('Weekly schedule does not support interval > 1')
      }
      return `${minute} ${h} * * ${dow}`
    }
    case 'monthly': {
      const [h, m] = parseTime(schedule.time)
      const dom = schedule.day_of_month ?? 1
      return interval === 1 ? `${m} ${h} ${dom} * *` : `${m} ${h} ${dom} */${interval} *`
    }
    case 'yearly': {
      const [h, minute] = parseTime(schedule.time)
      const dom = schedule.day_of_month ?? 1
      const month = schedule.month ?? 1
      return `${minute} ${h} ${dom} ${month} *`
    }
    default: {
      const _exhaustive: never = schedule.preset
      throw new Error(`Unsupported preset: ${String(_exhaustive)}`)
    }
  }
}

function parseTime(value: string | undefined): [number, number] {
  const v = (value ?? '').trim()
  if (!v) return [9, 0]
  const match = v.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) throw new Error(`Invalid time of day: ${v} (expected HH:MM)`)
  return [Number(match[1]), Number(match[2])]
}

/** Compute the next N fires for a schedule. Returns `null` when the schedule is invalid. */
export function previewNextFires(
  schedule: FlowAutomationSchedule | undefined,
  timezone: string,
  count = 3,
  from: Date = new Date(),
): Date[] | null {
  if (!schedule) return null
  try {
    const cron = scheduleToCron(schedule)
    const interval = parser.parseExpression(cron, {
      tz: timezone || 'UTC',
      currentDate: from,
    })
    return Array.from({ length: count }, () => interval.next().toDate())
  } catch {
    return null
  }
}
