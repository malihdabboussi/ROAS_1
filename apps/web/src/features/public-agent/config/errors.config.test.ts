import { describe, expect, it } from 'vitest'
import { resolvePublicAgentStreamErrorMessage } from './errors.config'

describe('resolvePublicAgentStreamErrorMessage', () => {
  it('maps no-answer events to a retryable public widget message', () => {
    expect(resolvePublicAgentStreamErrorMessage({ code: 'no_answer' })).toBe(
      "I didn't get a full answer this time. Send it again and I'll retry.",
    )
  })

  it('prefers explicit server messages when present', () => {
    expect(resolvePublicAgentStreamErrorMessage({ code: 'no_answer', message: 'Try again.' })).toBe(
      'Try again.',
    )
  })
})
