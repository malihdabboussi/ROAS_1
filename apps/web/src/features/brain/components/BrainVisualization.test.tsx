import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BrainVisualization from './BrainVisualization'

const mocks = vi.hoisted(() => ({
  backfillBrainScholar: vi.fn(),
  fetchBrainImageSearch: vi.fn(),
  fetchBrainSearch: vi.fn(),
  fetchCampaignKnowledgeGraph: vi.fn(),
  fetchCampaignKnowledgeRollupGraph: vi.fn(),
  fetchMissionAgents: vi.fn(),
  reloadScopeNav: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  searchParams: new URLSearchParams('scope=user'),
  useBrainStore: vi.fn(),
}))

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="dynamic-import" />,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace,
  }),
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/components/org', () => ({
  ShareButton: ({ resourceId }: { resourceId: string }) => (
    <button type="button" aria-label={`Share ${resourceId}`}>
      Share
    </button>
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div data-testid="loading-orb">{text}</div>,
}))

vi.mock('@/lib/agents', () => ({
  backfillBrainScholar: mocks.backfillBrainScholar,
  fetchMissionAgents: mocks.fetchMissionAgents,
}))

vi.mock('@/components/reporting', () => ({
  REPORTING_DATE_RANGE_PRESETS: [
    { key: '24h', label: 'Last 24 hours' },
    { key: '7d', label: 'Last 7 days' },
    { key: 'all', label: 'All time' },
  ],
  ViewDateRangeMonthCalendar: () => <div data-testid="date-calendar">Calendar</div>,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaignKnowledgeGraph: mocks.fetchCampaignKnowledgeGraph,
  searchCampaignKnowledge: vi.fn(),
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { isOrgContext: () => boolean }) => unknown) =>
    selector({ isOrgContext: () => false }),
}))

vi.mock('../hooks/use-brain-health-realtime', () => ({
  useBrainHealthRealtime: vi.fn(),
}))

vi.mock('../hooks/use-brain-queue', () => ({
  useBrainQueue: () => ({
    jobs: [],
    cancel: vi.fn(),
    retry: vi.fn(),
    dismiss: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('../hooks/use-brain-realtime', () => ({
  useBrainRealtime: vi.fn(),
}))

vi.mock('../hooks/use-brain-scope-nav-options', () => ({
  useBrainScopeNavOptions: () => ({
    scopeOptions: [
      {
        id: 'user',
        label: 'Your Brain',
        agentId: null,
        brainId: 'brain-user',
        scopeType: 'user',
      },
    ],
    loading: false,
    resolved: true,
    reload: mocks.reloadScopeNav,
  }),
}))

vi.mock('../services/brain.service', () => ({
  fetchBrainImageSearch: mocks.fetchBrainImageSearch,
  fetchBrainSearch: mocks.fetchBrainSearch,
}))

vi.mock('../services/knowledge-graph.service', () => ({
  fetchCampaignKnowledgeRollupGraph: mocks.fetchCampaignKnowledgeRollupGraph,
}))

vi.mock('../store/use-brain-store', () => ({
  useBrainStore: mocks.useBrainStore,
}))

vi.mock('./BrainProcessingQueue', () => ({
  default: () => <div data-testid="brain-processing-queue" />,
}))

vi.mock('./BrainScopeBreadcrumb', () => ({
  BrainScopeBreadcrumb: ({ scope }: { scope?: { label?: string } }) => (
    <div data-testid="brain-scope-breadcrumb">{scope?.label}</div>
  ),
}))

vi.mock('./BrainStats', () => ({
  default: ({ queueCount }: { queueCount: number }) => (
    <div data-testid="brain-stats">queue:{queueCount}</div>
  ),
}))

vi.mock('./CampaignAddInfoPanel', () => ({
  default: () => <div data-testid="campaign-add-info" />,
}))

vi.mock('./CortexMaxIcon', () => ({
  CortexMaxIcon: () => <span data-testid="cortex-max-icon" />,
}))

vi.mock('./CortexMaxModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Cortex modal</div> : null),
}))

vi.mock('./CrystallizeBrainModal', () => ({
  CrystallizeBrainModal: ({ open }: { open: boolean }) =>
    open ? <div>Crystallize modal</div> : null,
}))

vi.mock('./CustomerAddInfoPanel', () => ({
  default: () => <div data-testid="customer-add-info" />,
}))

vi.mock('./ForceGraph', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function ForceGraphMock(
      { nodes }: { nodes: Array<{ id: string }> },
      ref,
    ) {
      React.useImperativeHandle(ref, () => ({
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
        center: vi.fn(),
        organize: vi.fn(),
      }))
      return <div data-testid="force-graph">nodes:{nodes.length}</div>
    }),
  }
})

vi.mock('./LegendPanel', () => ({
  default: () => <div data-testid="legend-panel" />,
}))

vi.mock('./MemoryPanel', () => ({
  default: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="memory-panel" /> : null,
}))

vi.mock('./NavControls', () => ({
  default: () => <div data-testid="nav-controls" />,
}))

