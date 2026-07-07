import { describe, expect, it } from 'vitest'
import { deriveConversationChannel } from '../conversation-channel'

describe('deriveConversationChannel', () => {
  it('classifies public widget conversations', () => {
    expect(deriveConversationChannel({ public: true, visitor_id: 'v1' })).toBe('widget')
  })

  it('classifies telegram conversations by chat id', () => {
    expect(deriveConversationChannel({ telegram_chat_id: '555' })).toBe('telegram')
  })

  it('classifies telegram conversations by source marker', () => {
    expect(deriveConversationChannel({ source: 'telegram' })).toBe('telegram')
  })

  it('falls back to app for everything else', () => {
    expect(deriveConversationChannel({})).toBe('app')
    expect(deriveConversationChannel(null)).toBe('app')
    expect(deriveConversationChannel(undefined)).toBe('app')
    expect(deriveConversationChannel('not-an-object')).toBe('app')
    expect(deriveConversationChannel({ some: 'meta' })).toBe('app')
  })
})
