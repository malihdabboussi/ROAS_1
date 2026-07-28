import { afterEach, describe, expect, it, vi } from 'vitest'
import { backendFetch, backendGet, backendPost } from '@/lib/api/backend-client'
import { resolveChatStreamFailure } from '../config/chat-stream-errors.config'
import { isAssistantTurnComplete } from '../lib/chat-turn-completion'
import { useChatStore } from '../store/use-chat-store'
import type { Message } from '../types'
import {
  abortStream,
  applyRecoveredTimelineEvents,
  isRealAgentStreamEvent,
  mergeMessagesPreservingOrderedBlocks,
  needsStreamRecovery,
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

  it('manually resumes an interrupted run with the exact task and partial output', async () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'Explain why the 4.5% conversion rate is low.',
        content_blocks: null,
        metadata: {
          documents: [
            {
              filename: 'page.png',
              type: 'image',
              fileUrl: 'https://example.com/page.png',
              mimeType: 'image/png',
            },
          ],
        },
        created_at: '2026-07-28T17:00:00.000Z',
      },
      {
        id: 'assistant-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: 'The page is well built, which makes the 4.5% more interesting, not less.',
        content_blocks: null,
        metadata: {},
        created_at: '2026-07-28T17:00:01.000Z',
      },
    ]
    const store = useChatStore.getState()
    store.setMessages('conversation-1', messages)
    store.setConversationStreamRun('conversation-1', {
      runId: 'run-1',
      messageId: 'assistant-1',
      cursor: '2-0',
    })
    store.setConversationInterrupted('conversation-1', true)
    store.setConversationStreamFailure(
      'conversation-1',
      resolveChatStreamFailure({ code: 'stream_interrupted' }),
    )
    vi.mocked(backendGet).mockResolvedValue(messages as never)
    vi.mocked(backendPost).mockResolvedValue({ stopped: true } as never)
    vi.mocked(backendFetch).mockResolvedValue(
      new Response(
        [
          'data: {"type":"message_start","message_id":"assistant-2"}',
          'data: {"type":"content_delta","content":"The likely issue is traffic-message mismatch."}',
          'data: {"type":"done","message_id":"assistant-2","duration_ms":100}',
          'data: [DONE]',
          '',
        ].join('\n\n'),
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      ),
    )

    await recoverConversation('conversation-1', { manual: true })

    expect(backendPost).toHaveBeenCalledWith('/api/chat/stop', {
      conversation_id: 'conversation-1',
      run_id: 'run-1',
    })
    const chatRequest = vi
      .mocked(backendFetch)
      .mock.calls.find(([url]) => url === '/api/chat')
    expect(chatRequest).toBeDefined()
    const body = JSON.parse(String(chatRequest?.[1]?.body)) as Record<string, unknown>
    expect(body.hidden).toBe(true)
    expect(body.content).toContain('Explain why the 4.5% conversion rate is low.')
    expect(body.content).toContain(
      'The page is well built, which makes the 4.5% more interesting, not less.',
    )
    expect(body.documents).toEqual(messages[0]?.metadata.documents)
    expect(useChatStore.getState().interruptedConversationIds).not.toContain('conversation-1')
  })

  it('completes recovery when status is inactive and assistant has visible content without duration_ms', async () => {
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

    await recoverConversation('conversation-1')

    expect(useChatStore.getState().streamingConversationIds).not.toContain('conversation-1')
    expect(useChatStore.getState().reconnectingConversationIds).not.toContain('conversation-1')
    expect(useChatStore.getState().interruptedConversationIds).not.toContain('conversation-1')
    expect(useChatStore.getState().streamFailureByConversation['conversation-1']).toBeUndefined()
  })

  it('completes recovery when status is active without a resumable run and assistant has visible content', async () => {
    const assistantMessage = {
      id: 'message-1',
      conversation_id: 'conversation-1',
      role: 'assistant' as const,
      content: 'Finished answer',
      content_blocks: null,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    vi.mocked(backendGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/chat/status/')) {
        return { active: true, messageId: 'message-1', runId: null } as never
      }
      if (url.startsWith('/api/conversations/conversation-1/messages')) {
        return [assistantMessage] as never
      }
      throw new Error(`Unexpected backendGet ${url}`)
    })

    await recoverConversation('conversation-1')

    expect(useChatStore.getState().streamingConversationIds).not.toContain('conversation-1')
    expect(useChatStore.getState().reconnectingConversationIds).not.toContain('conversation-1')
    expect(useChatStore.getState().conversationStreamUI['conversation-1']).toBeUndefined()
  })

  it('completes recovery when DB assistant is empty but local temp message has streamed content', async () => {
    const localAssistant = {
      id: 'temp-1',
      conversation_id: 'conversation-1',
      role: 'assistant' as const,
      content: 'Streamed answer',
      content_blocks: null,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    useChatStore.getState().setMessages('conversation-1', [
      {
        id: 'user-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'hi',
        content_blocks: null,
        metadata: {},
        created_at: new Date().toISOString(),
      },
      localAssistant,
    ])

    vi.mocked(backendGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/chat/status/')) {
        return { active: false } as never
      }
      if (url.startsWith('/api/conversations/conversation-1/messages')) {
        return [
          {
            id: 'user-1',
            conversation_id: 'conversation-1',
            role: 'user',
            content: 'hi',
            content_blocks: null,
            metadata: {},
            created_at: new Date().toISOString(),
          },
          {
            id: 'canonical-1',
            conversation_id: 'conversation-1',
            role: 'assistant',
            content: '',
            content_blocks: null,
            metadata: {},
            created_at: new Date().toISOString(),
          },
        ] as never
      }
      throw new Error(`Unexpected backendGet ${url}`)
    })

    await recoverConversation('conversation-1')

    const assistant = (useChatStore.getState().messagesByConversation['conversation-1'] ?? []).find(
      (message) => message.role === 'assistant',
    )
    expect(assistant?.content).toBe('Streamed answer')
    expect(useChatStore.getState().reconnectingConversationIds).not.toContain('conversation-1')
    expect(useChatStore.getState().conversationStreamUI['conversation-1']).toBeUndefined()
  })
})

