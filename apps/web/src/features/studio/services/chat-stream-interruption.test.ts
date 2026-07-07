import { afterEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import { useChatStore } from '../store/use-chat-store'
import {
  abortRecovery,
  abortStream,
  applyRecoveredTimelineEvents,
  isRealAgentStreamEvent,
  recoverConversation,
  requestStopStream,
  shouldMarkConversationInterruptedForStreamError,
} from './chat.service'

vi.mock('@/lib/utils/org-storage', () => ({
  getActiveOrgIdFromStorage: () => null,
  getOrgScopedKey: (_scope: string, key: string) => key,
}))

vi.mock('@/lib/utils/text', () => ({
  stripEmoji: (value: string) => value,
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendFetch: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('./campaign.service', () => ({
  ensureGeneralCampaign: vi.fn(async () => ({ id: 'general-campaign' })),
}))

describe('chat stream interruption classification', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    useChatStore.setState({
      messagesByConversation: {},
      streamRunsByConversation: {},
      streamingConversationIds: [],
      reconnectingConversationIds: [],
      interruptedConversationIds: [],
      streamFailureByConversation: {},
      conversationStreamUI: {},
    })
  })

  it('does not mark warm-up-only failures as interrupted conversations', () => {
    expect(shouldMarkConversationInterruptedForStreamError(false)).toBe(false)
  })

  it('keeps interrupted recovery available after real agent work starts', () => {
    expect(shouldMarkConversationInterruptedForStreamError(true)).toBe(true)
  })

  it('treats machine warm-up status as pre-agent progress', () => {
    expect(isRealAgentStreamEvent('status')).toBe(false)
    expect(isRealAgentStreamEvent('message_start')).toBe(true)
    expect(isRealAgentStreamEvent('tool_start')).toBe(true)
    expect(isRealAgentStreamEvent('content_delta')).toBe(true)
  })

  it('applies recovered timeline events once per message sequence', () => {
    useChatStore.getState().setMessages('conversation-1', [
      {
        id: 'message-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: '',
        content_blocks: null,
        metadata: {},
        created_at: '2026-05-28T13:00:00.000Z',
      },
    ])

    const event = {
      id: 'event-1',
      seq: 1,
      type: 'tool_start',
      payload: {
        name: 'ask_agent',
        label: 'Asking Ivy',
        tool_call_id: 'tool-1',
      },
      created_at: '2026-05-28T13:00:01.000Z',
    }

    applyRecoveredTimelineEvents('conversation-1', 'message-1', [event])
    applyRecoveredTimelineEvents('conversation-1', 'message-1', [event])

    const [message] = useChatStore.getState().messagesByConversation['conversation-1'] ?? []
    const blocks =
      (message?.metadata.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.type).toBe('tool')
    expect(blocks[0]?.toolCallId).toBe('tool-1')
  })

  it('deduplicates repeated live tool starts by tool call id', () => {
    useChatStore.getState().setMessages('conversation-1', [
      {
        id: 'message-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: '',
        content_blocks: null,
        metadata: {},
        created_at: '2026-05-28T13:00:00.000Z',
      },
    ])

    const store = useChatStore.getState()
    store.pushToolToOrderedBlocks('conversation-1', 'message-1', {
      name: 'campaign_capability',
      label: 'Creating your Cyprus house image',
      action: 'generate_image',
      toolCallId: 'tool-1',
      state: 'active',
      startedAt: 1,
    })
    store.pushToolToOrderedBlocks('conversation-1', 'message-1', {
      name: 'campaign_capability',
      label: 'Creating your Cyprus house image',
      action: 'generate_image',
      toolCallId: 'tool-1',
      state: 'active',
      startedAt: 2,
    })

    const [message] = useChatStore.getState().messagesByConversation['conversation-1'] ?? []
    const blocks =
      (message?.metadata.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      type: 'tool',
      name: 'campaign_capability',
      action: 'generate_image',
      toolCallId: 'tool-1',
    })
  })

  it('deduplicates repeated active tool starts without ids when the label and action match', () => {
    useChatStore.getState().setMessages('conversation-1', [
      {
        id: 'message-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: '',
        content_blocks: null,
        metadata: {},
        created_at: '2026-05-28T13:00:00.000Z',
      },
    ])

    const store = useChatStore.getState()
    store.pushToolToOrderedBlocks('conversation-1', 'message-1', {
      name: 'campaign_capability',
      label: 'Creating your Cyprus house image',
      action: 'generate_image',
      state: 'active',
      startedAt: 1,
    })
    store.pushToolToOrderedBlocks('conversation-1', 'message-1', {
      name: 'campaign_capability',
      label: 'Creating your Cyprus house image',
      action: 'generate_image',
      state: 'active',
      startedAt: 2,
    })

    const [message] = useChatStore.getState().messagesByConversation['conversation-1'] ?? []
    const blocks =
      (message?.metadata.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
    expect(blocks).toHaveLength(1)
  })

  it('tracks stream run cursors by conversation', () => {
    const store = useChatStore.getState()

    store.setConversationStreamRun('conversation-1', {
      runId: 'run-1',
      messageId: 'message-1',
      cursor: '1-0',
    })
    store.updateConversationStreamCursor('conversation-1', '2-0', 'run-1')

    expect(useChatStore.getState().streamRunsByConversation['conversation-1']).toMatchObject({
      runId: 'run-1',
      messageId: 'message-1',
      cursor: '2-0',
    })

    store.clearConversationStreamRun('conversation-1')
    expect(useChatStore.getState().streamRunsByConversation['conversation-1']).toBeUndefined()
  })

  it('can abort a stale local stream without clearing the resumable run cursor', () => {
    const store = useChatStore.getState()
    store.setConversationStreamRun('conversation-1', {
      runId: 'run-1',
      messageId: 'message-1',
      cursor: '2-0',
    })

    abortStream('conversation-1', { preserveRun: true })

    expect(useChatStore.getState().streamRunsByConversation['conversation-1']).toMatchObject({
      runId: 'run-1',
      messageId: 'message-1',
      cursor: '2-0',
    })
  })

  it('targets stop requests to the active run before clearing local stream state', async () => {
    const store = useChatStore.getState()
    store.setConversationStreamRun('conversation-1', {
      runId: 'run-1',
      messageId: 'message-1',
      cursor: '2-0',
    })
    vi.mocked(backendPost).mockResolvedValueOnce({ stopped: true } as never)

    await requestStopStream('conversation-1')

    expect(backendPost).toHaveBeenCalledWith('/api/chat/stop', {
      conversation_id: 'conversation-1',
      run_id: 'run-1',
    })
    expect(useChatStore.getState().streamRunsByConversation['conversation-1']).toBeUndefined()
  })

  it('keeps reconnecting when status is inactive but the assistant message is still incomplete', async () => {
    vi.useFakeTimers()
    const assistantMessage = {
      id: 'message-1',
      conversation_id: 'conversation-1',
      role: 'assistant' as const,
      content: 'Partial answer',
      content_blocks: null,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    vi.mocked(backendGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/chat/status/')) {
        return { active: false } as never
      }
      if (url.startsWith('/api/conversations/conversation-1/messages')) {
        return [assistantMessage] as never
      }
      throw new Error(`Unexpected backendGet ${url}`)
    })

    const recovery = recoverConversation('conversation-1')

    await vi.waitFor(() => {
      expect(useChatStore.getState().streamingConversationIds).toContain('conversation-1')
    })
    expect(useChatStore.getState().reconnectingConversationIds).toContain('conversation-1')
    expect(useChatStore.getState().interruptedConversationIds).not.toContain('conversation-1')

    abortRecovery('conversation-1')
    await vi.runOnlyPendingTimersAsync()
    await recovery
  })
})
