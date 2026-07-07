import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Conversation, Message } from '@/features/studio/types'

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      messagesByConversation: {},
      isLoadingMessages: false,
      streamingMessageId: null,
      streamingMessageIdsByConversation: {},
      streamingConversationIds: [],
      isStreaming: false,
      isSidebarOpen: true,
      artifactEvents: [],
      agentPhase: 'idle',
      activeTool: null,
      statusMessages: [],
      flowTimeline: [],
      imageGeneratedEvents: [],
      wantsNewConversation: false,
      creditBalance: null,
      creditsLow: false,
      creditsLowRemaining: 0,
      creditsExhausted: false,
    })
  })

  const mockConv: Conversation = {
    id: 'conv-1',
    user_id: 'user-1',
    campaign_id: null,
    title: 'Test',
    agent_id: null,
    status: 'active',
    metadata: {},
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  }

  const mockMsg: Message = {
    id: 'msg-1',
    conversation_id: 'conv-1',
    role: 'user',
    content: 'Hello',
    content_blocks: null,
    metadata: {},
    created_at: '2026-02-10T00:00:00Z',
  }

  it('adds and updates conversations', () => {
    const { result } = renderHook(() => useChatStore())
    act(() => result.current.addConversation(mockConv))
    expect(result.current.conversations).toHaveLength(1)

    act(() => result.current.updateConversation('conv-1', { title: 'Updated' }))
    expect(result.current.conversations[0]?.title).toBe('Updated')
  })

  it('sets active conversation', () => {
    const { result } = renderHook(() => useChatStore())
    act(() => result.current.setActiveConversationId('conv-1'))
    expect(result.current.activeConversationId).toBe('conv-1')
  })

  it('adds messages and prevents duplicates', () => {
    const { result } = renderHook(() => useChatStore())
    act(() => {
      result.current.addMessage('conv-1', mockMsg)
      result.current.addMessage('conv-1', mockMsg)
    })
    expect(result.current.messagesByConversation['conv-1']).toHaveLength(1)
  })

  it('appends content to streaming message', () => {
    const { result } = renderHook(() => useChatStore())
    act(() => {
      result.current.addMessage('conv-1', { ...mockMsg, role: 'assistant', content: 'Hi' })
      result.current.appendToMessage('conv-1', 'msg-1', ' there')
    })
    expect(result.current.messagesByConversation['conv-1']?.[0]?.content).toBe('Hi there')
  })

  it('manages streaming state', () => {
    const { result } = renderHook(() => useChatStore())
    act(() => {
      result.current.setIsStreaming(true)
      result.current.setStreamingMessageId('msg-1')
    })
    expect(result.current.isStreaming).toBe(true)
    expect(result.current.streamingMessageId).toBe('msg-1')
  })

  it('toggles sidebar', () => {
    const { result } = renderHook(() => useChatStore())
    expect(result.current.isSidebarOpen).toBe(true)
    act(() => result.current.toggleSidebar())
    expect(result.current.isSidebarOpen).toBe(false)
  })
})
