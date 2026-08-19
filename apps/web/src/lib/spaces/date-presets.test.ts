import { describe, expect, it } from 'vitest'
import { dueDatePresetRows, formatPresetRightLabel, getPresetDate } from './date-presets'

describe('date-presets', () => {
  const now = new Date(2026, 7, 18, 14, 13, 0)

  it('labels nearby presets with weekday or clock like ClickUp', () => {
    expect(formatPresetRightLabel('today', getPresetDate('today', now))).toBe('Tue')
    expect(formatPresetRightLabel('later', getPresetDate('later', now))).toBe('5:13 PM')
    expect(formatPresetRightLabel('tomorrow', getPresetDate('tomorrow', now))).toBe('Wed')
    expect(formatPresetRightLabel('this_weekend', getPresetDate('this_weekend', now))).toBe('Sat')
    expect(formatPresetRightLabel('next_week', getPresetDate('next_week', now))).toBe('Mon')
  })

  it('labels farther presets with day and month', () => {
    expect(formatPresetRightLabel('next_weekend', getPresetDate('next_weekend', now))).toBe(
      '29 Aug',
    )
    expect(formatPresetRightLabel('two_weeks', getPresetDate('two_weeks', now))).toBe('1 Sep')
    expect(formatPresetRightLabel('four_weeks', getPresetDate('four_weeks', now))).toBe('15 Sep')
  })

  it('builds preset rows with right-side hints', () => {
    const rows = dueDatePresetRows(now)
    expect(rows.map((row) => row.label)).toEqual([
      'Today',
      'Later',
      'Tomorrow',
      'This weekend',
      'Next week',
      'Next weekend',
      '2 weeks',
      '4 weeks',
    ])
    expect(rows[0]?.rightLabel).toBe('Tue')
  })
})
