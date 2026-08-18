import { Profiler, type ReactNode } from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { useOrgStore, type OrgMembership } from '@/lib/org'
import { TeamHrSideChatPanel } from './TeamHrSideChatPanel'

vi.mock('next/navigation', () => ({
  usePathname: () => '/flows',
}))

vi.mock('@/components/chat', () => ({
  ChatPanelSlideStack: ({ chatPanel, subPanel }: { chatPanel: ReactNode; subPanel: ReactNode }) => (
    <div>
      {chatPanel}
      {subPanel}
    </div>
  ),
  ChatTurnChangeDivider: () => null,
  ComposerInputStack: ({ children, topSlot }: { children: ReactNode; topSlot?: ReactNode }) => (
    <div data-testid="composer-input-stack">
      {topSlot}
      {children}
    </div>
  ),
  MessageQueue: () => null,
  PlanStickyTracker: () => null,
}))

vi.mock('@/components/conversations', () => ({
  ConversationShareModal: () => null,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <div data-testid="loading-orb">loading</div>,
}))

vi.mock('@/components/conversations/SpaceConversationsListAdapter', () => ({
  SpaceConversationsList: () => <div data-testid="conversations-list" />,
}))

vi.mock('@/components/chat/RateLimitCardAdapter', () => ({
  RateLimitCard: () => null,
}))

vi.mock('@/components/chat/StatusIndicatorAdapter', () => ({
  StatusIndicator: () => null,
}))

vi.mock('@/components/chat/StreamInterruptedBarAdapter', () => ({
  StreamInterruptedBar: () => null,
}))

vi.mock('@/components/chat/ChatInputAdapter', () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}))

vi.mock('@/components/chat/MessageBubbleAdapter', () => ({
  MessageBubble: () => <div data-testid="message-bubble" />,
}))

vi.mock('@/lib/conversations', () => ({
  assignConversationCampaign: vi.fn(),
  createNewConversation: vi.fn(),
  deleteConversation: vi.fn(),
  fetchConversations: vi.fn().mockResolvedValue([]),
  renameConversation: vi.fn(),
  setConversationArchived: vi.fn(),
  setConversationPinned: vi.fn(),
}))

vi.mock('@/lib/chat/studio-chat-runtime-adapter', () => ({
  deleteMessagesFrom: vi.fn(),
  duplicateConversation: vi.fn(),
  fetchMessages: vi.fn().mockResolvedValue([]),
  initStreamResilience: vi.fn(),
  needsStreamRecovery: vi.fn().mockReturnValue(false),
  recoverConversation: vi.fn(),
  requestStopStream: vi.fn(),
  selectConversation: vi.fn(),
  sendMessageStreaming: vi.fn(),
  suggestConversationTitle: vi.fn(),
  useChatStore: chatStoreMock.useChatStore,
}))

const chatStoreMock = vi.hoisted(() => {
  const state = {
    isLoadingMessages: false,
    streamingMessageIdsByConversation: {},
    streamingConversationIds: [],
    stoppingConversationIds: [],
    creditsLow: false,
    creditsLowRemaining: null,
    creditsExhausted: false,
    messageQueueByConversation: {},
    messagesByConversation: {},
    conversations: [],
    enqueueMessage: vi.fn(),
    dequeueMessage: vi.fn(),
    removeQueueItem: vi.fn(),
    updateQueueItem: vi.fn(),
    addConversation: vi.fn(),
    setMessages: vi.fn(),
    setActiveConversationId: vi.fn(),
    updateConversation: vi.fn(),
    removeConversation: vi.fn(),
    setCreditsExhausted: vi.fn(),
  }
  return {
    useChatStore: Object.assign(
      (selector: (nextState: typeof state) => unknown) => selector(state),
      { getState: () => state },
    ),
  }
})

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, loader: () => Promise<unknown>) => loader()),
}))

vi.mock('@/lib/utils/open-in-new-tab', () => ({
  openInNewTab: vi.fn(),
}))

vi.mock('../../store/use-team-focus-store', () => ({
  useTeamFocusStore: Object.assign(
    (
      selector: (state: {
        focusedAgent: null
        page: null
        agentsContext: null
        skillsContext: null
      }) => unknown,
    ) => selector({ focusedAgent: null, page: null, agentsContext: null, skillsContext: null }),
    {
      getState: () => ({
        focusedAgent: null,
        page: null,
        agentsContext: null,
        skillsContext: null,
      }),
    },
  ),
}))

vi.mock('../checkpoints/AgentCheckpointsPanel', () => ({
  AgentCheckpointsSidebar: () => null,
}))

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const backendGetMock = vi.mocked(backendGet)

function membership(overrides: Partial<OrgMembership> = {}): OrgMembership {
  const orgId = overrides.org_id ?? 'org-1'
  return {
    id: `membership-${orgId}`,
    role: 'admin',
    status: 'active',
    org_id: orgId,
    organizations: {
      id: orgId,
      name: 'Acme Workspace',
      slug: 'acme',
      avatar_url: null,
      account_type: 'workspace',
      status: 'active',
    },
    ...overrides,
  }
}

function resetOrgStore() {
  useOrgStore.setState({
    activeOrgId: null,
    actualRole: null,
    myRole: null,
    roleOverride: null,
    memberships: [],
    isLoaded: false,
    isOrgOnly: false,
  })
}

describe('TeamHrSideChatPanel org roster boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    backendGetMock.mockImplementation((path: string) => {
      if (path === '/api/team-roster?kind=human') {
        return Promise.resolve([
          {
            participant_id: 'human:user-1',
            kind: 'human',
            display_name: 'Ada',
          },
        ])
      }
      if (path === '/api/agents/hr/skills') return Promise.resolve([])
      return Promise.resolve([])
    })
    resetOrgStore()
  })

  afterEach(() => {
    cleanup()
    backendGetMock.mockReset()
    resetOrgStore()
    vi.unstubAllGlobals()
  })

  it('loads the human roster in org context and settles without render churn', async () => {
    useOrgStore.getState().setMemberships([membership()])
    useOrgStore.getState().setActiveOrg('org-1')
    let commitCount = 0

    render(
      <Profiler id="team-hr-side-chat-panel" onRender={() => commitCount++}>
        <TeamHrSideChatPanel agent={null} showCheckpoints={false} />
      </Profiler>,
    )

    await waitFor(() => {
      expect(backendGetMock).toHaveBeenCalledWith('/api/team-roster?kind=human')
    })
    expect(commitCount).toBeLessThan(12)
  })
})
