import { describe, expect, it, vi } from 'vitest'
import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  BACKEND_DEFAULT_MESSAGE_PAGE,
  INITIAL_PAGE_SIZE,
} from './agent-chat-panel.logic'
import { hydrateSelectedSessionMessages } from './agent-chat-panel.session-selection'

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: 'Hello',
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function buildMessages(count: number, prefix: string): Message[] {
  return Array.from({ length: count }, (_, index) =>
    buildMessage({
      id: `${prefix}-${index + 1}`,
      content: `${prefix} ${index + 1}`,
    }),
  )
}

describe('agent chat panel session selection hydration', () => {
  it('hydrates empty sessions with the initial page and starts recovery for incomplete latest messages', async () => {
    const latest = buildMessages(INITIAL_PAGE_SIZE, 'latest')
    const fetchMessagesForSession = vi.fn().mockResolvedValue(latest)
    const setMessages = vi.fn()
    const setHasOlder = vi.fn()
    const recover = vi.fn()
    const reportEnd = vi.fn()

    await expect(
      hydrateSelectedSessionMessages({
        sessionId: 'conversation-1',
        cachedMessages: undefined,
        loadToken: 1,
        getCurrentLoadToken: () => 1,
        fetchMessagesForSession,
        isStreamActiveForSession: () => false,
        mergeMessages: vi.fn(),
        getLocalMessages: vi.fn(),
        setMessages,
        setHasOlder,
        needsRecovery: () => true,
        recover,
        reportEnd,
      }),
    ).resolves.toBe('applied')

    expect(fetchMessagesForSession).toHaveBeenCalledWith('conversation-1', {
      limit: INITIAL_PAGE_SIZE,
    })
    expect(setMessages).toHaveBeenCalledWith('conversation-1', latest)
    expect(setHasOlder).toHaveBeenCalledWith(true)
    expect(reportEnd).toHaveBeenCalledWith({
      had_cached_messages: false,
      messages_count: INITIAL_PAGE_SIZE,
    })
    expect(recover).toHaveBeenCalledWith('conversation-1')
  })

  it('refreshes cached sessions with the backend default page and merges into local messages', async () => {
    const cached = [buildMessage({ id: 'cached-message' })]
    const local = [buildMessage({ id: 'local-message' })]
    const latest = buildMessages(BACKEND_DEFAULT_MESSAGE_PAGE, 'latest')
    const merged = [...local, ...latest]
    const fetchMessagesForSession = vi.fn().mockResolvedValue(latest)
    const mergeMessages = vi.fn().mockReturnValue(merged)
    const setMessages = vi.fn()
    const setHasOlder = vi.fn()
    const recover = vi.fn()
    const reportEnd = vi.fn()

    await expect(
      hydrateSelectedSessionMessages({
        sessionId: 'conversation-1',
        cachedMessages: cached,
        loadToken: 1,
        getCurrentLoadToken: () => 1,
        fetchMessagesForSession,
        isStreamActiveForSession: () => false,
        mergeMessages,
        getLocalMessages: () => local,
        setMessages,
        setHasOlder,
        needsRecovery: (messages) => messages === cached,
        recover,
        reportEnd,
      }),
    ).resolves.toBe('applied')

    expect(recover).toHaveBeenCalledWith('conversation-1')
    expect(fetchMessagesForSession).toHaveBeenCalledWith('conversation-1')
    expect(mergeMessages).toHaveBeenCalledWith(local, latest)
    expect(setMessages).toHaveBeenCalledWith('conversation-1', merged)
    expect(setHasOlder).toHaveBeenCalledWith(true)
    expect(reportEnd).toHaveBeenCalledWith({
      had_cached_messages: true,
      messages_count: BACKEND_DEFAULT_MESSAGE_PAGE,
    })
  })

  it('ignores fetched messages when a newer load token wins the selection race', async () => {
    const setMessages = vi.fn()

    await expect(
      hydrateSelectedSessionMessages({
        sessionId: 'conversation-1',
        cachedMessages: undefined,
        loadToken: 1,
        getCurrentLoadToken: () => 2,
        fetchMessagesForSession: vi.fn().mockResolvedValue([buildMessage()]),
        isStreamActiveForSession: () => false,
        mergeMessages: vi.fn(),
        getLocalMessages: vi.fn(),
        setMessages,
        setHasOlder: vi.fn(),
        needsRecovery: vi.fn(),
        recover: vi.fn(),
        reportEnd: vi.fn(),
      }),
    ).resolves.toBe('stale')

    expect(setMessages).not.toHaveBeenCalled()
  })

  it('does not overwrite a session that becomes actively streaming during hydration', async () => {
    const setMessages = vi.fn()
    const reportEnd = vi.fn()

    await expect(
      hydrateSelectedSessionMessages({
        sessionId: 'conversation-1',
        cachedMessages: undefined,
        loadToken: 1,
        getCurrentLoadToken: () => 1,
        fetchMessagesForSession: vi.fn().mockResolvedValue([buildMessage()]),
        isStreamActiveForSession: () => true,
        mergeMessages: vi.fn(),
        getLocalMessages: vi.fn(),
        setMessages,
        setHasOlder: vi.fn(),
        needsRecovery: vi.fn(),
        recover: vi.fn(),
        reportEnd,
      }),
    ).resolves.toBe('stream-active')

    expect(setMessages).not.toHaveBeenCalled()
    expect(reportEnd).not.toHaveBeenCalled()
  })
})
