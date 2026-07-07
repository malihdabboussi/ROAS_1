import { describe, expect, it, vi } from 'vitest'
import { organizeForceGraphNodes } from './force-graph-layouts'
import type { SimNode } from './force-graph.types'

function makeNode(id: string, overrides: Partial<SimNode> = {}): SimNode {
  return {
    id,
    x: 99,
    y: 99,
    vx: 3,
    vy: -2,
    radius: 4,
    color: '--brain-fact-rgb',
    resolvedRgb: '1, 2, 3',
    label: id,
    nodeType: 'memory',
    memoryType: 'fact',
    significance: 0.5,
    createdAt: '2026-06-24T10:00:00.000Z',
    ageOpacity: 1,
    isNew: false,
    memory: {
      id,
      content: id,
      memory_type: 'fact',
      source_type: 'conversation',
      significance: 0.5,
      confidence: 0.8,
      tags: [],
      recalled_count: 0,
      created_at: '2026-06-24T10:00:00.000Z',
      updated_at: '2026-06-24T10:00:00.000Z',
      node_type: 'memory',
    },
    highlighted: false,
    pinned: false,
    ...overrides,
  }
}

describe('organizeForceGraphNodes', () => {
  it('places highest-significance nodes closest to the significance center', () => {
    const high = makeNode('high', { significance: 0.9 })
    const low = makeNode('low', { significance: 0.1 })

    organizeForceGraphNodes([low, high], 'significance')

    expect(high.x).toBe(0)
    expect(high.y).toBe(0)
    expect(low.vx).toBe(0)
    expect(low.vy).toBe(0)
    expect(Math.hypot(low.x, low.y)).toBeGreaterThan(Math.hypot(high.x, high.y))
  })

  it('puts perspectives, beliefs, and memories into cognition layers', () => {
    const perspective = makeNode('perspective', { nodeType: 'perspective' })
    const belief = makeNode('belief', { nodeType: 'belief' })
    const memory = makeNode('memory')

    organizeForceGraphNodes([memory, belief, perspective], 'cognition')

    expect(Math.round(Math.hypot(perspective.x, perspective.y))).toBe(90)
    expect(Math.round(Math.hypot(belief.x, belief.y))).toBe(240)
    expect(Math.round(Math.hypot(memory.x, memory.y))).toBe(360)
  })

  it('groups domain layout by explicit domain before source fallback', () => {
    const finance = makeNode('finance', {
      memory: {
        ...makeNode('finance').memory,
        domain: 'finance',
      },
    })
    const sourceFallback = makeNode('source-fallback', {
      memory: {
        ...makeNode('source-fallback').memory,
        source_type: 'fathom',
      },
    })

    organizeForceGraphNodes([finance, sourceFallback], 'domain')

    expect(finance.vx).toBe(0)
    expect(sourceFallback.vy).toBe(0)
    expect(`${finance.x},${finance.y}`).not.toBe(`${sourceFallback.x},${sourceFallback.y}`)
  })

  it('uses current time buckets for time layout', () => {
    vi.setSystemTime(new Date('2026-06-24T12:00:00.000Z'))
    const newest = makeNode('newest', { createdAt: '2026-06-24T11:00:00.000Z' })
    const older = makeNode('older', { createdAt: '2026-05-01T11:00:00.000Z' })

    organizeForceGraphNodes([older, newest], 'time')

    expect(Math.round(Math.hypot(newest.x, newest.y))).toBe(160)
    expect(Math.round(Math.hypot(older.x, older.y))).toBe(640)
    vi.useRealTimers()
  })
})
