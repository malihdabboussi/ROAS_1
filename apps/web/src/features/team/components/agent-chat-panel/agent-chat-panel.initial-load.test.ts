import { describe, expect, it, vi } from 'vitest'
import type { Conversation, Message } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  runAgentChatInitialLoad,
  type RunAgentChatInitialLoadInput,
} from './agent-chat-panel.initial-load'
import { INITIAL_PAGE_SIZE } from './agent-chat-panel.logic'

function conversation(id: string, overrides: Partial<Conversation> = {}): Conversation {
  return {
    id,
    user_id: 'user-1',
    campaign_id: null,
    title: `Session ${id}`,
    agent_id: 'agent-alpha',
    status: 'active',
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function message(id: string, conversationId = 'session-1'): Message {
  return {
    id,
    conversation_id: conversationId,
    role: 'assistant',
    content: 'Hello',
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
  }
}

function createInput(
  overrides: Partial<RunAgentChatInitialLoadInput> = {},
): RunAgentChatInitialLoadInput {
  return {
    agentKey: 'agent-alpha',
    initialSessionId: null,
    isMobile: false,
    startBlankSession: false,
    generalCampaignId: undefined,
    readPersistedSessionId: vi.fn(() => null),
    readCachedCampaignId: vi.fn(() => null),
    cachedFetchConversations: vi.fn((_, load) => load()),
    fetchConversationsForAgent: vi.fn(async () => [conversation('session-1')]),
    fetchMessagesForSession: vi.fn(async () => []),
    getCachedConversations: vi.fn(() => []),
    addConversation: vi.fn(),
    setLoadedCampaignIds: vi.fn(),
    persistSessionSelection: vi.fn(),
    setSessions: vi.fn(),
    setSessionsLoading: vi.fn(),
    setInitializing: vi.fn(),
    setSelectedSessionId: vi.fn(),
    setActiveConversationId: vi.fn(),
    onSessionChange: vi.fn(),
    dispatchMobileSessionTitle: vi.fn(),
    setMessages: vi.fn(),
    setHasOlder: vi.fn(),
    getNewComposerDraft: vi.fn(() => undefined),
    setComposerDraft: vi.fn(),
    clearNewComposerDraft: vi.fn(),
    getPendingStrategySessionId: vi.fn(() => null),
    isStreamActiveForSession: vi.fn(() => false),
    needsRecovery: vi.fn(() => false),
    recover: vi.fn(),
    selectSession: vi.fn(async () => {}),
    reportMark: vi.fn(),
    getDurationMs: vi.fn(() => 42),
    isCancelled: vi.fn(() => false),
    ...overrides,
  }
}

describe('runAgentChatInitialLoad', () => {
  it('applies a requested cached session with prefetched messages', async () => {
    const session = conversation('session-1', { title: 'Focused Session' })
    const prefetchedMessages = [message('message-1')]
    const input = createInput({
      initialSessionId: 'session-1',
      fetchConversationsForAgent: vi.fn(async () => [session]),
      fetchMessagesForSession: vi.fn(async () => prefetchedMessages),
      getNewComposerDraft: vi.fn(() => 'draft text'),
      needsRecovery: vi.fn(() => true),
    })

    await runAgentChatInitialLoad(input)

    expect(input.cachedFetchConversations).toHaveBeenCalledWith(
      'conversations:agent:agent-alpha',
      expect.any(Function),
    )
    expect(input.fetchMessagesForSession).toHaveBeenCalledWith('session-1', {
      limit: INITIAL_PAGE_SIZE,
    })
    expect(input.addConversation).toHaveBeenCalledWith(session)
    expect(input.setSessions).toHaveBeenCalledWith([session])
    expect(input.setSessionsLoading).toHaveBeenCalledWith(false)
    expect(input.setComposerDraft).toHaveBeenCalledWith('session-1', 'draft text')
    expect(input.clearNewComposerDraft).toHaveBeenCalledTimes(1)
    expect(input.setSelectedSessionId).toHaveBeenCalledWith('session-1')
    expect(input.setActiveConversationId).toHaveBeenCalledWith('session-1')
    expect(input.persistSessionSelection).toHaveBeenCalledWith('session-1')
    expect(input.onSessionChange).toHaveBeenCalledWith('session-1')
    expect(input.dispatchMobileSessionTitle).toHaveBeenCalledWith('Focused Session')
    expect(input.setMessages).toHaveBeenCalledWith('session-1', prefetchedMessages)
    expect(input.setHasOlder).toHaveBeenCalledWith(false)
    expect(input.recover).toHaveBeenCalledWith('session-1')
    expect(input.selectSession).not.toHaveBeenCalled()
  })

  it('starts blank while preserving the fetched campaign-scoped session list', async () => {
    const session = conversation('campaign-session', { campaign_id: 'campaign-1' })
    const input = createInput({
      startBlankSession: true,
      generalCampaignId: 'general-campaign',
      readCachedCampaignId: vi.fn(() => 'campaign-1'),
      fetchConversationsForAgent: vi.fn(async () => [session]),
    })

    await runAgentChatInitialLoad(input)

    expect(input.cachedFetchConversations).toHaveBeenCalledWith(
      'conversations:agent:agent-alpha:campaign:campaign-1',
      expect.any(Function),
    )
    expect(input.fetchConversationsForAgent).toHaveBeenCalledWith('campaign-1', 'agent-alpha')
    expect(input.setLoadedCampaignIds).toHaveBeenCalledWith(new Set(['campaign-1']))
    expect(input.setSessions).toHaveBeenCalledWith([session])
    expect(input.setSessionsLoading).toHaveBeenCalledWith(false)
    expect(input.setInitializing).toHaveBeenCalledWith(false)
    expect(input.setSelectedSessionId).toHaveBeenCalledWith(null)
    expect(input.setActiveConversationId).toHaveBeenCalledWith(null)
    expect(input.persistSessionSelection).toHaveBeenCalledWith(null)
    expect(input.onSessionChange).toHaveBeenCalledWith(null)
    expect(input.selectSession).not.toHaveBeenCalled()
  })

  it('delegates hydration to selectSession when there is no cached requested session', async () => {
    const session = conversation('latest-session')
    const input = createInput({
      fetchConversationsForAgent: vi.fn(async () => [session]),
    })

    await runAgentChatInitialLoad(input)

    expect(input.setSessions).toHaveBeenCalledWith([session])
    expect(input.setSessionsLoading).toHaveBeenCalledWith(false)
    expect(input.selectSession).toHaveBeenCalledWith('latest-session', true)
    expect(input.setMessages).not.toHaveBeenCalled()
  })

  it('clears loading state when the initial conversations load fails', async () => {
    const input = createInput({
      cachedFetchConversations: vi.fn(async () => {
        throw new Error('network down')
      }),
    })

    await runAgentChatInitialLoad(input)

    expect(input.reportMark).toHaveBeenCalledWith('initial_load_error', {
      duration_ms: 42,
      message: 'network down',
    })
    expect(input.setSessions).toHaveBeenCalledWith([])
    expect(input.setSessionsLoading).toHaveBeenCalledWith(false)
    expect(input.setInitializing).toHaveBeenCalledWith(false)
    expect(input.selectSession).not.toHaveBeenCalled()
  })

  it('does not apply fetched conversations after cancellation', async () => {
    let cancelled = false
    const input = createInput({
      isCancelled: vi.fn(() => cancelled),
      cachedFetchConversations: vi.fn(async (_, load) => {
        const sessions = await load()
        cancelled = true
        return sessions
      }),
    })

    await runAgentChatInitialLoad(input)

    expect(input.reportMark).toHaveBeenCalledWith('initial_conversations_end', {
      campaign_scoped: false,
      conversations_count: 1,
      duration_ms: 42,
      has_requested_session: false,
    })
    expect(input.addConversation).not.toHaveBeenCalled()
    expect(input.setSessions).not.toHaveBeenCalled()
    expect(input.selectSession).not.toHaveBeenCalled()
  })
})
