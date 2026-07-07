import { Profiler, type RefObject } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import { AgentChatPanel } from './AgentChatPanel'

const mocks = vi.hoisted(() => {
  const store = {
    messagesByConversation: {} as Record<string, Array<Record<string, unknown>>>,
    streamingConversationIds: [] as string[],
    stoppingConversationIds: [] as string[],
    streamingMessageIdsByConversation: {} as Record<string, string | null>,
    messageQueueByConversation: {} as Record<string, Array<{ id: string; content: string }>>,
    conversations: [] as Array<Record<string, unknown>>,
    creditsLow: false,
    creditsLowRemaining: null as number | null,
    creditsExhausted: false,
    addConversation: vi.fn((conversation: Record<string, unknown>) => {
      store.conversations = [
        conversation,
        ...store.conversations.filter((item) => item.id !== conversation.id),
      ]
    }),
    updateConversation: vi.fn(),
    removeConversation: vi.fn(),
    setMessages: vi.fn((conversationId: string, messages: Array<Record<string, unknown>>) => {
      store.messagesByConversation[conversationId] = messages
    }),
    setActiveConversationId: vi.fn(),
    promoteConversation: vi.fn(),
    addNewArtifactId: vi.fn(),
    clearNewArtifactIds: vi.fn(),
    setCreditsExhausted: vi.fn(),
    enqueueMessage: vi.fn(),
    dequeueMessage: vi.fn(),
    removeQueueItem: vi.fn(),
    updateQueueItem: vi.fn(),
    composerDraftByContext: {} as Record<string, string>,
    setComposerDraft: vi.fn(),
    clearComposerDraft: vi.fn(),
  }

  return {
    backendGet: vi.fn(),
    createClient: vi.fn(),
    fetchCampaign: vi.fn(),
    fetchConversations: vi.fn(),
    fetchMessages: vi.fn(),
    reportTeamError: vi.fn(),
    store,
    useCampaignMode: vi.fn(),
    useOrgStore: vi.fn(),
    usePanelResize: vi.fn(),
  }
})

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/lib/agents', () => ({
  reportTeamError: mocks.reportTeamError,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string | null }) => unknown) =>
    mocks.useOrgStore(selector),
}))

vi.mock('@/lib/chat/campaign-mode-adapter', () => ({
  useCampaignMode: mocks.useCampaignMode,
}))

vi.mock('@/lib/chat/use-active-artifact-selection-signal', () => ({
  useActiveArtifactSelectionSignal: () => null,
}))

vi.mock('@/components/layout/usePanelResize', () => ({
  usePanelResize: mocks.usePanelResize,
}))

vi.mock('@/components/layout/ResizableDivider', () => ({
  ResizableDivider: () => <div data-testid="resize-divider" />,
}))

vi.mock('@/components/chat/ChatInputAdapter', () => ({
  ChatInput: () => <textarea aria-label="Composer" />,
}))

vi.mock('@/components/chat/CampaignPreviewPanelAdapter', () => ({
  CampaignPreviewPanel: () => <div data-testid="campaign-preview" />,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaign: mocks.fetchCampaign,
}))

vi.mock('@/lib/chat', () => ({
  CHAT_TOAST_ERRORS: { CHAT_RESEND_FAILED: { userMessage: 'Could not resend' } },
  toastMessageForChatSendError: () => 'Could not send',
}))

vi.mock('@/lib/chat/studio-chat-runtime-adapter', () => ({
  clearConversationTeamDraft: vi.fn(),
  createNewConversation: vi.fn(),
  deleteConversation: vi.fn(),
  deleteMessagesFrom: vi.fn(),
  fetchConversations: mocks.fetchConversations,
  fetchMessages: mocks.fetchMessages,
  initStreamResilience: vi.fn(),
  isStreamActive: () => false,
  mergeMessagesPreservingOrderedBlocks: (
    local: Array<Record<string, unknown>>,
    latest: Array<Record<string, unknown>>,
  ) => [...local, ...latest.filter((next) => !local.some((item) => item.id === next.id))],
  needsStreamRecovery: () => false,
  recoverConversation: vi.fn(),
  renameConversation: vi.fn(),
  requestStopStream: vi.fn(),
  sendMessageStreaming: vi.fn(),
  suggestConversationTitle: vi.fn(),
  useChatStore: Object.assign(
    (selector: (state: typeof mocks.store) => unknown) => selector(mocks.store),
    { getState: () => mocks.store },
  ),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: (_key: string, loader: () => Promise<unknown>) => loader(),
}))

vi.mock('@/lib/debug/freeze-diagnostics', () => ({
  reportFreezeEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: mocks.createClient,
}))

vi.mock('./chat/ConversationSearch', () => ({
  filterMessagesByQuery: (messages: Array<unknown>) => messages,
}))

vi.mock('./chat/TeamChatHeader', () => ({
  TeamChatHeader: () => <header data-testid="team-chat-header" />,
  TeamChatMobileThreadHeader: () => <header data-testid="team-chat-mobile-header" />,
}))

vi.mock('./chat/TeamConversationsSidebar', () => ({
  persistConversationsSidebarExpanded: vi.fn(),
  readConversationsSidebarExpandedDefault: () => true,
  TeamConversationsSidebar: () => <aside data-testid="team-conversations-sidebar" />,
}))

vi.mock('./agent-chat-panel/AgentChatSetupGate', () => ({
  AgentChatSetupGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./agent-chat-panel/AgentChatMobileCampaignPanel', () => ({
  AgentChatMobileCampaignPanel: () => <div data-testid="mobile-campaign-panel" />,
}))

vi.mock('./agent-chat-panel/AgentChatVoicePanel', () => ({
  AgentChatVoicePanel: () => <div data-testid="voice-panel" />,
}))

