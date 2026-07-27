import { describe, expect, it } from 'vitest'
import { isNotConnectedError, stepSubtitle } from './page-grader-bulk-send-helpers'

describe('page-grader-bulk-send-helpers', () => {
  it('detects legacy and portal disconnect errors', () => {
    expect(isNotConnectedError('Page Grader is not connected')).toBe(true)
    expect(isNotConnectedError('The ROAS Portal is not connected')).toBe(true)
    expect(isNotConnectedError('something else')).toBe(false)
  })

  it('uses ROAS Portal wording in assignee subtitle', () => {
    expect(stepSubtitle('assignee', 2)).toContain('The ROAS Portal')
    expect(stepSubtitle('assignee', 2)).not.toContain('Page Grader')
  })
})
