import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrainMemory } from '../types'
import { drawForceGraphFrame, type ForceGraphMonoSpotCache } from './force-graph-renderer'
import type { SimEdge, SimNode } from './force-graph.types'

const memory: BrainMemory = {
  id: 'memory-1',
  content: 'Memory',
  memory_type: 'fact',
  source_type: 'conversation',
  significance: 0.5,
  confidence: 0.9,
  tags: [],
  recalled_count: 0,
  created_at: '2026-06-24T10:00:00.000Z',
  updated_at: '2026-06-24T10:00:00.000Z',
  node_type: 'memory',
}

function createMockContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() }
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    fill: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D
}

function node(overrides: Partial<SimNode>): SimNode {
  return {
    id: 'node',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 8,
    color: '--brain-fact-rgb',
    resolvedRgb: '100, 116, 139',
    label: 'Memory',
    nodeType: 'memory',
    memoryType: 'fact',
    significance: 0.5,
    createdAt: '2026-06-24T10:00:00.000Z',
    ageOpacity: 1,
    isNew: false,
    memory,
    highlighted: false,
    pinned: false,
    ...overrides,
  }
}

function edge(source = 'a', target = 'b'): SimEdge {
  return {
    source,
    target,
    color: '--brain-conn-related-to-rgb',
    resolvedRgb: '100, 116, 139',
    strength: 0.8,
    type: 'related_to',
  }
}

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('drawForceGraphFrame', () => {
  it('draws the grid, visible edges, nodes, and media badge in normal color mode', () => {
    document.documentElement.classList.add('dark')
    const ctx = createMockContext()
    const nodes = [node({ id: 'a', mediaType: 'image' }), node({ id: 'b', x: 80 })]
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    const result = drawForceGraphFrame({
      ctx,
      edges: [edge()],
      height: 200,
      hoveredNodeId: null,
      monoGlow: 0.5,
      monoSpotCache: { centerId: 'a', ids: new Set(['a']) },
      nodeMap,
      nodes,
      nodesMonochrome: false,
      nowMs: 0,
      pan: { x: 0, y: 0 },
      selectedNodeId: null,
      width: 300,
      zoom: 1,
    })

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 300, 200)
    expect(ctx.translate).toHaveBeenCalledWith(150, 100)
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalledWith('I', expect.any(Number), expect.any(Number))
    expect(ctx.restore).toHaveBeenCalled()
    expect(result.monoGlow).toBe(0)
    expect(result.monoSpotCache).toBeNull()
  })

  it('locks monochrome spotlight to the selected node and includes connected nodes', () => {
    document.documentElement.classList.add('dark')
    const ctx = createMockContext()
    const nodes = [node({ id: 'a' }), node({ id: 'b', x: 80 })]
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    const result = drawForceGraphFrame({
      ctx,
      edges: [edge()],
      height: 200,
      hoveredNodeId: null,
      monoGlow: 0.25,
      monoSpotCache: null,
      nodeMap,
      nodes,
      nodesMonochrome: true,
      nowMs: 0,
      pan: { x: 0, y: 0 },
      selectedNodeId: 'a',
      width: 300,
      zoom: 1,
    })

    expect(result.monoGlow).toBe(1)
    expect(result.monoSpotCache?.centerId).toBe('a')
    expect(result.monoSpotCache?.ids.has('a')).toBe(true)
    expect(result.monoSpotCache?.ids.has('b')).toBe(true)
  })

  it('fades out and clears stale monochrome spotlight cache below the visibility threshold', () => {
    const ctx = createMockContext()
    const staleCache: ForceGraphMonoSpotCache = { centerId: 'a', ids: new Set(['a']) }

    const result = drawForceGraphFrame({
      ctx,
      edges: [],
      height: 200,
      hoveredNodeId: null,
      monoGlow: 0.01,
      monoSpotCache: staleCache,
      nodeMap: new Map(),
      nodes: [],
      nodesMonochrome: true,
      nowMs: 0,
      pan: { x: 0, y: 0 },
      selectedNodeId: null,
      width: 300,
      zoom: 1,
    })

    expect(result.monoGlow).toBe(0)
    expect(result.monoSpotCache).toBeNull()
  })
})
