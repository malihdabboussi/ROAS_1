import { describe, expect, it } from 'vitest'
import type { BrainGraphData } from '../types'
import { isCompleteGraph } from './use-brain-store'

const graph = (stats: Partial<BrainGraphData['stats']>): BrainGraphData =>
  ({ nodes: [], connections: [], stats }) as unknown as BrainGraphData

describe('isCompleteGraph', () => {
  it('is complete when the backend says nothing was truncated', () => {
    expect(isCompleteGraph(graph({ nodes_truncated: false }))).toBe(true)
  })

  it('is complete when the server clamped the window — a bigger request would return the same nodes', () => {
    expect(isCompleteGraph(graph({ nodes_truncated: true, node_window_capped: true }))).toBe(true)
  })

  it('is incomplete when truncated by the requested limit and not capped', () => {
    expect(isCompleteGraph(graph({ nodes_truncated: true }))).toBe(false)
    expect(isCompleteGraph(graph({}))).toBe(false)
    expect(isCompleteGraph(null)).toBe(false)
  })
})
