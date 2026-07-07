import { describe, expect, it, vi } from 'vitest'
import {
  dispatchLoopChatConversationChanged,
  dispatchLoopChatOpenPanel,
  dispatchLoopChatSelectConversation,
  dispatchLoopChatActivateConversation,
  LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT,
  LOOP_CHAT_CONVERSATION_EVENT,
  LOOP_CHAT_OPEN_PANEL_EVENT,
  LOOP_CHAT_SELECT_CONVERSATION_EVENT,
  type LoopChatConversationDetail,
  type LoopChatSelectConversationDetail,
} from './loop-chat-conversation'

describe('loop chat conversation browser event contract', () => {
  it('dispatches conversation changes with the selected space and conversation', () => {
    const listener = vi.fn()
    window.addEventListener(LOOP_CHAT_CONVERSATION_EVENT, listener)

    try {
      dispatchLoopChatConversationChanged({
        spaceId: 'space-1',
        conversationId: 'conversation-1',
      })

      expect(listener).toHaveBeenCalledTimes(1)
      const detail = (listener.mock.calls[0]?.[0] as CustomEvent<LoopChatConversationDetail>)
        .detail
      expect(detail).toEqual({ spaceId: 'space-1', conversationId: 'conversation-1' })
    } finally {
      window.removeEventListener(LOOP_CHAT_CONVERSATION_EVENT, listener)
    }
  })

  it('dispatches requests to select a Loop conversation for a space', () => {
    const listener = vi.fn()
    window.addEventListener(LOOP_CHAT_SELECT_CONVERSATION_EVENT, listener)

    try {
      dispatchLoopChatSelectConversation({
        spaceId: 'space-1',
        conversationId: 'conversation-2',
      })

      expect(listener).toHaveBeenCalledTimes(1)
      const detail = (listener.mock.calls[0]?.[0] as CustomEvent<LoopChatSelectConversationDetail>)
        .detail
      expect(detail).toEqual({ spaceId: 'space-1', conversationId: 'conversation-2' })
    } finally {
      window.removeEventListener(LOOP_CHAT_SELECT_CONVERSATION_EVENT, listener)
    }
  })

  it('dispatches requests to expand the Loop chat panel', () => {
    const listener = vi.fn()
    window.addEventListener(LOOP_CHAT_OPEN_PANEL_EVENT, listener)

    try {
      dispatchLoopChatOpenPanel()
      expect(listener).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener(LOOP_CHAT_OPEN_PANEL_EVENT, listener)
    }
  })

  it('dispatches activate conversation with full conversation payload', () => {
    const listener = vi.fn()
    window.addEventListener(LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT, listener)

    try {
      dispatchLoopChatActivateConversation({
        spaceId: 'space-1',
        conversation: {
          id: 'conversation-new',
          user_id: 'user-1',
          campaign_id: null,
          title: 'Untitled flow draft',
          agent_id: 'loop',
          status: 'active',
          metadata: {},
          created_at: '2026-06-30T00:00:00.000Z',
          updated_at: '2026-06-30T00:00:00.000Z',
        },
      })

      expect(listener).toHaveBeenCalledTimes(1)
      const detail = (
        listener.mock.calls[0]?.[0] as CustomEvent<{ conversation: { id: string } }>
      ).detail
      expect(detail.conversation.id).toBe('conversation-new')
    } finally {
      window.removeEventListener(LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT, listener)
    }
  })
})
