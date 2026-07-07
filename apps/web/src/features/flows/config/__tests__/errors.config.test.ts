import { describe, expect, it } from 'vitest'
import { formatFlowValidationError } from '../errors.config'

describe('formatFlowValidationError', () => {
  it('maps assignee_type enum errors to a friendly step message', () => {
    const result = formatFlowValidationError(
      "actions.3.assignee_type: Invalid enum value. Expected 'human' | 'agent', received 'user'",
    )
    expect(result.userMessage).toContain('Step 4')
    expect(result.userMessage).toContain('team member or agent')
    expect(result.userMessage).toContain('"user"')
  })

  it('maps required email fields', () => {
    const result = formatFlowValidationError('actions.1.subject_template: Subject is required')
    expect(result.userMessage).toBe('Step 2: Add an email subject.')
  })
})
