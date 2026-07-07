import { Profiler } from 'react'
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
    addConversation: vi.fn(),
    updateConversation: vi.fn(),
    removeConversation: vi.fn(),
    setMessages: vi.fn(),
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
    repairAgentSetup: vi.fn(),
    reportTeamError: vi.fn(),
    setActiveCampaign: vi.fn(),
    expandPanel: vi.fn(),
    store,
  }
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div> },
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text, state }: { text?: string; state?: string }) => (
    <div data-state={state} data-testid="loading-orb">
      {text}
    </div>
  ),
}))

vi.mock('@/components/chat/ChatInputAdapter', () => ({
  ChatInput: () => <textarea aria-label="Composer" />,
}))

vi.mock('@/components/chat/CampaignPreviewPanelAdapter', () => ({
  CampaignPreviewPanel: () => <div data-testid="campaign-preview" />,
}))

vi.mock('@/components/layout/ResizableDivider', () => ({
  ResizableDivider: () => <div data-testid="resize-divider" />,
}))

vi.mock('@/components/layout/usePanelResize', () => ({
  usePanelResize: () => ({
    chatWidthPercent: 40,
    isDragging: false,
    containerRef: { current: null },
    handleMouseDown: vi.fn(),
  }),
}))

vi.mock('@/lib/agents', () => ({
  repairAgentSetup: mocks.repairAgentSetup,
  reportTeamError: mocks.reportTeamError,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string | null }) => unknown) =>
    selector({ activeOrgId: null }),
}))

vi.mock('@/lib/chat/campaign-mode-adapter', () => ({
  useCampaignMode: () => ({
    setActiveCampaign: mocks.setActiveCampaign,
    isPanelMinimized: false,
    expandPanel: mocks.expandPanel,
    activeCampaignName: null,
  }),
}))

vi.mock('@/lib/chat/use-active-artifact-selection-signal', () => ({
  useActiveArtifactSelectionSignal: () => null,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaign: mocks.fetchCampaign,
}))

vi.mock('@/lib/chat', () => ({
  CHAT_TOAST_ERRORS: { CHAT_RESEND_FAILED: { userMessage: 'Resend failed' } },
  toastMessageForChatSendError: () => 'Send failed',
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
  ) => [...local, ...latest],
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

vi.mock('./agent-chat-panel/AgentChatThread', () => ({
  AgentChatThread: () => <div data-testid="agent-chat-thread" />,
}))

vi.mock('./agent-chat-panel/AgentChatMobileCampaignPanel', () => ({
  AgentChatMobileCampaignPanel: () => <div data-testid="mobile-campaign-panel" />,
}))

vi.mock('./agent-chat-panel/AgentChatVoicePanel', () => ({
  AgentChatVoicePanel: () => <div data-testid="voice-panel" />,
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

describe('AgentChatPanel setup gate', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    mocks.backendGet.mockResolvedValue([])
    mocks.createClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
    })
    mocks.fetchCampaign.mockResolvedValue({ config: {} })
    mocks.fetchConversations.mockResolvedValue([])
    mocks.fetchMessages.mockResolvedValue([])
    mocks.repairAgentSetup.mockResolvedValue({
      sync_status: 'ready',
      reasons: [],
      agent: buildAgent(),
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

  it('blocks chat on failed setup, retries setup, and settles without render loops', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onAgentSetupRepaired = vi.fn()
    let commits = 0

    try {
      render(
        <Profiler id="agent-chat-panel-setup" onRender={() => commits++}>
          <AgentChatPanel
            agent={buildAgent({ sync_status: 'failed' })}
            modelId="auto"
            onAgentSetupRepaired={onAgentSetupRepaired}
          />
        </Profiler>,
      )

      expect(screen.getByTestId('loading-orb').textContent).toBe(
        'Setup needs another try for Agent Alpha.',
      )
      expect(screen.queryByTestId('agent-chat-thread')).toBeNull()
      expect(screen.getByText('Something got tangled up during setup. I can try again now.')).toBeTruthy()

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Retry setup' }))
      })

      await waitFor(() => expect(mocks.repairAgentSetup).toHaveBeenCalledWith('agent-alpha'))
      await waitFor(() => expect(onAgentSetupRepaired).toHaveBeenCalledWith('agent-alpha'))

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(20)
    } finally {
      consoleError.mockRestore()
    }
  })
})
