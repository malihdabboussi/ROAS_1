import { describe, expect, it } from 'vitest'
import { conversationHasIdentityIcon, resolveConversationActivity } from './conversation-activity'

describe('resolveConversationActivity', () => {
  it('uses action, working, unread, then idle priority', () => {
    expect(
      resolveConversationActivity({ needsAction: true, isRunning: true, isUnread: true }),
    ).toBe('needs_action')
    expect(resolveConversationActivity({ isRunning: true, isUnread: true })).toBe('working')
    expect(resolveConversationActivity({ isUnread: true })).toBe('unread')
    expect(resolveConversationActivity({})).toBe('idle')
  })

  it('treats Slack, Telegram, MCP, and meeting threads as identity-icon rows', () => {
    expect(conversationHasIdentityIcon({ metadata: { source: 'slack' } })).toBe(true)
    expect(conversationHasIdentityIcon({ metadata: { source: 'telegram' } })).toBe(true)
    expect(conversationHasIdentityIcon({ metadata: { source: 'mcp' } })).toBe(true)
    expect(
      conversationHasIdentityIcon({ metadata: { context_type: 'meeting', meeting_item_id: 'm1' } }),
    ).toBe(true)
    expect(conversationHasIdentityIcon({ metadata: {} })).toBe(false)
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
