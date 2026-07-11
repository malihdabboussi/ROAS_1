import { describe, expect, it } from 'vitest'
import {
  ChatStreamUserError,
  resolveChatStreamErrorToast,
  resolveChatStreamFailure,
  toastMessageForChatSendError,
} from './chat-stream-errors.config'

describe('shared chat stream error config', () => {
  it('marks stream interruptions for resume recovery', () => {
    const resolved = resolveChatStreamFailure({ code: 'stream_interrupted' })

    expect(resolved.code).toBe('stream_interrupted')
    expect(resolved.category).toBe('transport')
    expect(resolved.autoRecover).toBe(true)
    expect(resolved.showInterruptedBar).toBe(true)
  })

  it('classifies raw backend image errors by message', () => {
    const resolved = resolveChatStreamErrorToast({
      message: 'Image too large for floor-plan.jpg',
    })

    expect(resolved.code).toBe('image_too_large')
    expect(resolved.userMessage).toContain('15 MB')
  })

  it('returns ChatStreamUserError message for send toasts', () => {
    const err = new ChatStreamUserError('That image is too large.', 'image_too_large')

    expect(toastMessageForChatSendError(err)).toBe('That image is too large.')
  })

  it('classifies invalidated integration tokens as reconnect required', () => {
    const resolved = resolveChatStreamFailure({
      message: 'Your authentication token has been invalidated. Please try signing in again.',
    })

    expect(resolved.code).toBe('reconnect_required')
    expect(resolved.showInterruptedBar).toBe(true)
    expect(resolved.bannerAction).toBe('reconnect')
    expect(resolved.userMessage).toBe('This integration needs to be reconnected')
  })

  it('classifies missing OpenAI Codex subscription auth as a Codex reconnect', () => {
    const resolved = resolveChatStreamFailure({ code: 'openai_codex_not_connected' })

    expect(resolved.code).toBe('openai_codex_not_connected')
    expect(resolved.showInterruptedBar).toBe(true)
    expect(resolved.bannerAction).toBe('reconnect')
    expect(resolved.reconnectProvider).toBe('openai_codex')
    expect(resolved.userMessage).toContain('OpenAI Codex')
  })

  it('shows runtime-unavailable copy for generic service unavailability', () => {
    const resolved = resolveChatStreamFailure({ message: 'Service unavailable' })

    expect(resolved.code).toBe('temporary_unavailable')
    expect(resolved.userMessage).not.toContain('model is busy')
  })

  it('keeps provider billing ahead of generic gateway wording', () => {
    const resolved = resolveChatStreamFailure({
      message:
        'provider_billing: Gateway connection error: agent gateway 402: insufficient balance',
    })

    expect(resolved.code).toBe('provider_billing')
    expect(resolved.userMessage).toContain('provider')
  })

  it('keeps provider busy ahead of generic gateway wording', () => {
    const resolved = resolveChatStreamFailure({
      message: 'busy: Gateway connection error: agent gateway 429: rate limit exceeded',
    })

    expect(resolved.code).toBe('busy')
    expect(resolved.userMessage).toContain('model is busy')
  })

  it('keeps explicit provider overloads as model-busy failures', () => {
    const resolved = resolveChatStreamFailure({
      message: 'Provider temporarily overloaded. Please try again later.',
    })

    expect(resolved.code).toBe('busy')
    expect(resolved.userMessage).toContain('model is busy')
  })
})