describe('isAssistantTurnComplete', () => {
  const baseAssistant = {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant' as const,
    content_blocks: null,
    created_at: '2026-05-28T13:00:00.000Z',
  }

  it('returns false for missing or non-assistant messages', () => {
    expect(isAssistantTurnComplete(undefined)).toBe(false)
    expect(
      isAssistantTurnComplete({
        ...baseAssistant,
        role: 'user',
        content: 'hi',
        metadata: {},
      } as Message),
    ).toBe(false)
  })

  it('returns true when duration_ms is set regardless of streamInactive', () => {
    const message = {
      ...baseAssistant,
      content: '',
      metadata: { duration_ms: 100 },
    } as Message
    expect(isAssistantTurnComplete(message, false)).toBe(true)
    expect(isAssistantTurnComplete(message, true)).toBe(true)
  })

  it('returns true for visible text content when stream is inactive', () => {
    const message = {
      ...baseAssistant,
      content: 'Hello',
      metadata: {},
    } as Message
    expect(isAssistantTurnComplete(message, true)).toBe(true)
    expect(isAssistantTurnComplete(message, false)).toBe(false)
  })

  it('returns true for content_blocks_ordered when stream is inactive', () => {
    const message = {
      ...baseAssistant,
      content: '',
      metadata: { content_blocks_ordered: [{ type: 'text' }] },
    } as Message
    expect(isAssistantTurnComplete(message, true)).toBe(true)
    expect(isAssistantTurnComplete(message, false)).toBe(false)
  })

  it('returns false for empty assistant with no blocks when stream is inactive', () => {
    const message = {
      ...baseAssistant,
      content: '',
      metadata: {},
    } as Message
    expect(isAssistantTurnComplete(message, true)).toBe(false)
  })
})

describe('mergeMessagesPreservingOrderedBlocks', () => {
  it('preserves streamed local content when backend assistant id differs and DB row is empty', () => {
    const localMessages: Message[] = [
      {
        id: 'user-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'hi',
        content_blocks: null,
        metadata: {},
        created_at: '2026-05-28T13:00:00.000Z',
      },
      {
        id: 'temp-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: 'Streamed answer',
        content_blocks: null,
        metadata: {},
        created_at: '2026-05-28T13:00:01.000Z',
      },
    ]
    const backendMessages: Message[] = [
      localMessages[0]!,
      {
        id: 'canonical-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: '',
        content_blocks: null,
        metadata: {},
        created_at: '2026-05-28T13:00:01.000Z',
      },
    ]

    const merged = mergeMessagesPreservingOrderedBlocks(localMessages, backendMessages)
    const assistant = merged.find((message) => message.role === 'assistant')

    expect(assistant?.id).toBe('canonical-1')
    expect(assistant?.content).toBe('Streamed answer')
  })

  it('preserves streamed local text when backend assistant only has duration_ms metadata', () => {
    const localMessages: Message[] = [
      {
        id: 'user-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'hi',
        content_blocks: null,
        metadata: {},
        created_at: '2026-05-28T13:00:00.000Z',
      },
      {
        id: 'temp-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: 'Streamed answer',
        content_blocks: null,
        metadata: { duration_ms: 1 },
        created_at: '2026-05-28T13:00:01.000Z',
      },
    ]
    const backendMessages: Message[] = [
      localMessages[0]!,
      {
        id: 'canonical-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: '',
        content_blocks: null,
        metadata: { duration_ms: 42 },
        created_at: '2026-05-28T13:00:01.000Z',
      },
    ]

    const merged = mergeMessagesPreservingOrderedBlocks(localMessages, backendMessages)
    const assistant = merged.find((message) => message.role === 'assistant')

    expect(assistant?.id).toBe('canonical-1')
    expect(assistant?.content).toBe('Streamed answer')
  })
})

describe('needsStreamRecovery', () => {
  it('returns false when the latest assistant already has visible streamed content', () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'hi',
        content_blocks: null,
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: 'assistant-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: 'Done without duration_ms',
        content_blocks: null,
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ]

    expect(needsStreamRecovery(messages)).toBe(false)
  })

  it('returns true for a fresh empty assistant placeholder', () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'hi',
        content_blocks: null,
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: 'assistant-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: '',
        content_blocks: null,
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ]

    expect(needsStreamRecovery(messages)).toBe(true)
  })

  it('skips recovery when the latest assistant has legacy content_blocks only', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: '',
        content_blocks: [{ id: 'text-1', type: 'text', content: 'Hello from DB blocks' }],
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ]

    expect(needsStreamRecovery(messages)).toBe(false)
  })
})
