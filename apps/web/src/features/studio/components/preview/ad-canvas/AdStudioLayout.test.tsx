import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdStudioLayout, type AdStudioLayoutProps } from './AdStudioLayout'
import type { Ad } from '@/features/studio/types'

const adCanvasMocks = vi.hoisted(() => {
  const baseNode = {
    id: 'brief-node',
    type: 'brief',
    position: { x: 20, y: 40 },
    data: {
      canvas_node_id: 'brief-node',
      kind: 'brief',
      status: 'ready',
      parent_node_id: null,
      parent_image_node_id: null,
      ad_id: null,
      image_asset_id: null,
      payload: {
        audience: 'Founders',
        offer: 'Book a demo',
        brand_guidelines: 'Use direct language',
      },
    },
  }

  const graph = {
    loading: false,
    error: null as string | null,
    canvasId: 'canvas-1',
    defaultModelId: 'gemini-3-pro-image-preview',
    nodes: [baseNode],
    edges: [],
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    scheduleSaveLayout: vi.fn(),
    load: vi.fn(),
    addNode: vi.fn(async (input: { kind: string; parent_node_id?: string | null }) => ({
      id: `${input.kind}-node`,
      canvas_id: 'canvas-1',
      kind: input.kind,
      status: 'ready',
      parent_node_id: input.parent_node_id ?? null,
      parent_image_node_id: null,
      ad_id: null,
      image_asset_id: null,
      payload: {},
      position_x: 100,
      position_y: 100,
    })),
    addEdge: vi.fn(),
    patchNode: vi.fn(async (nodeId: string, input: Record<string, unknown>) => ({
      id: nodeId,
      canvas_id: 'canvas-1',
      kind: 'brief',
      status: input.status ?? 'ready',
      parent_node_id: null,
      parent_image_node_id: null,
      ad_id: null,
      image_asset_id: null,
      payload: input.payload ?? {},
      position_x: 20,
      position_y: 40,
    })),
    removeNode: vi.fn(),
    updateNodeData: vi.fn(),
    selectNode: vi.fn(),
    selectedNode: baseNode,
  }

  const runAction = vi.fn(async () => ({
    id: 'brief-node',
    status: 'ready',
    payload: { prompt: 'generated' },
    image_asset_id: 'asset-1',
  }))

  return {
    graph,
    agents: [
      {
        agentKey: 'atlas',
        displayName: 'Atlas',
        description: 'Creative strategist',
      },
    ],
    runAction,
    reset() {
      graph.loading = false
      graph.error = null
      graph.canvasId = 'canvas-1'
      graph.nodes = [baseNode]
      graph.edges = []
      graph.selectedNode = baseNode
      for (const value of Object.values(graph)) {
        if (typeof value === 'function' && 'mockClear' in value) value.mockClear()
      }
      runAction.mockClear()
    },
  }
})

const tabsMock = vi.hoisted(() => ({
  onValueChange: undefined as ((value: string) => void) | undefined,
}))

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="react-flow-provider">{children}</div>
  ),
}))

vi.mock('@vibey/api-shared/ad-strategies', () => ({
  AD_STRATEGIES: [
    { key: 'problem-solution', name: 'Problem Solution' },
    { key: 'social-proof', name: 'Social Proof' },
    { key: 'urgency', name: 'Urgency' },
    { key: 'authority', name: 'Authority' },
  ],
}))

vi.mock('@vibey/api-shared/image-models', () => ({
  DEFAULT_IMAGE_MODEL_ID: 'gemini-3-pro-image-preview',
  IMAGE_MODELS: [],
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div data-testid="loading-orb">{text}</div>,
}))

