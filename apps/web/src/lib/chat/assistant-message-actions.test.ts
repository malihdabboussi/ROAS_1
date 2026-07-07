import { describe, expect, it } from 'vitest'
import {
  resolvePinnedAssistantMessageId,
  shouldPinAssistantActions,
} from './assistant-message-actions'

describe('assistant-message-actions', () => {
  it('pins the last assistant message while it remains the final message', () => {
    const messages = [
      { id: 'u1', role: 'user' },
      { id: 'a1', role: 'assistant' },
    ]

    expect(resolvePinnedAssistantMessageId(messages)).toBe('a1')
    expect(shouldPinAssistantActions('a1', messages)).toBe(true)
    expect(shouldPinAssistantActions('u1', messages)).toBe(false)
  })

  it('unpins when the user sends another message', () => {
    const messages = [
      { id: 'u1', role: 'user' },
      { id: 'a1', role: 'assistant' },
      { id: 'u2', role: 'user' },
    ]

    expect(resolvePinnedAssistantMessageId(messages)).toBeNull()
    expect(shouldPinAssistantActions('a1', messages)).toBe(false)
  })
})
