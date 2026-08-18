import { describe, expect, it } from 'vitest'
import { isSlackDirectConversation } from './slack-service.shared'

describe('isSlackDirectConversation', () => {
  it('treats 1:1 DMs and group DMs as direct conversations', () => {
    expect(isSlackDirectConversation('im', 'D123')).toBe(true)
    expect(isSlackDirectConversation('mpim', 'G123')).toBe(true)
    expect(isSlackDirectConversation(undefined, 'D123')).toBe(true)
  })

  it('does not treat channels as direct conversations', () => {
    expect(isSlackDirectConversation('channel', 'C123')).toBe(false)
    expect(isSlackDirectConversation('group', 'G123')).toBe(false)
  })
})
