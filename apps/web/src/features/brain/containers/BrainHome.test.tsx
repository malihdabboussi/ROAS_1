import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BrainHome from './BrainHome'

const mocks = vi.hoisted(() => ({
  fetchBrainHealthBatch: vi.fn(),
  fetchKnowledgeGraphStatsBatch: vi.fn(),
  getMenuContext: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  searchParams: new URLSearchParams(''),
  setWorkContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace,
  }),
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: Object.assign(
    (selector: (state: { setWorkContext: typeof mocks.setWorkContext }) => unknown) =>
      selector({ setWorkContext: mocks.setWorkContext }),
    {
      getState: () => ({ setWorkContext: mocks.setWorkContext }),
    },
  ),
}))

vi.mock('@/components/org', () => ({
  ShareModal: ({ open }: { open: boolean }) => (open ? <div data-testid="share-modal" /> : null),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div data-testid="loading-orb">{text}</div>,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { isOrgContext: () => boolean }) => unknown) =>
    selector({ isOrgContext: () => false }),
}))

vi.mock('@/features/brain/hooks/use-brain-scope-nav-options', () => ({
  useBrainScopeNavOptions: () => ({
    scopeOptions: [
      {
        id: 'user',
        label: 'Your Brain',
        agentId: null,
        brainId: 'brain-user',
        scopeType: 'user',
        imageUrl: null,
      },
      {
        id: 'agent:maya',
        label: 'Maya',
        agentId: 'maya',
        brainId: 'brain-agent-maya',
        scopeType: 'agent',
        imageUrl: null,
      },
    ],
    agentsWithoutBrain: [
      {
        id: 'agent-nora',
        user_id: 'user-1',
        agent_key: 'nora',
        name: 'Nora',
        role: 'Researcher',
        status: 'online',
        skills: [],
        level: 'team',
        image_url: null,
        is_active: true,
        team_id: 'team-1',
        config: {},
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
    ],
    loading: false,
    resolved: true,
    reload: vi.fn(),
  }),
}))

vi.mock('@/features/brain/hooks/use-brain-scope-menu-actions', () => ({
  useBrainScopeMenuActions: () => ({
    getMenuContext: mocks.getMenuContext,
    shareModalProps: null,
  }),
}))

vi.mock('@/features/brain/services/brain.service', () => ({
  fetchBrainHealthBatch: mocks.fetchBrainHealthBatch,
}))

vi.mock('@/features/brain/services/knowledge-graph.service', () => ({
  fetchKnowledgeGraphStatsBatch: mocks.fetchKnowledgeGraphStatsBatch,
}))

vi.mock('../components/CortexMaxModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="cortex-max-modal" /> : null),
}))

function menuContext() {
  return {
    canTrain: true,
    canAddInfo: false,
    canVoice: true,
    canShare: false,
    canAgentChat: false,
    canManageAgent: false,
    canEnableCustomer: false,
    canDisableCustomer: false,
    canChangeImage: false,
    brainId: 'brain-user',
    brainLabel: 'Your Brain',
    scopeId: 'user',
    onCopyLink: vi.fn(),
    onOpenInNewTab: vi.fn(),
    onOpenBrain: vi.fn(),
    onOpenWithAction: vi.fn(),
    onOpenAgentChat: vi.fn(),
    onManageAgent: vi.fn(),
    onShare: vi.fn(),
    onEnableCustomerBrain: vi.fn(),
    onDisableCustomerBrain: vi.fn(),
  }
}

describe('BrainHome', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams('')
    mocks.fetchBrainHealthBatch.mockResolvedValue(
      new Map([
        [
          'brain-user',
          {
            status: 'ok',
            total_memories: 12,
            total_connections: 3,
            embedding_queue: 0,
            last_capture: '2026-06-20T00:00:00.000Z',
            last_recall: null,
          },
        ],
        [
          'brain-agent-maya',
          {
            status: 'ok',
            total_memories: 7,
            total_connections: 2,
            embedding_queue: 0,
            last_capture: '2026-06-21T00:00:00.000Z',
            last_recall: null,
          },
        ],
      ]),
    )
    mocks.fetchKnowledgeGraphStatsBatch.mockResolvedValue({ spaces: {}, campaigns: {} })
    mocks.getMenuContext.mockImplementation(menuContext)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('mounts the Brain fleet page and settles without render churn', async () => {
    const onRender = vi.fn()

    render(
      <Profiler id="BrainHome" onRender={onRender}>
        <BrainHome />
      </Profiler>,
    )

    expect(mocks.setWorkContext).toHaveBeenCalledWith({ surface: 'brain' })
    expect(screen.queryByText('User brains')).not.toBeNull()
    expect(screen.queryByText('Your Brain')).not.toBeNull()
    expect(screen.queryByText('Agent brains')).not.toBeNull()
    expect(screen.queryByText('Maya')).not.toBeNull()

    await waitFor(() => {
      expect(mocks.fetchBrainHealthBatch).toHaveBeenCalledWith(['brain-user', 'brain-agent-maya'])
    })
    expect(mocks.fetchKnowledgeGraphStatsBatch).toHaveBeenCalledWith({ campaignIds: [] })
    expect(onRender.mock.calls.length).toBeLessThan(12)
  })

  it('toggles from list to grid without render churn', async () => {
    const onRender = vi.fn()

    render(
      <Profiler id="BrainHome" onRender={onRender}>
        <BrainHome />
      </Profiler>,
    )

    expect(screen.queryByText('Type')).not.toBeNull()
    const gridButton = screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-pressed') === 'false')
    expect(gridButton).toBeDefined()

    fireEvent.click(gridButton!)

    await waitFor(() => {
      expect(screen.queryByText('Type')).toBeNull()
    })
    expect(screen.queryByText('Add agent brain')).not.toBeNull()
    expect(screen.queryByText('1 agent ready')).not.toBeNull()
    expect(onRender.mock.calls.length).toBeLessThan(18)
  })
})
