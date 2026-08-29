import { describe, expect, it } from 'vitest'
import { isFullHomeConversation } from './shell-chat-header-page'

describe('shell-chat-header-page', () => {
  it('treats /home?conv= as a full-page conversation', () => {
    expect(isFullHomeConversation('/home', 'conversation-1')).toBe(true)
    expect(isFullHomeConversation('/home', null)).toBe(false)
    expect(isFullHomeConversation('/home/meetings', 'conversation-1')).toBe(false)
  })
})
