import { describe, expect, it } from 'vitest'
import {
  ChatStreamRecoveryService,
  CONTEXT_WINDOW_CONTINUE_CONTENT,
} from './chat-stream-recovery.service'

describe('ChatStreamRecoveryService context-window resume', () => {
  const service = new ChatStreamRecoveryService()

  it('classifies context overflow as context_window_exceeded', () => {
    expect(
      service.classifyAgentStreamFailure('context_window_exceeded: input is too long').code,
    ).toBe('context_window_exceeded')
  })

  it('requires compact+continue after context window failures', () => {
    expect(service.shouldContinueAfterContextWindow('context_window_exceeded')).toBe(true)
    expect(service.shouldContinueAfterContextWindow('stream_interrupted')).toBe(false)
    expect(service.buildContextWindowContinueContent()).toBe(CONTEXT_WINDOW_CONTINUE_CONTENT)
  })
})
