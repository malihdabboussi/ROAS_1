import { describe, expect, it } from 'vitest'
import { formatCompactRelativeTime } from './format-compact-relative-time'

describe('formatCompactRelativeTime', () => {
  const now = Date.parse('2026-07-24T21:00:00.000Z')

  it('returns empty for invalid input', () => {
    expect(formatCompactRelativeTime(null, now)).toBe('')
    expect(formatCompactRelativeTime('not-a-date', now)).toBe('')
  })

  it('formats Cursor-style compact ages', () => {
    expect(formatCompactRelativeTime('2026-07-24T20:59:30.000Z', now)).toBe('now')
    expect(formatCompactRelativeTime('2026-07-24T20:41:00.000Z', now)).toBe('19m')
    expect(formatCompactRelativeTime('2026-07-24T11:00:00.000Z', now)).toBe('10h')
    expect(formatCompactRelativeTime('2026-07-23T21:00:00.000Z', now)).toBe('1d')
    expect(formatCompactRelativeTime('2026-06-24T21:00:00.000Z', now)).toBe('1mo')
    expect(formatCompactRelativeTime('2025-07-24T21:00:00.000Z', now)).toBe('1y')
  })
})
