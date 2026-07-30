import { afterEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { useChatStore } from '../store/use-chat-store'
import { isStreamActive, recoverConversation, recoverStalledConversation } from './chat.service'
import { handleStreamStalls, STREAM_STALL_TIMEOUT_MS } from './stream-resilience'

vi.mock('@/lib/utils/org-storage', () => ({
  getActiveOrgIdFromStorage: () => null,
  getOrgScopedKey: (_scope: string, key: string) => key,
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

vi.mock('./chat.service', () => ({
  isStreamActive: vi.fn(),
  recoverConversation: vi.fn(),
  recoverStalledConversation: vi.fn(),
  shouldSkipStreamRecovery: vi.fn().mockReturnValue(false),
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

  it('reconciles a completed run when only SSE heartbeats continue', async () => {
    const now = Date.now()
    vi.mocked(isStreamActive).mockReturnValue(true)
    vi.mocked(backendGet).mockResolvedValue({
      active: false,
      messageId: 'assistant-1',
      runId: 'run-1',
    } as never)
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

    await vi.waitFor(() => {
      expect(backendGet).toHaveBeenCalledWith('/api/chat/status/conversation-1')
      expect(recoverStalledConversation).toHaveBeenCalledWith('conversation-1')
    })
  })

  it('keeps a heartbeat-backed stream open while its durable run is still active', async () => {
    const now = Date.now()
    vi.mocked(isStreamActive).mockReturnValue(true)
    vi.mocked(backendGet).mockResolvedValue({
      active: true,
      messageId: 'assistant-1',
      runId: 'run-1',
      lastEventAt: new Date(now).toISOString(),
    } as never)
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

    await vi.waitFor(() => {
      expect(backendGet).toHaveBeenCalledWith('/api/chat/status/conversation-1')
    })
    expect(recoverStalledConversation).not.toHaveBeenCalled()
  })

  it('recovers a heartbeat-backed run whose durable agent progress is stale', async () => {
    const now = Date.now()
    vi.mocked(isStreamActive).mockReturnValue(true)
    vi.mocked(backendGet).mockResolvedValue({
      active: true,
      messageId: 'assistant-1',
      runId: 'run-1',
      lastEventAt: new Date(now - STREAM_STALL_TIMEOUT_MS - 1).toISOString(),
    } as never)
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

    await vi.waitFor(() => {
      expect(recoverStalledConversation).toHaveBeenCalledWith('conversation-1')
    })
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
