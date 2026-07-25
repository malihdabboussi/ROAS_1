import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BrainConnection, BrainMemory } from '../types'
import { BrainVisualizationCanvasStage } from './BrainVisualizationCanvasStage'

const mocks = vi.hoisted(() => ({
  forceGraphProps: vi.fn(),
}))

vi.mock('./ForceGraph', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function ForceGraphMock(
      props: {
        nodes: BrainMemory[]
        onNodeClick: (node: BrainMemory | null) => void
      },
      ref,
    ) {
      mocks.forceGraphProps(props)
      React.useImperativeHandle(ref, () => ({
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
        fit: vi.fn(),
        center: vi.fn(),
        organize: vi.fn(),
      }))
      return (
        <div data-testid="force-graph">
          <button type="button" onClick={() => props.onNodeClick(props.nodes[0] ?? null)}>
            Select graph node
          </button>
        </div>
      )
    }),
  }
})

const graphNode: BrainMemory = {
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
}

const graphConnection: BrainConnection = {
  id: 'connection-1',
  source_memory_id: 'memory-1',
  target_memory_id: 'memory-2',
  relationship_type: 'related_to',
  strength: 0.75,
}

function renderCanvasStage(
  overrides: Partial<Parameters<typeof BrainVisualizationCanvasStage>[0]> = {},
) {
  const props: Parameters<typeof BrainVisualizationCanvasStage>[0] = {
    activeLoading: false,
    connections: [graphConnection],
    error: null,
    graphRef: { current: null },
    hasActiveGraphData: true,
    nodes: [graphNode],
    nodesMonochrome: false,
    onNodeClick: vi.fn(),
    onRetry: vi.fn(),
    searchQuery: '',
    selectedNodeId: null,
    viewportKey: 'user',
    ...overrides,
  }

  return {
    ...render(<BrainVisualizationCanvasStage {...props} />),
    props,
  }
}

describe('BrainVisualizationCanvasStage', () => {
  it('shows a retryable canvas error only when graph data is missing', () => {
    const onRetry = vi.fn()

    renderCanvasStage({
      error: 'Brain graph failed',
      hasActiveGraphData: false,
      onRetry,
    })

    expect(screen.getByText('Brain graph failed')).toBeTruthy()
    expect(screen.queryByTestId('force-graph')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the constellation placeholder only while loading without graph data', () => {
    renderCanvasStage({
      activeLoading: true,
      hasActiveGraphData: false,
    })

    expect(screen.getByRole('img', { name: 'Loading Brain…' })).toBeTruthy()
    expect(screen.queryByTestId('force-graph')).toBeNull()
  })

  it('keeps rendering the graph when data exists and delegates node selection', () => {
    const onNodeClick = vi.fn()

    renderCanvasStage({
      error: 'Stale graph warning',
      hasActiveGraphData: true,
      nodesMonochrome: true,
      onNodeClick,
      searchQuery: 'launch',
      selectedNodeId: 'memory-1',
      viewportKey: 'customer',
    })

    expect(screen.getByTestId('force-graph')).toBeTruthy()
    expect(mocks.forceGraphProps).toHaveBeenCalledWith(
      expect.objectContaining({
        connections: [graphConnection],
        nodes: [graphNode],
        nodesMonochrome: true,
        searchQuery: 'launch',
        selectedNodeId: 'memory-1',
        viewportKey: 'customer',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select graph node' }))

    expect(onNodeClick).toHaveBeenCalledWith(graphNode)
  })
})