vi.mock('./NodeDetailModal', () => ({
  default: () => <div data-testid="node-detail-modal" />,
}))

vi.mock('./UserAddInfoPanel', () => ({
  default: () => <div data-testid="user-add-info" />,
}))

function createBrainStoreState() {
  return {
    graphData: {
      nodes: [
        {
          id: 'memory-1',
          content: 'Launch memory',
          memory_type: 'fact',
          source_type: 'note',
          significance: 0.8,
          confidence: 1,
          tags: [],
          recalled_count: 0,
          created_at: '2026-06-01T00:00:00.000Z',
          updated_at: '2026-06-02T00:00:00.000Z',
          node_type: 'memory',
          name: 'Launch memory',
        },
      ],
      connections: [],
      stats: {
        total_memories: 1,
        total_experiences: 0,
        total_connections: 0,
        by_type: { fact: 1 },
        hub_nodes: [],
      },
    },
    healthData: {
      status: 'ok',
      total_memories: 1,
      total_connections: 0,
      embedding_queue: 0,
      last_capture: '2026-06-02T00:00:00.000Z',
      last_recall: null,
      memory_counts_by_type: { fact: 1 },
      sk_entries_by_type: {},
      connections_by_type: {},
      experience_sources: 0,
    },
    beliefs: [],
    perspectives: [],
    loading: false,
    error: null,
    searchQuery: '',
    selectedNode: null,
    loadGraph: vi.fn(),
    loadHealth: vi.fn(),
    loadCognition: vi.fn(),
    loadCustomerAvatars: vi.fn(),
    clearActiveScope: vi.fn(),
    selectNode: vi.fn(),
    memoryPanelOpen: false,
    setMemoryPanelOpen: vi.fn(),
    setSearchQuery: vi.fn(),
  }
}

function renderBrainVisualization() {
  let commitCount = 0
  const view = render(
    <Profiler id="brain-visualization" onRender={() => commitCount++}>
      <BrainVisualization />
    </Profiler>,
  )
  return { ...view, getCommitCount: () => commitCount }
}

describe('BrainVisualization', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams('scope=user')
    mocks.fetchMissionAgents.mockResolvedValue([
      {
        id: 'agent-atlas',
        agent_key: 'atlas',
        name: 'Atlas',
        role: 'Brain Scholar',
        status: 'online',
        skills: [],
        image_url: null,
        created_at: '2026-06-24T00:00:00.000Z',
        updated_at: '2026-06-24T00:00:00.000Z',
      },
    ])
    mocks.backfillBrainScholar.mockResolvedValue({ created: false })
    mocks.fetchBrainSearch.mockResolvedValue([
      {
        id: 'search-1',
        content: 'Apollo memory result',
        memory_type: 'fact',
        source_type: 'note',
        significance: 0.7,
        confidence: 1,
        tags: [],
        recalled_count: 0,
        created_at: '2026-06-03T00:00:00.000Z',
        updated_at: '2026-06-03T00:00:00.000Z',
        node_type: 'memory',
        name: 'Apollo memory result',
      },
    ])
    mocks.useBrainStore.mockReturnValue(createBrainStoreState())
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('mounts the scoped brain shell, searches from the dock, and settles without render loops', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const { container, getCommitCount } = renderBrainVisualization()

      expect(screen.getByTestId('force-graph').textContent).toBe('nodes:1')
      expect(screen.getAllByTestId('brain-scope-breadcrumb')[0]?.textContent).toBe('Your Brain')
      expect(screen.getByRole('button', { name: 'Share brain-user' })).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Talk to Atlas' })).toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'Search' }))
      fireEvent.change(screen.getByLabelText('Search brain'), {
        target: { value: 'apollo' },
      })

      await waitFor(() => {
        expect(mocks.fetchBrainSearch).toHaveBeenCalledWith(
          'apollo',
          15,
          'brain-user',
          undefined,
        )
      })
      expect(await screen.findByText('Apollo memory result')).toBeTruthy()

      const imageFile = new File(['image-bytes'], 'brain.png', { type: 'image/png' })
      const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
      expect(fileInput).toBeTruthy()
      mocks.fetchBrainImageSearch.mockResolvedValueOnce([])
      fireEvent.change(fileInput!, { target: { files: [imageFile] } })

      await waitFor(() => {
        expect(mocks.fetchBrainImageSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            mimeType: 'image/png',
            caption: 'apollo',
            limit: 15,
            brainId: 'brain-user',
            agentId: undefined,
          }),
        )
      })

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(getCommitCount()).toBeLessThan(20)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('opens the created-date filter and keeps the selected preset visible in the dock', async () => {
    const { container } = renderBrainVisualization()
    const dateTrigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')

    expect(dateTrigger).toBeTruthy()
    fireEvent.click(dateTrigger!)

    expect(screen.getByText('Start')).toBeTruthy()
    expect(screen.getByText('End')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))

    expect(screen.getAllByText('Last 7 days').length).toBeGreaterThanOrEqual(1)
  })
})
