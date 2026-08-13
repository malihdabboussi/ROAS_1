import { describe, expect, it } from 'vitest'
import { formatAgencyBudget, formatAgencyDate } from './agency-client-format'

describe('agency client formatting', () => {
  it('renders date-only campaign dates without a UTC day shift', () => {
    expect(formatAgencyDate('2026-08-20')).toContain('Aug 20')
  })

  it('renders invalid and missing dates safely', () => {
    expect(formatAgencyDate('not-a-date')).toBe('not-a-date')
    expect(formatAgencyDate(null)).toBe('Not set')
  })

  it('renders campaign budget context', () => {
    expect(formatAgencyBudget(5000, '$', 'monthly')).toBe('$5,000 / monthly')
    expect(formatAgencyBudget(null)).toBe('Not set')
  })
})
