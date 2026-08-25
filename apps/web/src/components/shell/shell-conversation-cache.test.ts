import { describe, expect, it } from 'vitest'
import { conversationCacheKey } from './shell-conversation-cache'

describe('conversationCacheKey', () => {
  it('isolates Simple all-scope history from scoped agent and organization caches', () => {
    expect(conversationCacheKey(true, null, 'org-1')).toBe(
      'shell-conversations:all-scopes:all:client:all',
    )
    expect(conversationCacheKey(false, 'reed', 'org-1')).toBe(
      'shell-conversations:org-1:reed:client:all',
    )
    expect(conversationCacheKey(false, 'reed', null)).toBe(
      'shell-conversations:personal:reed:client:all',
    )
    expect(conversationCacheKey(true, null, 'org-1', 'client-1')).toBe(
      'shell-conversations:all-scopes:all:client:client-1',
    )
  })
})
