import { describe, expect, it } from 'vitest'
import type { BrainConnection, BrainGraphData, BrainHealthData, BrainMemory } from '../types'
import { deriveBrainVisualizationGraphState } from './brain-visualization-derived-state'
import {
  buildBrainScopeAtlasAwarenessContext,
  filterBrainGraphNodes,
  filterConnections,
  mergeCountMaps,
} from './brain-visualization-helpers'

function memory(overrides: Partial<BrainMemory>): BrainMemory {
  return {
    id: 'memory-1',
    content: 'Memory content',
    memory_type: 'fact',
    source_type: 'note',
    significance: 0.7,
    confidence: 1,
    tags: [],
    recalled_count: 0,
    created_at: '2026-06-10T12:00:00.000Z',
    updated_at: '2026-06-10T12:00:00.000Z',
    node_type: 'memory',
    name: 'Memory',
    ...overrides,
  } as BrainMemory
}

describe('brain visualization helpers', () => {
  it('filters graph nodes by created date and experiences-only mode', () => {
    const nodes = [
      memory({ id: 'old', created_at: '2026-05-20T12:00:00.000Z' }),
      memory({ id: 'fact', created_at: '2026-06-10T12:00:00.000Z' }),
      memory({
        id: 'experience',
        node_type: 'experience',
        created_at: '2026-06-12T12:00:00.000Z',
      }),
    ]

    expect(
      filterBrainGraphNodes(
        nodes,
        { custom_start: '2026-06-01', custom_end: '2026-06-30' },
        false,
      ).map((node) => node.id),
    ).toEqual(['fact', 'experience'])

    expect(
      filterBrainGraphNodes(
        nodes,
        { custom_start: '2026-06-01', custom_end: '2026-06-30' },
        true,
      ).map((node) => node.id),
    ).toEqual(['experience'])
  })

  it('keeps only connections between visible nodes and merges count maps', () => {
    const connections: BrainConnection[] = [
      {
        id: 'visible',
        source_memory_id: 'a',
        target_memory_id: 'b',
        relationship_type: 'related',
        strength: 0.8,
      },
      {
        id: 'hidden',
        source_memory_id: 'a',
        target_memory_id: 'c',
        relationship_type: 'related',
        strength: 0.5,
      },
    ]

    expect(filterConnections(connections, new Set(['a', 'b'])).map((item) => item.id)).toEqual([
      'visible',
    ])
    expect(mergeCountMaps({ fact: 2 }, { fact: 3, insight: 1 }, undefined)).toEqual({
      fact: 5,
      insight: 1,
    })
  })

  it('derives visible graph state, selected-node neighbors, and legend totals', () => {
    const selected = memory({ id: 'fact', memory_type: 'fact', source_type: 'note' })
    const graphData: BrainGraphData = {
      nodes: [
        selected,
        memory({
          id: 'sk-entry',
          node_type: 'sk_entry',
          entry_type: 'playbook',
          source_type: 'manual',
        }),
        memory({
          id: 'experience',
          node_type: 'experience',
          memory_type: 'event',
          source_type: 'mission',
        }),
        memory({
          id: 'sk-source',
          node_type: 'sk_source',
          source_type: 'upload',
        }),
        memory({
          id: 'snapshot',
          node_type: 'snapshot',
          snapshot_type: 'Rule',
          source_type: 'snapshot',
        }),
        memory({
          id: 'out-of-range',
          created_at: '2026-05-01T12:00:00.000Z',
          updated_at: '2026-05-01T12:00:00.000Z',
        }),
      ],
      connections: [
        {
          id: 'visible',
          source_memory_id: 'fact',
          target_memory_id: 'sk-entry',
          relationship_type: 'supports',
          strength: 0.9,
        },
        {
          id: 'source-experience',
          source_memory_id: 'sk-source',
          target_memory_id: 'experience',
          relationship_type: 'related_to',
          strength: 0.7,
        },
        {
          id: 'hidden',
          source_memory_id: 'fact',
          target_memory_id: 'out-of-range',
          relationship_type: 'related_to',
          strength: 0.5,
        },
      ],
      stats: {
        total_memories: 6,
        total_connections: 3,
        by_type: { fact: 1 },
        hub_nodes: [],
      },
    }
    const healthData: BrainHealthData = {
      status: 'ok',
      total_memories: 99,
      total_connections: 12,
      embedding_queue: 2,
      last_capture: '2026-06-12T00:00:00.000Z',
      last_recall: null,
      memory_counts_by_type: { fact: 10 },
      sk_entries_by_type: { playbook: 4 },
      connections_by_type: { supports: 12 },
      experience_sources: 6,
    }

    const unfiltered = deriveBrainVisualizationGraphState({
      activeGraphData: graphData,
      brainDateRange: { time_range: 'all' },
      experiencesOnly: false,
      healthData,
      isCampaignScope: false,
      isKnowledgeScope: false,
      selectedNode: selected,
    })

    expect(unfiltered.legendUsesDbTotals).toBe(true)
    expect(unfiltered.legendMemoryCounts).toEqual({ fact: 10, playbook: 4 })
    expect(unfiltered.legendConnectionCounts).toEqual({ supports: 12 })
    expect(unfiltered.legendExperienceCount).toBe(6)
    expect(unfiltered.legendSkEntryCount).toBe(4)
    expect(unfiltered.selectedNodeConnectedNodes.map((node) => node.id)).toEqual([
      'sk-entry',
      'out-of-range',
    ])

    const filtered = deriveBrainVisualizationGraphState({
      activeGraphData: graphData,
      brainDateRange: { custom_start: '2026-06-01', custom_end: '2026-06-30' },
      experiencesOnly: false,
      healthData,
      isCampaignScope: false,
      isKnowledgeScope: false,
      selectedNode: selected,
    })

    expect(filtered.brainDateFilterActive).toBe(true)
    expect(filtered.filteredNodes.map((node) => node.id)).toEqual([
      'fact',
      'sk-entry',
      'experience',
      'sk-source',
      'snapshot',
    ])
    expect(filtered.filteredConnections.map((connection) => connection.id)).toEqual([
      'visible',
      'source-experience',
    ])
    expect(filtered.counts).toEqual({
      memories: 1,
      experiences: 2,
      snapshots: 1,
      skEntries: 1,
    })
    expect(filtered.memoryCounts).toEqual({ fact: 1, playbook: 1 })
    expect(filtered.snapshotCounts).toEqual({ Rule: 1 })
    expect(filtered.sourceCounts).toEqual({
      note: 1,
      manual: 1,
      mission: 1,
      upload: 1,
      snapshot: 1,
    })
    expect(filtered.legendUsesDbTotals).toBe(false)
    expect(filtered.legendMemoryCounts).toEqual({ fact: 1, playbook: 1 })
    expect(filtered.legendConnectionCounts).toBeUndefined()
    expect(filtered.legendExperienceCount).toBe(2)
    expect(filtered.legendSkEntryCount).toBe(1)
    expect(filtered.selectedNodeConnectedNodes.map((node) => node.id)).toEqual(['sk-entry'])
  })

  it('derives campaign and knowledge-scope stats from the active graph', () => {
    const graphData: BrainGraphData = {
      nodes: [
        memory({
          id: 'knowledge-item',
          node_type: 'knowledge_item',
          knowledge_source_type: 'media_asset',
          source_type: 'upload',
          updated_at: '2026-06-08T00:00:00.000Z',
        }),
        memory({
          id: 'knowledge-source',
          node_type: 'knowledge_source',
          knowledge_source_type: 'campaign_source',
          source_type: 'url',
          updated_at: '2026-06-12T00:00:00.000Z',
        }),
      ],
      connections: [
        {
          id: 'knowledge-edge',
          source_memory_id: 'knowledge-source',
          target_memory_id: 'knowledge-item',
          relationship_type: 'emerged_from',
          strength: 0.8,
        },
      ],
      stats: {
        total_memories: 88,
        total_connections: 9,
        by_type: { media_asset: 1, campaign_source: 1 },
        hub_nodes: [],
      },
    }

    const derived = deriveBrainVisualizationGraphState({
      activeGraphData: graphData,
      brainDateRange: { time_range: 'all' },
      experiencesOnly: false,
      healthData: null,
      isCampaignScope: false,
      isKnowledgeScope: true,
      selectedNode: null,
    })

    expect(derived.statsHealthForBar).toEqual({
      status: 'ok',
      total_memories: 88,
      total_connections: 9,
      embedding_queue: 0,
      last_capture: '2026-06-12T00:00:00.000Z',
      last_recall: null,
    })
    expect(derived.sourceCounts).toEqual({ media_asset: 1, campaign_source: 1 })
    expect(derived.legendUsesDbTotals).toBe(false)
  })

  it('formats Atlas awareness context from the visible Brain state', () => {
    const context = buildBrainScopeAtlasAwarenessContext({
      selectedScope: {
        id: 'user',
        label: 'Your Brain',
        scopeType: 'user',
        brainId: 'brain-user',
      },
      topRightScopeReady: true,
      activeLoading: false,
      healthData: {
        status: 'ok',
        total_memories: 7,
        total_connections: 3,
        embedding_queue: 1,
        last_capture: '2026-06-12T00:00:00.000Z',
        last_recall: null,
      },
      statsHealthForBar: null,
      brainDateRangeLabel: 'Last 7 days',
      brainDateFilterActive: true,
      experiencesOnly: true,
      searchQuery: 'apollo',
      searchInput: '  launch  ',
      searchResultsCount: 2,
      searchLoading: false,
      selectedNode: memory({ id: 'selected', name: 'Selected memory' }),
      connectedNodeCount: 4,
      queueJobs: [{ status: 'queued' }, { status: 'queued' }, { status: 'done' }],
      voiceSessionOpen: false,
      memoryPanelOpen: true,
      cortexMaxOpen: false,
      crystallizeOpen: true,
    })

    expect(context).toContain('Active brain: Your Brain')
    expect(context).toContain('Date filter: Last 7 days')
    expect(context).toContain('Dock search input: launch')
    expect(context).toContain('Queue statuses: queued 2, done 1')
    expect(context).toContain('Selected node visible content:')
  })
})
