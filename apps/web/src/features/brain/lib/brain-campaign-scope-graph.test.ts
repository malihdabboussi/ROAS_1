import { describe, expect, it } from 'vitest'
import {
  campaignKnowledgeNodeToBrainMemory,
  campaignKnowledgeToBrainScopeGraph,
  type BrainCampaignKnowledgeEdge,
  type BrainCampaignKnowledgeNode,
} from './brain-campaign-scope-graph'

function campaignNode(overrides: Partial<BrainCampaignKnowledgeNode>): BrainCampaignKnowledgeNode {
  return {
    id: 'node-1',
    node_type: 'document',
    title: 'Voice guide',
    content: 'Use direct language.',
    source_type: 'upload',
    source_id: 'upload-1',
    domain: 'creative',
    created_at: '2026-05-28T10:00:00.000Z',
    updated_at: '2026-05-28T10:00:00.000Z',
    ...overrides,
  }
}

describe('brain campaign scope graph mapping', () => {
  it('maps campaign knowledge nodes to the Brain campaign-scope graph shape', () => {
    const nodes = [
      campaignNode({ id: 'node-1', domain: 'creative', node_type: 'document' }),
      campaignNode({
        id: 'node-2',
        title: 'Offer',
        content: 'Launch offer.',
        domain: 'marketing',
        node_type: 'offer',
        created_at: '2026-05-28T09:00:00.000Z',
        updated_at: '2026-05-28T11:00:00.000Z',
      }),
    ]
    const edges: BrainCampaignKnowledgeEdge[] = [
      {
        id: 'edge-1',
        from_node_id: 'node-1',
        to_node_id: 'node-2',
        edge_type: 'connected',
        strength: 0.7,
      },
    ]

    const graph = campaignKnowledgeToBrainScopeGraph(nodes, edges)

    expect(graph.nodes.map((node) => node.node_type)).toEqual([
      'sk_source',
      'sk_entry',
      'sk_entry',
    ])
    expect(graph.nodes[0]).toMatchObject({
      memory_type: 'sk_source',
      memory_count: 2,
      created_at: '2026-05-28T09:00:00.000Z',
      updated_at: '2026-05-28T11:00:00.000Z',
    })
    expect(graph.connections).toHaveLength(3)
    expect(graph.connections[0]).toMatchObject({
      relationship_type: 'emerged_from',
      strength: 0.8,
    })
    expect(graph.stats).toMatchObject({
      total_memories: 2,
      total_experiences: 1,
      total_connections: 3,
      by_type: { creative: 1, marketing: 1 },
    })
  })

  it('maps campaign knowledge search rows to BrainMemory results without changing labels', () => {
    const result = campaignKnowledgeNodeToBrainMemory(
      campaignNode({
        id: 'node-image',
        node_type: 'visual',
        title: 'Hero image',
        media_type: 'image',
        media_url: 'https://example.test/hero.png',
        media_mime_type: 'image/png',
      }),
    )

    expect(result).toMatchObject({
      id: 'node-image',
      node_type: 'sk_entry',
      memory_type: 'creative',
      source_type: 'upload',
      source_id: 'upload-1',
      source_title: 'Hero image',
      entry_type: 'visual',
      media_type: 'image',
      media_url: 'https://example.test/hero.png',
      media_mime_type: 'image/png',
    })
  })
})
