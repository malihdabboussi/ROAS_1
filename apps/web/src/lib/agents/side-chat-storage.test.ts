import { beforeEach, describe, expect, it } from 'vitest'
import {
  persistAtlasChatCollapsed,
  persistAtlasChatWidth,
  persistLoopChatCollapsed,
  persistLoopChatWidth,
  persistLoopConversationId,
  persistTeamHrChatCollapsed,
  persistTeamHrChatWidth,
  readStoredAtlasChatCollapsed,
  readStoredAtlasChatWidth,
  readStoredLoopChatCollapsed,
  readStoredLoopChatWidth,
  readStoredLoopConversationId,
  readStoredTeamHrChatCollapsed,
  readStoredTeamHrChatWidth,
} from './side-chat-storage'

describe('side-chat-storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists layout state separately for HR, Atlas, and Loop side chats', () => {
    persistTeamHrChatWidth(34)
    persistTeamHrChatCollapsed(true)
    persistAtlasChatWidth(41)
    persistAtlasChatCollapsed(false)
    persistLoopChatWidth(46)
    persistLoopChatCollapsed(true)

    expect(readStoredTeamHrChatWidth()).toBe(34)
    expect(readStoredTeamHrChatCollapsed()).toBe(true)
    expect(readStoredAtlasChatWidth()).toBe(41)
    expect(readStoredAtlasChatCollapsed()).toBe(false)
    expect(readStoredLoopChatWidth()).toBe(46)
    expect(readStoredLoopChatCollapsed()).toBe(true)
  })

  it('keeps Loop conversation ids scoped by space', () => {
    persistLoopConversationId('space-1', 'conversation-a')
    persistLoopConversationId('space-2', 'conversation-b')
    persistLoopConversationId('', 'ignored')

    expect(readStoredLoopConversationId('space-1')).toBe('conversation-a')
    expect(readStoredLoopConversationId('space-2')).toBe('conversation-b')
    expect(readStoredLoopConversationId('')).toBeNull()
  })

  it('falls back safely when persisted storage is invalid', () => {
    window.localStorage.setItem('vibey.flows.loopSideChat', '{not-json')

    expect(readStoredLoopChatWidth()).toBeNull()
    expect(readStoredLoopChatCollapsed()).toBe(false)
  })
})
