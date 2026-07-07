import { describe, expect, it } from 'vitest'
import type { BrainMemory } from '../types'
import { findForceGraphNodeAt, screenToForceGraphWorld } from './force-graph-pointer'
import type { SimNode } from './force-graph.types'

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

describe('force graph pointer helpers', () => {
  it('converts screen coordinates into world coordinates using pan and zoom', () => {
    expect(
      screenToForceGraphWorld({
        pan: { x: 20, y: -10 },
        screenX: 170,
        screenY: 80,
        size: { w: 300, h: 200 },
        zoom: 2,
      }),
    ).toEqual([0, -5])
  })

  it('finds the topmost node under the pointer hit radius', () => {
    const bottom = node({ id: 'bottom', x: 0, y: 0 })
    const top = node({ id: 'top', x: 0, y: 0 })

    const found = findForceGraphNodeAt({
      nodes: [bottom, top],
      pan: { x: 0, y: 0 },
      screenX: 150,
      screenY: 100,
      size: { w: 300, h: 200 },
      zoom: 1,
    })

    expect(found?.id).toBe('top')
  })

  it('returns null when the pointer is outside every node radius', () => {
    const found = findForceGraphNodeAt({
      nodes: [node({ id: 'far', x: 120, y: 120 })],
      pan: { x: 0, y: 0 },
      screenX: 150,
      screenY: 100,
      size: { w: 300, h: 200 },
      zoom: 1,
    })

    expect(found).toBeNull()
  })
})
