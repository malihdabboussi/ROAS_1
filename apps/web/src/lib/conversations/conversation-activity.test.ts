import { describe, expect, it } from 'vitest'
import { resolveConversationActivity } from './conversation-activity'

describe('resolveConversationActivity', () => {
  it('uses action, working, unread, then idle priority', () => {
    expect(
      resolveConversationActivity({ needsAction: true, isRunning: true, isUnread: true }),
    ).toBe('needs_action')
    expect(resolveConversationActivity({ isRunning: true, isUnread: true })).toBe('working')
    expect(resolveConversationActivity({ isUnread: true })).toBe('unread')
    expect(resolveConversationActivity({})).toBe('idle')
  })

  it('keeps archived conversations idle', () => {
    expect(
      resolveConversationActivity({
        status: 'archived',
        needsAction: true,
        isRunning: true,
        isUnread: true,
      }),
    ).toBe('idle')
  })
})
