import { afterEach, describe, expect, it, vi } from 'vitest'
import { showConversationMessageInChat } from './shell-chat-message-navigation'

afterEach(() => {
  document.body.replaceChildren()
})

describe('showConversationMessageInChat', () => {
  it('scrolls the exact source message into the middle of chat', () => {
    const row = document.createElement('div')
    row.dataset.messageId = 'assistant-1'
    row.scrollIntoView = vi.fn()
    document.body.appendChild(row)

    expect(showConversationMessageInChat('assistant-1')).toBe(true)
    expect(row.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('returns false when the source message is not mounted', () => {
    expect(showConversationMessageInChat('missing-message')).toBe(false)
  })
})