vi.mock('@/components/ui/navigation/tabs', () => ({
  Tabs: ({
    children,
    onValueChange,
    value,
  }: {
    children: ReactNode
    onValueChange?: (value: string) => void
    value?: string
  }) => {
    tabsMock.onValueChange = onValueChange
    return <div data-value={value}>{children}</div>
  },
  TabsList: ({ children }: { children: ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => (
    <button type="button" role="tab" onClick={() => tabsMock.onValueChange?.(value)}>
      {children}
    </button>
  ),
}))

vi.mock('@/features/studio/components/preview/artifacts/preview/animated-artifact-title', () => ({
  AnimatedArtifactTitle: ({ text, className }: { text: string; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}))

vi.mock('./AdCanvas', () => ({
  AdCanvas: (props: { nodes: unknown[]; error: string | null; onNodeSelect: (id: string) => void }) => (
    <div data-testid="ad-canvas" data-node-count={props.nodes.length} data-error={props.error ?? ''}>
      <button type="button" onClick={() => props.onNodeSelect('brief-node')}>
        Select node
      </button>
    </div>
  ),
}))

vi.mock('./components/AdCanvasInspector', () => ({
  AdCanvasInspector: (props: {
    open: boolean
    onToggle: () => void
    agentKey: string
    onRunAction: (nodeId: string, action: 'generate') => void
    onPayloadChange?: (nodeId: string, payload: Record<string, unknown>) => void
  }) => (
    <aside
      data-testid="ad-canvas-inspector"
      data-open={String(props.open)}
      data-agent-key={props.agentKey}
    >
      <button type="button" onClick={props.onToggle}>
        Toggle inspector
      </button>
      <button
        type="button"
        onClick={() => props.onPayloadChange?.('brief-node', { prompt: 'updated prompt' })}
      >
        Change payload
      </button>
      <button type="button" onClick={() => props.onRunAction('brief-node', 'generate')}>
        Run node
      </button>
    </aside>
  ),
}))

vi.mock('./hooks/useAdCanvasGraph', () => ({
  useAdCanvasGraph: () => adCanvasMocks.graph,
}))

vi.mock('./hooks/useCampaignCanvasAgents', () => ({
  useCampaignCanvasAgents: () => ({ agents: adCanvasMocks.agents, loading: false }),
}))

vi.mock('./hooks/useNodeAction', () => ({
  useNodeAction: () => ({ runAction: adCanvasMocks.runAction }),
}))

function buildAd(): Ad {
  return {
    id: 'ad-1',
    headline: 'Launch headline',
    primary_text: 'Primary text',
    description: 'Description',
    campaign_id: 'campaign-1',
    ad_set_id: 'ad-set-1',
    platform: 'facebook',
    placement: 'feed',
    placement_images: {},
    updated_at: '2026-06-30T00:00:00.000Z',
  } as unknown as Ad
}

function renderLayout(overrides: Partial<AdStudioLayoutProps> = {}) {
  const props: AdStudioLayoutProps = {
    adSetId: 'ad-set-1',
    campaignId: 'campaign-1',
    adId: 'ad-1',
    adTitle: 'Launch ad',
    initialAd: buildAd(),
    onAdUpdated: vi.fn(),
    platform: 'facebook',
    onPlatformChange: vi.fn(),
    placement: 'feed',
    onPlacementChange: vi.fn(),
    ...overrides,
  }

  return {
    props,
    ...render(<AdStudioLayout {...props} />),
  }
}

afterEach(() => {
  cleanup()
  adCanvasMocks.reset()
})

describe('AdStudioLayout', () => {
  it('renders the creative canvas header controls and forwards host refs', () => {
    const onPlatformChange = vi.fn()
    const onPlacementChange = vi.fn()
    const onPublishHostEl = vi.fn()
    const onRefreshHostEl = vi.fn()

    renderLayout({
      onPlatformChange,
      onPlacementChange,
      onPublishHostEl,
      onRefreshHostEl,
      headerLeading: <span data-testid="header-leading">Back</span>,
      headerTrailing: <span data-testid="header-trailing">Actions</span>,
    })

    expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument()
    expect(screen.getByTestId('header-leading')).toBeInTheDocument()
    expect(screen.getByText('Launch ad')).toBeInTheDocument()
    expect(screen.getByTestId('header-trailing')).toBeInTheDocument()
    expect(screen.getByTestId('ad-canvas')).toHaveAttribute('data-node-count', '1')
    expect(screen.getByTestId('ad-canvas-inspector')).toHaveAttribute('data-open', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    expect(onPlatformChange).toHaveBeenCalledWith('instagram')

    fireEvent.click(screen.getByRole('tab', { name: 'Story' }))
    expect(onPlacementChange).toHaveBeenCalledWith('story')

    expect(onPublishHostEl).toHaveBeenCalledWith(expect.any(HTMLDivElement))
    expect(onRefreshHostEl).toHaveBeenCalledWith(expect.any(HTMLDivElement))
  })

  it('settles agent selection and rerenders without repeated state churn', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { props, rerender } = renderLayout()

    await waitFor(() => {
      expect(screen.getByTestId('ad-canvas-inspector')).toHaveAttribute('data-agent-key', 'atlas')
    })

    rerender(<AdStudioLayout {...props} adTitle="Updated ad title" />)
    expect(await screen.findByText('Updated ad title')).toBeInTheDocument()

    const consoleMessages = consoleError.mock.calls.flat().join('\n')
    expect(consoleMessages).not.toContain('Maximum update depth exceeded')
    expect(consoleMessages).not.toContain('Too many re-renders')
    consoleError.mockRestore()
  })

  it('keeps the loading branch mounted while the graph loads', () => {
    adCanvasMocks.graph.loading = true

    renderLayout()

    expect(screen.getByTestId('loading-orb')).toHaveTextContent('Loading creative canvas...')
    expect(screen.queryByTestId('ad-canvas')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ad-canvas-inspector')).not.toBeInTheDocument()
  })
})
