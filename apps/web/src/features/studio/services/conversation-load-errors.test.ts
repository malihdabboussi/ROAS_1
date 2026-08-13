import { describe, expect, it } from 'vitest'
import { isConversationUnavailableError } from './conversation-load-errors'

describe('isConversationUnavailableError', () => {
  it.each([
    'Conversation not found',
    'Backend error 404',
    'Insufficient permissions for this conversation',
    'Backend error 403',
  ])('recognizes an unavailable linked conversation: %s', (message) => {
    expect(isConversationUnavailableError(new Error(message))).toBe(true)
  })

  it('does not hide unrelated conversation failures', () => {
    expect(isConversationUnavailableError(new Error('Backend error 500'))).toBe(false)
  })
})
