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
  const realtimeHandlers: Array<{
    event: string
    config: Record<string, unknown>
    callback: (payload: { new?: Record<string, unknown> }) => void
  }> = []
  let subscribeStatus: ((status: string, error?: unknown) => void) | null = null
  const channel = {
    on: vi.fn(
      (
        event: string,
        config: Record<string, unknown>,
        callback: (payload: { new?: Record<string, unknown> }) => void,
      ) => {
        realtimeHandlers.push({ event, config, callback })
        return channel
      },
    ),
    subscribe: vi.fn((callback?: (status: string, error?: unknown) => void) => {
      subscribeStatus = callback ?? null
      return channel
    }),
  }
  const authGetUser = vi.fn()
  const supabaseClient = {
    auth: { getUser: authGetUser },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  }
  return {
    authGetUser,
    backendGet: vi.fn(),
    channel,
    createClient: vi.fn(() => supabaseClient),
    expandPanel: vi.fn(),
    fetchCampaign: vi.fn(),
    fetchConversations: vi.fn(),
    fetchMessages: vi.fn(),
    realtimeHandlers,
    reportTeamError: vi.fn(),
    setActiveCampaign: vi.fn(),
    store,
    subscribeStatus: () => subscribeStatus,
    supabaseClient,
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

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/components/chat/ChatInputAdapter', () => ({
  ChatInput: ({ campaignModelStrategy }: { campaignModelStrategy?: string | null }) => (
    <div>
      <span data-testid="campaign-model-strategy">{campaignModelStrategy ?? 'none'}</span>
      <textarea aria-label="Composer" />
    </div>
  ),
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
  reportTeamError: mocks.reportTeamError,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string | null }) => unknown) =>
    selector({ activeOrgId: null }),
}))

vi.mock('@/lib/chat/campaign-mode-adapter', () => ({
  useCampaignMode: () => ({
    setActiveCampaign: mocks.setActiveCampaign,
    isPanelMinimized: true,
    expandPanel: mocks.expandPanel,
    activeCampaignName: 'Launch Campaign',
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

vi.mock('./agent-chat-panel/AgentChatSetupGate', () => ({
  AgentChatSetupGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./agent-chat-panel/AgentChatThread', () => ({
  AgentChatThread: ({ composerInput }: { composerInput: React.ReactNode }) => (
    <section data-testid="agent-chat-thread">{composerInput}</section>
  ),
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

const campaign = {
  id: 'campaign-1',
  user_id: 'user-1',
  name: 'Launch Campaign',
  campaign_type: 'launch',
  status: 'active',
  config: { icon: 'rocket' },
  metrics: {},
  created_at: '2026-06-24T00:00:00.000Z',
  updated_at: '2026-06-24T00:10:00.000Z',
}

const conversation = {
  id: 'conversation-1',
  user_id: 'user-1',
  campaign_id: 'campaign-1',
  title: 'Launch planning',
  agent_id: 'agent-alpha',
  status: 'active',
  metadata: {},
  created_at: '2026-06-24T00:00:00.000Z',
  updated_at: '2026-06-24T00:10:00.000Z',
}

describe('AgentChatPanel campaign controller', () => {
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
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mocks.fetchCampaign.mockResolvedValue({
      ...campaign,
      config: { agent_settings: { model_strategy: 'strategy-pro' } },
    })
    mocks.fetchConversations.mockResolvedValue([conversation])
    mocks.fetchMessages.mockResolvedValue([])
    mocks.realtimeHandlers.splice(0)
    delete window.__vibey_pending_artifact_open
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    window.localStorage.clear()
    window.sessionStorage.clear()
    delete window.__vibey_pending_artifact_open
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('syncs campaign mode, subscribes for artifacts, opens artifact previews, and settles without render loops', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onAgentInfoOpenChange = vi.fn()
    const onCampaignPanelOpenChange = vi.fn()
    let commits = 0

    try {
      render(
        <Profiler id="agent-chat-panel-campaign" onRender={() => commits++}>
          <AgentChatPanel
            agent={buildAgent()}
            modelId="auto"
            nonGeneralCampaigns={[campaign]}
            campaignPanelOpen
            agentInfoOpen
            onAgentInfoOpenChange={onAgentInfoOpenChange}
            onCampaignPanelOpenChange={onCampaignPanelOpenChange}
          />
        </Profiler>,
      )

      await waitFor(() =>
        expect(mocks.setActiveCampaign).toHaveBeenCalledWith(
          'campaign-1',
          'Launch Campaign',
          'rocket',
        ),
      )
      await waitFor(() => expect(mocks.fetchCampaign).toHaveBeenCalledWith('campaign-1'))
      await waitFor(() =>
        expect(screen.getByTestId('campaign-model-strategy').textContent).toBe('strategy-pro'),
      )
      await waitFor(() =>
        expect(mocks.supabaseClient.channel).toHaveBeenCalledWith(
          'team-new-artifacts:campaign-1',
        ),
      )

      const offerInsert = mocks.realtimeHandlers.find(
        (handler) =>
          handler.config.table === 'offers' &&
          handler.config.filter === 'campaign_id=eq.campaign-1',
      )
      expect(offerInsert).toBeTruthy()
      act(() => {
        offerInsert?.callback({ new: { id: 'offer-1' } })
      })

      expect(mocks.store.addNewArtifactId).toHaveBeenCalledWith('offer-offer-1')
      expect(mocks.expandPanel).toHaveBeenCalledWith('artifacts')
      expect(onCampaignPanelOpenChange).toHaveBeenCalledWith(false)

      act(() => {
        window.dispatchEvent(
          new CustomEvent('vibey-open-artifact', {
            detail: {
              artifactType: 'offer',
              artifactId: 'offer-1',
              name: 'Offer One',
            },
          }),
        )
      })

      expect(window.__vibey_pending_artifact_open).toEqual({
        kind: 'simple',
        type: 'offer',
        id: 'offer-1',
        name: 'Offer One',
      })
      expect(onAgentInfoOpenChange).toHaveBeenCalledWith(false)
      expect(onCampaignPanelOpenChange).toHaveBeenCalledWith(true)

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
