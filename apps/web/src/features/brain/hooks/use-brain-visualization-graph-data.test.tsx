import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCampaignKnowledgeGraph } from '@/lib/campaigns'
import {
  campaignGraphSnapshotByCampaignId,
  knowledgeGraphSnapshotByCampaignId,
} from '../lib/brain-campaign-scope-graph'
import { fetchCampaignKnowledgeRollupGraph } from '../services/knowledge-graph.service'
import type { BrainGraphData } from '../types'
import { useBrainVisualizationGraphData } from './use-brain-visualization-graph-data'

vi.mock('@/lib/campaigns', () => ({
  fetchCampaignKnowledgeGraph: vi.fn(),
}))

vi.mock('../services/knowledge-graph.service', () => ({
  fetchCampaignKnowledgeRollupGraph: vi.fn(),
}))

const fetchCampaignKnowledgeGraphMock = vi.mocked(fetchCampaignKnowledgeGraph)
const fetchCampaignKnowledgeRollupGraphMock = vi.mocked(fetchCampaignKnowledgeRollupGraph)

function graphWithNode(id: string): BrainGraphData {
  return {
    nodes: [
      {
        id,
        content: id,
        memory_type: 'fact',
        source_type: 'note',
        significance: 1,
        confidence: 1,
        tags: [],
        recalled_count: 0,
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
        node_type: 'memory',
        name: id,
      },
    ],
    connections: [],
    stats: {
      total_memories: 1,
      total_connections: 0,
      by_type: { fact: 1 },
      hub_nodes: [],
    },
  }
}

function renderGraphDataHook(
  overrides: Partial<Parameters<typeof useBrainVisualizationGraphData>[0]> = {},
) {
  const loadGraph = vi.fn()
  const loadHealth = vi.fn()
  const loadCognition = vi.fn()
  const loadCustomerAvatars = vi.fn()
  const clearActiveScope = vi.fn()
  const props = {
    brainScopeRuntime: {
      graphBrainId: 'brain-user',
    },
    clearActiveScope,
    graphData: graphWithNode('user-node'),
    loadCognition,
    loadCustomerAvatars,
    loadGraph,
    loadHealth,
    loading: false,
    selectedAgentId: undefined,
    selectedScope: {
      brainId: 'brain-user',
      scopeType: 'user' as const,
    },
    topRightScopeReady: true,
    ...overrides,
  }

  return {
    ...renderHook(() => useBrainVisualizationGraphData(props)),
    clearActiveScope,
    loadCognition,
    loadCustomerAvatars,
    loadGraph,
    loadHealth,
  }
}

describe('useBrainVisualizationGraphData', () => {
  afterEach(() => {
    campaignGraphSnapshotByCampaignId.clear()
    knowledgeGraphSnapshotByCampaignId.clear()
    vi.clearAllMocks()
  })

  it('loads user-scope graph, health, and cognition, then refreshes the active graph on queue completion', async () => {
    const { result, loadCognition, loadGraph, loadHealth } = renderGraphDataHook({
      selectedAgentId: 'atlas',
    })

    await waitFor(() => {
      expect(loadGraph).toHaveBeenCalledWith('atlas', 'brain-user')
      expect(loadHealth).toHaveBeenCalledWith('atlas', 'brain-user')
      expect(loadCognition).toHaveBeenCalledWith('brain-user')
    })

    expect(result.current.activeGraphData?.nodes[0]?.id).toBe('user-node')
    expect(result.current.activeLoading).toBe(false)
    expect(result.current.searchGraphData?.nodes[0]?.id).toBe('user-node')

    loadGraph.mockClear()
    act(() => result.current.handleQueueJobComplete())

    expect(loadGraph).toHaveBeenCalledWith('atlas', 'brain-user')
  })

  it('restores campaign graph snapshots immediately and refreshes them from the campaign graph API', async () => {
    campaignGraphSnapshotByCampaignId.set('campaign-1', graphWithNode('cached-campaign'))
    fetchCampaignKnowledgeGraphMock.mockResolvedValue({
      nodes: [
        {
          id: 'campaign-node',
          campaign_id: 'campaign-1',
          user_id: 'user-1',
          node_type: 'insight',
          title: 'Campaign node',
          content: 'Campaign content',
          source_type: 'upload',
          source_id: 'brief-1',
          metadata: {},
          domain: 'marketing',
          created_at: '2026-06-01T00:00:00.000Z',
          updated_at: '2026-06-01T00:00:00.000Z',
        },
      ],
      edges: [],
    })

    const { result } = renderGraphDataHook({
      brainScopeRuntime: { graphBrainId: undefined },
      selectedScope: {
        brainId: null,
        campaignId: 'campaign-1',
        scopeType: 'campaign',
      },
    })

    await waitFor(() => {
      expect(result.current.activeGraphData?.nodes[0]?.id).toBe('cached-campaign')
    })

    await waitFor(() => {
      expect(fetchCampaignKnowledgeGraphMock).toHaveBeenCalledWith('campaign-1')
      expect(result.current.activeGraphData?.nodes.some((node) => node.id === 'campaign-node')).toBe(
        true,
      )
    })

    fetchCampaignKnowledgeGraphMock.mockClear()
    act(() => result.current.handleQueueJobComplete())

    await waitFor(() => {
      expect(fetchCampaignKnowledgeGraphMock).toHaveBeenCalledWith('campaign-1')
    })
  })

  it('loads campaign knowledge rollup graph data for campaign knowledge scopes', async () => {
    fetchCampaignKnowledgeRollupGraphMock.mockResolvedValue({
      scope: { type: 'campaign', campaign_id: 'campaign-1' },
      objects: [
        {
          id: 'knowledge-object',
          source_type: 'presentation',
          source_id: 'presentation-1',
          title: 'Knowledge object',
          summary: 'Campaign rollup object',
          user_id: 'user-1',
          org_id: null,
          space_id: null,
          campaign_id: 'campaign-1',
          parent_type: null,
          parent_id: null,
          metadata: {},
          retrieve_via: null,
          source_updated_at: null,
          indexed_at: null,
          content_hash: null,
          chunk_count: 1,
          created_at: '2026-06-01T00:00:00.000Z',
          updated_at: '2026-06-01T00:00:00.000Z',
        },
      ],
      edges: [],
      stats: {
        total_objects: 1,
        total_edges: 0,
        by_source_type: { presentation: 1 },
      },
    })

    const { result } = renderGraphDataHook({
      brainScopeRuntime: { graphBrainId: undefined },
      selectedScope: {
        brainId: null,
        campaignId: 'campaign-1',
        scopeType: 'campaign_knowledge',
      },
    })

    await waitFor(() => {
      expect(fetchCampaignKnowledgeRollupGraphMock).toHaveBeenCalledWith('campaign-1')
      expect(result.current.activeGraphData?.nodes[0]?.id).toBe('knowledge-object')
      expect(result.current.isKnowledgeScope).toBe(true)
      expect(result.current.searchGraphData?.nodes[0]?.id).toBe('knowledge-object')
    })
  })
})
