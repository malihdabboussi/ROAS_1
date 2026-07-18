import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveReportingDates } from './resolve-reporting-dates'

describe('resolveReportingDates', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves preset reporting windows from the current day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 23, 12))

    expect(resolveReportingDates({ time_range: '7d' })).toEqual({
      startDate: '2026-06-16',
      endDate: undefined,
    })
    expect(resolveReportingDates({ time_range: 'last_month' })).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    })
    expect(resolveReportingDates({ time_range: 'this_quarter' })).toEqual({
      startDate: '2026-04-01',
      endDate: undefined,
    })
  })

  it('lets custom start and end dates override presets', () => {
    expect(
      resolveReportingDates({
        time_range: '30d',
        custom_start: '2026-06-01',
        custom_end: '2026-06-20',
      }),
    ).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-06-20',
    })
  })

  it('defaults to the last 30 days when config is missing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 23, 12))

    expect(resolveReportingDates(undefined)).toEqual({
      startDate: '2026-05-24',
      endDate: undefined,
    })
  })
})
