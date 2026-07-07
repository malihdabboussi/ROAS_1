import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '../store/use-chat-store'
import { isStreamActive, recoverConversation, recoverStalledConversation } from './chat.service'
import { handleStreamStalls, STREAM_STALL_TIMEOUT_MS } from './stream-resilience'

vi.mock('@/lib/utils/org-storage', () => ({
  getActiveOrgIdFromStorage: () => null,
  getOrgScopedKey: (_scope: string, key: string) => key,
}))

vi.mock('./chat.service', () => ({
  isStreamActive: vi.fn(),
  recoverConversation: vi.fn(),
  recoverStalledConversation: vi.fn(),
}))

describe('stream stall resilience', () => {
  afterEach(() => {
    vi.clearAllMocks()
    useChatStore.setState({
      streamingConversationIds: [],
      reconnectingConversationIds: [],
      lastAgentEventAtByConversation: {},
      lastStreamActivityAtByConversation: {},
    })
  })

  it('recovers an active stream after the stream activity timeout', () => {
    const now = Date.now()
    vi.mocked(isStreamActive).mockReturnValue(true)
    useChatStore.setState({
      streamingConversationIds: ['conversation-1'],
      reconnectingConversationIds: [],
      lastStreamActivityAtByConversation: {
        'conversation-1': now - STREAM_STALL_TIMEOUT_MS - 1,
      },
    })

    handleStreamStalls(now)

    expect(recoverStalledConversation).toHaveBeenCalledWith('conversation-1')
  })

  it('recovers an active stream after the agent event timeout even when bytes continue', () => {
    const now = Date.now()
    vi.mocked(isStreamActive).mockReturnValue(true)
    useChatStore.setState({
      streamingConversationIds: ['conversation-1'],
      reconnectingConversationIds: [],
      lastAgentEventAtByConversation: {
        'conversation-1': now - STREAM_STALL_TIMEOUT_MS - 1,
      },
      lastStreamActivityAtByConversation: {
        'conversation-1': now,
      },
    })

    handleStreamStalls(now)

    expect(recoverStalledConversation).toHaveBeenCalledWith('conversation-1')
  })

  it('recovers a streaming conversation when the local stream is gone', () => {
    const now = Date.now()
    vi.mocked(isStreamActive).mockReturnValue(false)
    useChatStore.setState({
      streamingConversationIds: ['conversation-1'],
      reconnectingConversationIds: [],
      lastStreamActivityAtByConversation: {
        'conversation-1': now,
      },
    })

    handleStreamStalls(now)

    expect(recoverConversation).toHaveBeenCalledWith('conversation-1')
    expect(recoverStalledConversation).not.toHaveBeenCalled()
  })

  it('does not recover before the stream byte activity timeout', () => {
    const now = Date.now()
    vi.mocked(isStreamActive).mockReturnValue(true)
    useChatStore.setState({
      streamingConversationIds: ['conversation-1'],
      reconnectingConversationIds: [],
      lastStreamActivityAtByConversation: {
        'conversation-1': now - STREAM_STALL_TIMEOUT_MS + 1,
      },
    })

    handleStreamStalls(now)

    expect(recoverStalledConversation).not.toHaveBeenCalled()
  })

  it('does not recover a conversation that is already reconnecting', () => {
    const now = Date.now()
    vi.mocked(isStreamActive).mockReturnValue(true)
    useChatStore.setState({
      streamingConversationIds: ['conversation-1'],
      reconnectingConversationIds: ['conversation-1'],
      lastStreamActivityAtByConversation: {
        'conversation-1': now - STREAM_STALL_TIMEOUT_MS - 1,
      },
    })

    handleStreamStalls(now)

    expect(recoverStalledConversation).not.toHaveBeenCalled()
  })
})
