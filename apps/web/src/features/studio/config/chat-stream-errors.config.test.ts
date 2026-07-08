import { describe, expect, it } from 'vitest'
import {
  ChatStreamUserError,
  resolveChatStreamErrorToast,
  resolveChatStreamFailure,
  toastMessageForChatSendError,
} from './chat-stream-errors.config'

describe('resolveChatStreamFailure', () => {
  it('marks transport interruptions for automatic recovery and a single Resume fallback', () => {
    const resolved = resolveChatStreamFailure({ code: 'stream_interrupted' })

    expect(resolved.code).toBe('stream_interrupted')
    expect(resolved.category).toBe('transport')
    expect(resolved.autoRecover).toBe(true)
    expect(resolved.showInterruptedBar).toBe(true)
    expect(resolved.userMessage).toContain('Resume')
  })

  it('does not show the interrupted banner for provider overloads', () => {
    const resolved = resolveChatStreamFailure({ code: 'busy' })

    expect(resolved.code).toBe('busy')
    expect(resolved.category).toBe('model')
    expect(resolved.autoRecover).toBe(false)
    expect(resolved.showInterruptedBar).toBe(false)
  })

  it('does not auto-retry invalid context or model settings', () => {
    const resolved = resolveChatStreamFailure({
      message: 'This model does not support that context window.',
    })

    expect(resolved.code).toBe('model_settings_invalid')
    expect(resolved.category).toBe('request')
    expect(resolved.autoRecover).toBe(false)
    expect(resolved.showInterruptedBar).toBe(false)
  })

  it('shows the Resume fallback for runtime context-window overflow', () => {
    const resolved = resolveChatStreamFailure({
      code: 'context_window_exceeded',
    })

    expect(resolved.code).toBe('context_window_exceeded')
    expect(resolved.category).toBe('model')
    expect(resolved.autoRecover).toBe(false)
    expect(resolved.retryable).toBe(true)
    expect(resolved.showInterruptedBar).toBe(true)
    expect(resolved.userMessage).toContain('context limit')
  })

  it('maps provider billing failures to a non-retryable model error', () => {
    const resolved = resolveChatStreamFailure({
      message:
        "API provider returned a billing error — your API key has an insufficient balance. Check your provider's billing dashboard.",
    })

    expect(resolved.code).toBe('provider_billing')
    expect(resolved.category).toBe('model')
    expect(resolved.retryable).toBe(false)
    expect(resolved.showInterruptedBar).toBe(false)
    expect(resolved.userMessage).toContain('model billing')
  })

  it('maps internal bridge terminations to recoverable stream interruptions', () => {
    const resolved = resolveChatStreamFailure({ message: 'terminated' })

    expect(resolved.code).toBe('stream_interrupted')
    expect(resolved.autoRecover).toBe(true)
    expect(resolved.showInterruptedBar).toBe(true)
  })

  it('maps invalidated integration tokens to a reconnect banner', () => {
    const resolved = resolveChatStreamFailure({
      message: 'Your authentication token has been invalidated. Please try signing in again.',
    })

    expect(resolved.code).toBe('reconnect_required')
    expect(resolved.category).toBe('request')
    expect(resolved.retryable).toBe(false)
    expect(resolved.autoRecover).toBe(false)
    expect(resolved.showInterruptedBar).toBe(true)
    expect(resolved.bannerAction).toBe('reconnect')
    expect(resolved.userMessage).toBe('This integration needs to be reconnected')
  })

  it('maps missing OpenAI Codex subscription auth to the Codex reconnect banner', () => {
    const resolved = resolveChatStreamFailure({ code: 'openai_codex_not_connected' })

    expect(resolved.code).toBe('openai_codex_not_connected')
    expect(resolved.category).toBe('request')
    expect(resolved.retryable).toBe(false)
    expect(resolved.autoRecover).toBe(false)
    expect(resolved.showInterruptedBar).toBe(true)
    expect(resolved.bannerAction).toBe('reconnect')
    expect(resolved.reconnectProvider).toBe('openai_codex')
    expect(resolved.userMessage).toContain('OpenAI Codex')
  })

  it('maps OpenAI Codex subscription gate messages to the reconnect action', () => {
    const resolved = resolveChatStreamFailure({
      message: 'OpenAI Codex subscription is not connected for this admin account',
    })

    expect(resolved.code).toBe('openai_codex_not_connected')
    expect(resolved.category).toBe('request')
    expect(resolved.retryable).toBe(false)
    expect(resolved.showInterruptedBar).toBe(true)
    expect(resolved.bannerAction).toBe('reconnect')
    expect(resolved.reconnectProvider).toBe('openai_codex')
  })

  it('maps Claude subscription gates to a non-retryable request error', () => {
    const resolved = resolveChatStreamFailure({
      code: 'anthropic_claude_not_connected',
    })

    expect(resolved.code).toBe('anthropic_claude_not_connected')
    expect(resolved.category).toBe('request')
    expect(resolved.retryable).toBe(false)
    expect(resolved.showInterruptedBar).toBe(false)
    expect(resolved.userMessage).toContain('Claude Subscription')
  })

  it('does not label generic service unavailability as model busy', () => {
    const resolved = resolveChatStreamFailure({ message: 'Service unavailable' })

    expect(resolved.code).toBe('temporary_unavailable')
    expect(resolved.category).toBe('runtime')
    expect(resolved.userMessage).not.toContain('model is busy')
  })
})

describe('resolveChatStreamErrorToast', () => {
  it('maps image_too_large code to a clear user message', () => {
    const resolved = resolveChatStreamErrorToast({ code: 'image_too_large' })
    expect(resolved.code).toBe('image_too_large')
    expect(resolved.userMessage).toContain('15 MB')
  })

  it('classifies raw backend image errors by message', () => {
    const resolved = resolveChatStreamErrorToast({
      message: 'Image too large for floor-plan.jpg',
    })
    expect(resolved.code).toBe('image_too_large')
  })

  it('prefers explicit codes over message text', () => {
    const resolved = resolveChatStreamErrorToast({
      code: 'model_no_images',
      message: 'Image too large for floor-plan.jpg',
    })
    expect(resolved.code).toBe('model_no_images')
  })

  it('maps proxy machine warmup SSE codes to the event message', () => {
    const resolved = resolveChatStreamErrorToast({
      code: 'MACHINE_CHAT_UNAVAILABLE',
      message: "I couldn't get your agent ready yet. Give it another shot in a moment.",
    })
    expect(resolved.code).toBe('temporary_unavailable')
    expect(resolved.userMessage).toBe(
      "I couldn't get your agent ready yet. Give it another shot in a moment.",
    )
  })
})

describe('toastMessageForChatSendError', () => {
  it('returns ChatStreamUserError message', () => {
    const err = new ChatStreamUserError('That image is too large.', 'image_too_large')
    expect(toastMessageForChatSendError(err)).toBe('That image is too large.')
  })
})
