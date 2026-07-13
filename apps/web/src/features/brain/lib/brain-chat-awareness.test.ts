import { describe, expect, it } from 'vitest'
import { buildBrainChatAwarenessContext } from './brain-chat-awareness'

describe('buildBrainChatAwarenessContext', () => {
  it('includes scope label, brain id, and graph stats', () => {
    const text = buildBrainChatAwarenessContext({
      scopeLabel: 'test',
      brainId: 'brain-1',
      totalMemories: 1726,
      totalConnections: 1717,
    })
    expect(text).toContain('Active Brain scope: test')
    expect(text).toContain('brain_id: brain-1')
    expect(text).toContain('1726 memories and 1717 connections')
    expect(text).toContain('search_user_brain')
  })
})
