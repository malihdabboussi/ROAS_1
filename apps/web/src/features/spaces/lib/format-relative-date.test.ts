import { describe, expect, it, vi, afterEach } from 'vitest'
import { formatAbsoluteDateTime, formatRelativeDate } from './format-relative-date'

describe('formatRelativeDate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty for invalid input', () => {
    expect(formatRelativeDate(null)).toBe('')
    expect(formatRelativeDate('not-a-date')).toBe('')
  })

  it('uses minutes for same-hour timestamps instead of only just now', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T17:00:00.000Z'))
    expect(formatRelativeDate('2026-07-15T16:12:00.000Z')).toBe('48m ago')
    expect(formatRelativeDate('2026-07-15T16:59:30.000Z')).toBe('just now')
  })

  it('falls back to hours, days, then calendar date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T17:00:00.000Z'))
    expect(formatRelativeDate('2026-07-15T14:00:00.000Z')).toBe('3h ago')
    expect(formatRelativeDate('2026-07-13T17:00:00.000Z')).toBe('2d ago')
    expect(formatRelativeDate('2026-06-01T12:00:00.000Z')).toBe('Jun 1')
  })
})

describe('formatAbsoluteDateTime', () => {
  it('formats a readable absolute timestamp', () => {
    const label = formatAbsoluteDateTime('2026-07-15T16:12:09.462Z')
    expect(label).toMatch(/Jul/)
    expect(label).toMatch(/15/)
    expect(label).toMatch(/2026/)
  })
})
