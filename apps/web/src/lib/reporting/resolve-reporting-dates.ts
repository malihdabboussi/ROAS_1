export type ReportingTimeRange =
  | '24h'
  | '7d'
  | '15d'
  | '30d'
  | '90d'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'all'

/** Minimal input for reporting date range resolution. */
export interface ReportingDateRangeInput {
  time_range?: ReportingTimeRange
  custom_start?: string
  custom_end?: string
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toIso(d: Date): string {
  return d.toISOString().split('T')[0]!
}

function resolvePresetRange(range: ReportingTimeRange): {
  startDate: string | undefined
  endDate: string | undefined
} {
  if (range === 'all') return { startDate: undefined, endDate: undefined }

  const now = new Date()
  const today = startOfDay(now)

  switch (range) {
    case '24h': {
      const d = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return { startDate: toIso(d), endDate: undefined }
    }
    case '7d':
    case '15d':
    case '30d':
    case '90d': {
      const days = parseInt(range, 10)
      const d = new Date(today)
      d.setDate(d.getDate() - days)
      return { startDate: toIso(d), endDate: undefined }
    }
    case 'this_month':
      return {
        startDate: toIso(new Date(today.getFullYear(), today.getMonth(), 1)),
        endDate: undefined,
      }
    case 'last_month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const last = new Date(today.getFullYear(), today.getMonth(), 0)
      return { startDate: toIso(first), endDate: toIso(last) }
    }
    case 'this_quarter': {
      const qStart = Math.floor(today.getMonth() / 3) * 3
      return {
        startDate: toIso(new Date(today.getFullYear(), qStart, 1)),
        endDate: undefined,
      }
    }
    case 'last_quarter': {
      const qStart = Math.floor(today.getMonth() / 3) * 3
      const prevQStart = qStart - 3
      const year = prevQStart < 0 ? today.getFullYear() - 1 : today.getFullYear()
      const month = ((prevQStart % 12) + 12) % 12
      const first = new Date(year, month, 1)
      const last = new Date(year, month + 3, 0)
      return { startDate: toIso(first), endDate: toIso(last) }
    }
    case 'this_year':
      return {
        startDate: toIso(new Date(today.getFullYear(), 0, 1)),
        endDate: undefined,
      }
    case 'last_year': {
      const year = today.getFullYear() - 1
      return {
        startDate: toIso(new Date(year, 0, 1)),
        endDate: toIso(new Date(year, 11, 31)),
      }
    }
    default: {
      const _exhaustive: never = range
      return _exhaustive
    }
  }
}

/**
 * Resolve the effective start/end ISO date strings from reporting config.
 * `custom_start` / `custom_end` take precedence; otherwise computed from `time_range`.
 */
export function resolveReportingDates(config: ReportingDateRangeInput | undefined): {
  startDate: string | undefined
  endDate: string | undefined
} {
  const c = config ?? {}

  if (c.custom_start || c.custom_end) {
    return {
      startDate: c.custom_start ?? undefined,
      endDate: c.custom_end ?? undefined,
    }
  }

  return resolvePresetRange(c.time_range ?? '30d')
}
