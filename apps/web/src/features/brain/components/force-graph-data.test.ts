import { describe, expect, it, vi } from 'vitest'
import { buildForceGraphSimulation } from './force-graph-data'
import type { BrainConnection, BrainMemory } from '../types'
import type { SimNode } from './force-graph.types'

const baseMemory: BrainMemory = {
  id: 'memory-1',
  content: 'Customer feedback drives product decisions and long labels get truncated',
  memory_type: 'insight',
  source_type: 'conversation',
  significance: 0.85,
  confidence: 0.9,
  tags: [],
  recalled_count: 0,
  created_at: '2026-06-24T10:00:00.000Z',
  updated_at: '2026-06-24T10:00:00.000Z',
  node_type: 'memory',
}

function existingNode(): SimNode {
  return {
    id: 'memory-1',
    x: 10,
    y: 20,
    vx: 1,
    vy: -1,
    radius: 5,
    color: '--brain-fact-rgb',
    resolvedRgb: '1, 2, 3',
    label: 'memory-1',
    nodeType: 'memory',
    memoryType: 'fact',
    significance: 0.5,
    createdAt: '2026-06-24T10:00:00.000Z',
    ageOpacity: 1,
    isNew: false,
    memory: baseMemory,
    highlighted: true,
    pinned: true,
  }
}

describe('buildForceGraphSimulation', () => {
  it('prefers saved positions, preserves existing velocity and pin state, and truncates labels', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25)

    const result = buildForceGraphSimulation({
      nodes: [baseMemory],
      connections: [],
      existingNodes: [existingNode()],
      savedPositions: { 'memory-1': { x: 44, y: 55 } },
      now: new Date('2026-06-24T11:00:00.000Z').getTime(),
    })

    expect(result.nodes[0]?.x).toBe(44)
    expect(result.nodes[0]?.y).toBe(55)
    expect(result.nodes[0]?.vx).toBe(1)
    expect(result.nodes[0]?.vy).toBe(-1)
    expect(result.nodes[0]?.pinned).toBe(true)
    expect(result.nodes[0]?.label).toBe('Customer feedback drive…')
    expect(result.nodes[0]?.isNew).toBe(true)
    random.mockRestore()
  })

  it('filters connections whose endpoints are absent', () => {
    const target: BrainMemory = {
      ...baseMemory,
      id: 'target',
      content: 'Target node',
    }
    const connections: BrainConnection[] = [
      {
        id: 'valid',
        source_memory_id: 'memory-1',
        target_memory_id: 'target',
        relationship_type: 'supports',
        strength: 0.8,
      },
      {
        id: 'missing',
        source_memory_id: 'memory-1',
        target_memory_id: 'missing',
        relationship_type: 'supports',
        strength: 0.8,
      },
    ]

    const result = buildForceGraphSimulation({
      nodes: [baseMemory, target],
      connections,
      existingNodes: [],
      savedPositions: null,
      now: new Date('2026-06-24T11:00:00.000Z').getTime(),
    })

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]?.source).toBe('memory-1')
    expect(result.edges[0]?.target).toBe('target')
    expect(result.nodeMap.has('target')).toBe(true)
  })
})
