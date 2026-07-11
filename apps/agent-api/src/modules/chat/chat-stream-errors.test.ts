import { describe, expect, it } from 'vitest'
import { classifyChatStreamError, isChatStreamRateLimitMessage } from './chat-stream-errors'

describe('classifyChatStreamError', () => {
  it('classifies provider billing failures separately from temporary availability', () => {
    const message =
      "API provider returned a billing error — your API key has run out of credits or has an insufficient balance. Check your provider's billing dashboard and top up or switch to a different API key."

    expect(classifyChatStreamError(message)).toBe('provider_billing')
    expect(isChatStreamRateLimitMessage(message)).toBe(false)
  })

  it('keeps provider billing ahead of generic gateway wording', () => {
    const message =
      'provider_billing: Gateway connection error: agent gateway 402: insufficient balance'

    expect(classifyChatStreamError(message)).toBe('provider_billing')
    expect(isChatStreamRateLimitMessage(message)).toBe(false)
  })

  it('keeps provider busy ahead of generic gateway wording', () => {
    const message = 'busy: Gateway connection error: agent gateway 429: rate limit exceeded'

    expect(classifyChatStreamError(message)).toBe('busy')
    expect(isChatStreamRateLimitMessage(message)).toBe(true)
  })

  it('classifies invalidated integration tokens as reconnect required', () => {
    const message = 'Your authentication token has been invalidated. Please try signing in again.'

    expect(classifyChatStreamError(message)).toBe('reconnect_required')
    expect(isChatStreamRateLimitMessage(message)).toBe(false)
  })

  it('classifies missing OpenAI Codex subscription auth as reconnect required', () => {
    const message = 'OpenAI Codex subscription is not connected for this admin account'

    expect(classifyChatStreamError(message)).toBe('openai_codex_not_connected')
    expect(isChatStreamRateLimitMessage(message)).toBe(false)
  })

  it('classifies missing Claude subscription auth as a non-rate-limit request failure', () => {
    const message = 'Claude subscription is not connected'

    expect(classifyChatStreamError(message)).toBe('anthropic_claude_not_connected')
    expect(isChatStreamRateLimitMessage(message)).toBe(false)
  })

  it('classifies generic service unavailability as temporary runtime unavailability', () => {
    const message = 'Service unavailable'

    expect(classifyChatStreamError(message)).toBe('temporary_unavailable')
    expect(isChatStreamRateLimitMessage(message)).toBe(false)
  })

  it('keeps explicit provider overloads as model busy', () => {
    const message = 'The provider is temporarily overloaded. Please try again later.'

    expect(classifyChatStreamError(message)).toBe('busy')
    expect(isChatStreamRateLimitMessage(message)).toBe(true)
  })
})
