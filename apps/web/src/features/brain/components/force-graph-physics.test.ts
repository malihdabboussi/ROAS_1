import { describe, expect, it } from 'vitest'
import type { BrainMemory } from '../types'
import { applyForceGraphPhysics } from './force-graph-physics'
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

function node(overrides: Partial<SimNode>): SimNode {
  return {
    id: 'node',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 4,
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

describe('applyForceGraphPhysics', () => {
  it('applies repulsion, center gravity, damping, and alpha decay', () => {
    const a = node({ id: 'a', x: -100 })
    const b = node({ id: 'b', x: 100 })
    const nodes = [a, b]

    const nextAlpha = applyForceGraphPhysics({
      alpha: 1,
      edges: [],
      nodeMap: new Map(nodes.map((n) => [n.id, n])),
      nodes,
    })

    expect(nextAlpha).toBeCloseTo(0.97)
    expect(a.vx).toBeCloseTo(0.007)
    expect(b.vx).toBeCloseTo(-0.007)
    expect(a.x).toBeCloseTo(-99.993)
    expect(b.x).toBeCloseTo(99.993)
  })

  it('keeps pinned nodes fixed while allowing connected unpinned nodes to move', () => {
    const pinned = node({ id: 'pinned', pinned: true, vx: 2, vy: -2 })
    const free = node({ id: 'free', x: 200 })
    const nodes = [pinned, free]
    const edges: SimEdge[] = [
      {
        source: 'pinned',
        target: 'free',
        color: '--brain-conn-related-to-rgb',
        resolvedRgb: '100, 116, 139',
        strength: 1,
        type: 'related_to',
      },
    ]

    applyForceGraphPhysics({
      alpha: 1,
      edges,
      nodeMap: new Map(nodes.map((n) => [n.id, n])),
      nodes,
    })

    expect(pinned.x).toBe(0)
    expect(pinned.y).toBe(0)
    expect(pinned.vx).toBe(0)
    expect(pinned.vy).toBe(0)
    expect(free.x).not.toBe(200)
  })

  it('resets non-finite coordinates instead of carrying invalid simulation state', () => {
    const invalid = node({ id: 'invalid', x: Number.POSITIVE_INFINITY, y: 12 })

    applyForceGraphPhysics({
      alpha: 1,
      edges: [],
      nodeMap: new Map([[invalid.id, invalid]]),
      nodes: [invalid],
    })

    expect(invalid.x).toBe(0)
    expect(invalid.y).toBe(0)
    expect(invalid.vx).toBe(0)
    expect(invalid.vy).toBe(0)
  })
})
