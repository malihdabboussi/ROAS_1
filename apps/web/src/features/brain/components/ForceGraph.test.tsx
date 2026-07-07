import { createRef } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ForceGraph, { type ForceGraphHandle } from './ForceGraph'
import type { BrainConnection, BrainMemory } from '../types'

const nodes: BrainMemory[] = [
  {
    id: 'memory-1',
    content: 'Customer feedback drives product decisions',
    memory_type: 'insight',
    source_type: 'conversation',
    significance: 0.85,
    confidence: 0.9,
    tags: [],
    recalled_count: 0,
    created_at: '2026-06-24T10:00:00.000Z',
    updated_at: '2026-06-24T10:00:00.000Z',
    node_type: 'memory',
  },
  {
    id: 'belief-1',
    content: 'Proof beats promises',
    memory_type: 'belief',
    source_type: 'conversation',
    significance: 0.95,
    confidence: 0.88,
    tags: [],
    recalled_count: 0,
    created_at: '2026-06-24T11:00:00.000Z',
    updated_at: '2026-06-24T11:00:00.000Z',
    node_type: 'belief',
    pattern_name: 'Proof beats promises',
    description: 'Buyers trust evidence.',
  },
]

const connections: BrainConnection[] = [
  {
    id: 'connection-1',
    source_memory_id: 'memory-1',
    target_memory_id: 'belief-1',
    relationship_type: 'supports',
    strength: 0.8,
  },
]

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

describe('ForceGraph', () => {
  const originalResizeObserver = globalThis.ResizeObserver

  beforeEach(() => {
    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver
    vi.restoreAllMocks()
  })

  it('mounts the canvas and exposes graph controls without changing selection', () => {
    const onNodeClick = vi.fn()
    const graphRef = createRef<ForceGraphHandle>()

    const view = render(
      <div className="h-64 w-64">
        <ForceGraph
          ref={graphRef}
          nodes={nodes}
          connections={connections}
          selectedNodeId={null}
          searchQuery="proof"
          viewportKey="force-graph-test"
          onNodeClick={onNodeClick}
        />
      </div>,
    )

    expect(view.container.querySelector('canvas')).toBeTruthy()
    expect(graphRef.current).toBeTruthy()
    graphRef.current?.zoomIn()
    graphRef.current?.zoomOut()
    graphRef.current?.center()
    graphRef.current?.fit()
    graphRef.current?.organize('significance')
    expect(onNodeClick).not.toHaveBeenCalled()
  })

  it('clears selection when clicking empty canvas space', () => {
    const onNodeClick = vi.fn()

    const view = render(
      <div className="h-64 w-64">
        <ForceGraph
          nodes={[]}
          connections={[]}
          selectedNodeId="memory-1"
          searchQuery=""
          viewportKey="force-graph-empty-click-test"
          onNodeClick={onNodeClick}
        />
      </div>,
    )
    const canvas = view.container.querySelector('canvas')
    expect(canvas).toBeTruthy()
    vi.spyOn(canvas!, 'getBoundingClientRect').mockReturnValue({
      bottom: 256,
      height: 256,
      left: 0,
      right: 256,
      top: 0,
      width: 256,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(canvas!, { clientX: 24, clientY: 24 })
    fireEvent.mouseUp(canvas!, { clientX: 24, clientY: 24 })

    expect(onNodeClick).toHaveBeenCalledWith(null)
  })
})
