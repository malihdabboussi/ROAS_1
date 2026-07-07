import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BrainMemory } from '../types'
import { useBrainVisualizationAtlasAwareness } from './use-brain-visualization-atlas-awareness'

describe('useBrainVisualizationAtlasAwareness', () => {
  it('builds the same Atlas awareness context from the current visible Brain state', () => {
    const selectedNode: BrainMemory = {
      id: 'memory-1',
      content: 'Visible customer insight',
      memory_type: 'fact',
      source_type: 'note',
      significance: 0.8,
      confidence: 1,
      tags: [],
      recalled_count: 0,
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-10T00:00:00.000Z',
      node_type: 'memory',
      name: 'Customer insight',
    }

    const { result } = renderHook(() =>
      useBrainVisualizationAtlasAwareness({
        activeLoading: false,
        brainDateFilterActive: true,
        brainDateRange: { custom_start: '2026-06-01', custom_end: '2026-06-30' },
        connectedNodeCount: 2,
        cortexMaxOpen: true,
        crystallizeOpen: false,
        experiencesOnly: true,
        healthData: null,
        memoryPanelOpen: true,
        queueJobs: [{ status: 'queued', type: 'import' }],
        searchInput: 'customer',
        searchLoading: false,
        searchQuery: 'insight',
        searchResultsCount: 3,
        selectedNode,
        selectedScope: {
          id: 'user',
          label: 'Your Brain',
          scopeType: 'user',
          brainId: 'brain-user',
          agentId: null,
          campaignId: null,
        },
        statsHealthForBar: {
          status: 'ok',
          total_memories: 12,
          total_connections: 4,
          embedding_queue: 1,
          last_capture: '2026-06-15T00:00:00.000Z',
          last_recall: null,
          memory_counts_by_type: {},
          sk_entries_by_type: {},
          connections_by_type: {},
          experience_sources: 0,
        },
        topRightScopeReady: true,
        voiceSessionOpen: false,
      }),
    )

    const context = result.current()

    expect(context).toContain('Active brain: Your Brain')
    expect(context).toContain('Date filter: Jun')
    expect(context).toContain('Experiences only: yes')
    expect(context).toContain('Dock search results: 3')
    expect(context).toContain('Selected node: Customer insight')
    expect(context).toContain('Queue statuses: queued 1')
    expect(context).toContain('Cortex Max modal open: yes')
  })
})
