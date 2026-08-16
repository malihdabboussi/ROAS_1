import { describe, expect, it } from 'vitest'
import { formatMissionRowDate, formatMissionStepTitle } from './mission-step-title'

describe('formatMissionStepTitle', () => {
  it('drops the authored ordinal prefix that the numbered list already shows', () => {
    expect(formatMissionStepTitle('Task 1 - Verify audit context')).toBe('Verify audit context')
    expect(formatMissionStepTitle('Gate 1 - Approve optimization actions')).toBe(
      'Approve optimization actions',
    )
    expect(formatMissionStepTitle('Step 12: Publish')).toBe('Publish')
  })

  it('leaves titles that merely start with a word alone', () => {
    expect(formatMissionStepTitle('Taskmaster review')).toBe('Taskmaster review')
    expect(formatMissionStepTitle('Gatekeeper sign-off')).toBe('Gatekeeper sign-off')
    expect(formatMissionStepTitle('Audit live Meta performance')).toBe(
      'Audit live Meta performance',
    )
  })

  it('keeps the original when stripping would leave nothing', () => {
    expect(formatMissionStepTitle('Task 1')).toBe('Task 1')
    expect(formatMissionStepTitle('Gate 2 - ')).toBe('Gate 2 -')
  })
})

describe('formatMissionRowDate', () => {
  it('includes the time, because runs of one playbook sit minutes apart', () => {
    const formatted = formatMissionRowDate('2026-08-13T14:12:00.000Z')
    expect(formatted).toMatch(/Aug/)
    expect(formatted).toMatch(/\d{1,2}:\d{2}/)
  })

  it('returns nothing for an unparseable timestamp rather than "Invalid Date"', () => {
    expect(formatMissionRowDate('not-a-date')).toBe('')
  })
})