vi.mock('./agent-chat-panel/AgentChatThread', () => ({
  AgentChatThread: ({
    messages,
    scrollRef,
    onScroll,
    onScrollToBottom,
    userHasScrolledUp,
  }: {
    messages: Array<{ id: string; content: string | null }>
    scrollRef: RefObject<HTMLDivElement | null>
    onScroll: () => void
    onScrollToBottom: () => void
    userHasScrolledUp: boolean
  }) => (
    <section>
      <div data-testid="scroll-container" ref={scrollRef} onScroll={onScroll}>
        {messages.map((message) => (
          <div key={message.id} data-testid="thread-message">
            {message.id}:{message.content}
          </div>
        ))}
      </div>
      <span data-testid="user-scrolled-up">{String(userHasScrolledUp)}</span>
      <button type="button" onClick={onScrollToBottom}>
        Scroll latest
      </button>
    </section>
  ),
}))

function buildAgent(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-row-1',
    user_id: 'user-1',
    agent_key: 'agent-alpha',
    name: 'Agent Alpha',
    role: 'Operations',
    status: 'online',
    skills: [],
    image_url: null,
    is_active: true,
    sync_status: 'ready',
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

const conversation = {
  id: 'conversation-1',
  user_id: 'user-1',
  campaign_id: null,
  title: 'Launch planning',
  agent_id: 'agent-alpha',
  status: 'active',
  metadata: {},
  created_at: '2026-06-24T00:00:00.000Z',
  updated_at: '2026-06-24T00:10:00.000Z',
}

const messages = [
  {
    id: 'message-user-1',
    conversation_id: 'conversation-1',
    role: 'user' as const,
    content: 'Plan the launch',
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-24T00:11:00.000Z',
  },
  {
    id: 'message-assistant-1',
    conversation_id: 'conversation-1',
    role: 'assistant' as const,
    content: 'Here is the plan',
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-24T00:12:00.000Z',
  },
  ...Array.from({ length: 28 }, (_, index) => ({
    id: `message-assistant-extra-${index}`,
    conversation_id: 'conversation-1',
    role: 'assistant' as const,
    content: `Extra response ${index}`,
    content_blocks: null,
    metadata: {},
    created_at: `2026-06-24T00:${String(13 + index).padStart(2, '0')}:00.000Z`,
  })),
]

const olderMessage = {
  id: 'message-user-older',
  conversation_id: 'conversation-1',
  role: 'user' as const,
  content: 'Older context',
  content_blocks: null,
  metadata: {},
  created_at: '2026-06-24T00:05:00.000Z',
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('AgentChatPanel scroll controller', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    mocks.store.messagesByConversation = {}
    mocks.store.streamingConversationIds = []
    mocks.store.stoppingConversationIds = []
    mocks.store.streamingMessageIdsByConversation = {}
    mocks.store.messageQueueByConversation = {}
    mocks.store.conversations = []
    mocks.store.creditsLow = false
    mocks.store.creditsLowRemaining = null
    mocks.store.creditsExhausted = false
    mocks.backendGet.mockResolvedValue([])
    mocks.createClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })
    mocks.fetchCampaign.mockResolvedValue({ config: {} })
    mocks.fetchConversations.mockResolvedValue([conversation])
    mocks.fetchMessages.mockImplementation(async (_conversationId: string, options?: { before?: string }) =>
      options?.before ? [olderMessage] : messages,
    )
    mocks.useCampaignMode.mockReturnValue({
      setActiveCampaign: vi.fn(),
      isPanelMinimized: false,
      expandPanel: vi.fn(),
      activeCampaignName: null,
    })
    mocks.useOrgStore.mockImplementation((selector: (state: { activeOrgId: string | null }) => unknown) =>
      selector({ activeOrgId: null }),
    )
    mocks.usePanelResize.mockReturnValue({
      chatWidthPercent: 40,
      isDragging: false,
      containerRef: { current: null },
      handleMouseDown: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('loads older messages at the top, tracks scroll-away state, and scrolls back to latest without render loops', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0

    try {
      render(
        <Profiler id="agent-chat-panel-scroll" onRender={() => commits++}>
          <AgentChatPanel agent={buildAgent()} modelId="auto" />
        </Profiler>,
      )

      await waitFor(() =>
        expect(mocks.store.setMessages).toHaveBeenCalledWith('conversation-1', messages),
      )
      await flushAsyncWork()

      const scrollContainer = screen.getByTestId('scroll-container')
      const scrollTo = vi.fn()
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1200, configurable: true })
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 400, configurable: true })
      Object.defineProperty(scrollContainer, 'scrollTop', {
        value: 0,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(scrollContainer, 'scrollTo', { value: scrollTo, configurable: true })

      scrollContainer.scrollTop = 300
      fireEvent.scroll(scrollContainer)

      await waitFor(() => expect(screen.getByTestId('user-scrolled-up').textContent).toBe('true'))

      scrollContainer.scrollTop = 0
      fireEvent.scroll(scrollContainer)

      await waitFor(() =>
        expect(mocks.fetchMessages).toHaveBeenCalledWith('conversation-1', {
          limit: 30,
          before: '2026-06-24T00:11:00.000Z',
        }),
      )
      await waitFor(() =>
        expect(mocks.store.setMessages).toHaveBeenCalledWith('conversation-1', [
          olderMessage,
          ...messages,
        ]),
      )

      fireEvent.click(screen.getByRole('button', { name: 'Scroll latest' }))

      expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'smooth' })
      await waitFor(() => expect(screen.getByTestId('user-scrolled-up').textContent).toBe('false'))

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(30)
    } finally {
      consoleError.mockRestore()
    }
  })
})
