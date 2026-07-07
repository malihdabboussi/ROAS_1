import { beforeEach, describe, expect, it } from 'vitest'
import { getChatCreditsExhausted, setChatCreditsExhausted } from '@/lib/chat/chat-credit-state'
import type { Conversation, Message, MessageContentBlock } from '../types'
import { useChatStore } from './use-chat-store'

function conversation(id: string): Conversation {
  return {
    id,
    user_id: 'user-1',
    campaign_id: null,
    title: id,
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    created_at: '2026-05-10T00:00:00.000Z',
    updated_at: '2026-05-10T00:00:00.000Z',
    effective_level: 'admin',
  }
}

function message(conversationId: string): Message {
  return {
    id: `message-${conversationId}`,
    conversation_id: conversationId,
    role: 'user',
    content: 'hello',
    content_blocks: null,
    metadata: {},
    created_at: '2026-05-10T00:00:00.000Z',
  }
}

describe('useChatStore conversation visibility', () => {
  beforeEach(() => {
    localStorage.clear()
    setChatCreditsExhausted(false)
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      messagesByConversation: {},
      unreadConversationIds: [],
      contextUsageByConversation: {},
      creditsExhausted: false,
    })
  })

  it('prunes stale conversations and messages that are not in the authorized list', () => {
    useChatStore.setState({
      conversations: [conversation('stale-conversation')],
      activeConversationId: 'stale-conversation',
      messagesByConversation: {
        'stale-conversation': [message('stale-conversation')],
      },
      unreadConversationIds: ['stale-conversation'],
    })

    useChatStore.getState().setConversations([conversation('visible-conversation')])

    const state = useChatStore.getState()
    expect(state.conversations.map((c) => c.id)).toEqual(['visible-conversation'])
    expect(state.activeConversationId).toBeNull()
    expect(state.messagesByConversation['stale-conversation']).toBeUndefined()
    expect(state.unreadConversationIds).toEqual([])
  })

  it('keeps pending optimistic conversations while refreshing from the authorized list', () => {
    useChatStore.setState({
      activeConversationId: 'pending-123',
      messagesByConversation: {
        'pending-123': [message('pending-123')],
      },
    })

    useChatStore.getState().setConversations([conversation('visible-conversation')])

    const state = useChatStore.getState()
    expect(state.activeConversationId).toBe('pending-123')
    expect(state.messagesByConversation['pending-123']).toHaveLength(1)
  })

  it('keeps shared chat credit exhaustion updates visible through the Studio chat store', () => {
    setChatCreditsExhausted(true)
    expect(useChatStore.getState().creditsExhausted).toBe(true)

    setChatCreditsExhausted(false)
    expect(useChatStore.getState().creditsExhausted).toBe(false)
  })

  it('publishes Studio chat store credit exhaustion updates back to shared state', () => {
    useChatStore.getState().setCreditsExhausted(true)
    expect(getChatCreditsExhausted()).toBe(true)

    useChatStore.getState().setCreditsExhausted(false)
    expect(getChatCreditsExhausted()).toBe(false)
  })

  it('keeps separate thinking transcripts across stream update groups', () => {
    const conversationId = 'conversation-1'
    const messageId = 'assistant-1'
    const assistantMessage: Message = {
      ...message(conversationId),
      id: messageId,
      role: 'assistant',
      content: '',
    }

    useChatStore.getState().setMessages(conversationId, [assistantMessage])
    useChatStore
      .getState()
      .upsertThinkingTranscriptInOrderedBlocks(conversationId, messageId, 'Thought one')
    useChatStore.getState().completeThinkingTranscriptInOrderedBlocks(conversationId, messageId)
    useChatStore
      .getState()
      .appendTextToOrderedBlocks(conversationId, messageId, 'First update')
    useChatStore
      .getState()
      .upsertThinkingTranscriptInOrderedBlocks(conversationId, messageId, 'Thought two')
    useChatStore.getState().completeThinkingTranscriptInOrderedBlocks(conversationId, messageId)

    const blocks = useChatStore.getState().messagesByConversation[conversationId]?.[0]?.metadata
      ?.content_blocks_ordered as MessageContentBlock[]

    expect(blocks.map((block) => block.type)).toEqual([
      'thinking_transcript',
      'text',
      'thinking_transcript',
    ])
    expect(blocks[0]).toMatchObject({
      type: 'thinking_transcript',
      content: 'Thought one',
      state: 'complete',
    })
    expect(blocks[1]).toMatchObject({ type: 'text', content: 'First update' })
    expect(blocks[2]).toMatchObject({
      type: 'thinking_transcript',
      content: 'Thought two',
      state: 'complete',
    })
    expect(blocks[0]?.id).not.toBe(blocks[2]?.id)
  })
})
