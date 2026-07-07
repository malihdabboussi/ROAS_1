import { Profiler } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
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
    updateConversation: vi.fn((id: string, updates: Record<string, unknown>) => {
      store.conversations = store.conversations.map((conversation) =>
        conversation.id === id ? { ...conversation, ...updates } : conversation,
      )
    }),
    removeConversation: vi.fn((id: string) => {
      store.conversations = store.conversations.filter((conversation) => conversation.id !== id)
    }),
    setMessages: vi.fn((conversationId: string, messages: Array<Record<string, unknown>>) => {
      store.messagesByConversation[conversationId] = messages
    }),
    setActiveConversationId: vi.fn(),
    promoteConversation: vi.fn(),
    addNewArtifactId: vi.fn(),
    clearNewArtifactIds: vi.fn(),
    setCreditsExhausted: vi.fn((value: boolean) => {
      store.creditsExhausted = value
    }),
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
    repairAgentSetup: vi.fn(),
    reportTeamError: vi.fn(),
    store,
    useCampaignMode: vi.fn(),
    useOrgStore: vi.fn(),
    usePanelResize: vi.fn(),
  }
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div data-testid="loading-orb">{text}</div>,
}))

vi.mock('@/lib/agents', () => ({
  repairAgentSetup: mocks.repairAgentSetup,
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

vi.mock('@/components/chat/ComposerActiveRunTipCard', () => ({
  ComposerActiveRunTipCard: () => <div data-testid="composer-tip" />,
}))

vi.mock('@/components/chat/MessageQueue', () => ({
  MessageQueue: ({ items }: { items: Array<unknown> }) => (
    <div data-testid="message-queue">Queued {items.length}</div>
  ),
}))

vi.mock('@/components/chat/PlanStickyTracker', () => ({
  PlanStickyTracker: () => <div data-testid="plan-tracker" />,
}))

vi.mock('@/components/chat/RateLimitCardAdapter', () => ({
  RateLimitCard: () => <div data-testid="rate-limit-card" />,
}))

vi.mock('@/components/chat/StatusIndicatorAdapter', () => ({
  StatusIndicator: ({ conversationIdOverride }: { conversationIdOverride?: string | null }) => (
    <div data-testid="status-indicator">{conversationIdOverride}</div>
  ),
}))

vi.mock('@/components/chat/StreamInterruptedBarAdapter', () => ({
  StreamInterruptedBar: ({ conversationId }: { conversationId?: string | null }) => (
    <div data-testid="stream-interrupted">{conversationId}</div>
  ),
}))

vi.mock('@/components/chat/ChatInputAdapter', () => ({
  ChatInput: ({ placeholder }: { placeholder?: string }) => (
    <label>
      Composer
      <textarea aria-label="Composer" placeholder={placeholder} />
    </label>
  ),
}))

vi.mock('@/components/chat/MessageBubbleAdapter', () => ({
  MessageBubble: ({
    message,
    conversationIdOverride,
    agentKey,
  }: {
    message: { id: string; content: string | null }
    conversationIdOverride?: string | null
    agentKey?: string
  }) => (
    <div data-testid="message-bubble">
      {message.id}:{message.content}:{conversationIdOverride}:{agentKey}
    </div>
  ),
}))

vi.mock('@/components/chat/CampaignPreviewPanelAdapter', () => ({
  CampaignPreviewPanel: () => <div data-testid="campaign-preview" />,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaign: mocks.fetchCampaign,
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
  TeamChatHeader: ({ sessionTitle }: { sessionTitle: string }) => (
    <header data-testid="team-chat-header">{sessionTitle}</header>
  ),
  TeamChatMobileThreadHeader: ({ sessionTitle }: { sessionTitle: string }) => (
    <header data-testid="team-chat-mobile-header">{sessionTitle}</header>
  ),
}))

vi.mock('./chat/TeamConversationsSidebar', () => ({
  persistConversationsSidebarExpanded: vi.fn(),
  readConversationsSidebarExpandedDefault: () => true,
  TeamConversationsSidebar: ({
    sessions,
    selectedSessionId,
  }: {
    sessions: Array<{ id: string; title: string | null }>
    selectedSessionId: string | null
  }) => (
    <aside data-testid="team-conversations-sidebar">
      {sessions.map((session) => (
        <div key={session.id} data-selected={session.id === selectedSessionId}>
          {session.title}
        </div>
      ))}
    </aside>
  ),
}))

vi.mock('./voice/AgentVoiceMode', () => ({
  AgentVoiceMode: () => <div data-testid="agent-voice-mode" />,
}))

vi.mock('./voice/VoiceSessionTasks', () => ({
  VoiceSessionTasks: () => <div data-testid="voice-session-tasks" />,
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
]

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('AgentChatPanel', () => {
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
      channel: vi.fn(),
      removeChannel: vi.fn(),
    })
    mocks.fetchCampaign.mockResolvedValue({ config: {} })
    mocks.fetchConversations.mockResolvedValue([conversation])
    mocks.fetchMessages.mockResolvedValue(messages)
    mocks.repairAgentSetup.mockResolvedValue({ sync_status: 'ready', reasons: [], agent: buildAgent() })
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

  it('loads the selected conversation, renders the chat chrome, and settles without render loops', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0

    try {
      render(
        <Profiler id="agent-chat-panel" onRender={() => commits++}>
          <AgentChatPanel agent={buildAgent()} modelId="auto" />
        </Profiler>,
      )

      await waitFor(() => expect(mocks.fetchConversations).toHaveBeenCalledWith(undefined, 'agent-alpha'))
      await waitFor(() =>
        expect(mocks.store.setMessages).toHaveBeenCalledWith('conversation-1', messages),
      )
      await flushAsyncWork()

      expect(screen.getByTestId('team-chat-header').textContent).toBe('Launch planning')
      expect(screen.getByTestId('team-conversations-sidebar').textContent).toContain(
        'Launch planning',
      )
      expect(screen.getByPlaceholderText('Message Agent Alpha...')).toBeTruthy()
      expect(screen.getAllByTestId('message-bubble')).toHaveLength(2)
      expect(screen.getByText('message-user-1:Plan the launch:conversation-1:agent-alpha')).toBeTruthy()
      expect(screen.getByText('message-assistant-1:Here is the plan:conversation-1:agent-alpha')).toBeTruthy()
      expect(screen.getByTestId('status-indicator').textContent).toBe('conversation-1')
      expect(screen.getByTestId('stream-interrupted').textContent).toBe('conversation-1')

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(25)
    } finally {
      consoleError.mockRestore()
    }
  })

})
