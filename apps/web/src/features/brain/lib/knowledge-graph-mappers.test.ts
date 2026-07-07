import { describe, expect, it } from 'vitest'
import {
  campaignKnowledgeToBrainGraph,
  knowledgeObjectsToBrainGraph,
  type CampaignKnowledgeGraphEdge,
  type CampaignKnowledgeGraphNode,
  type KnowledgeGraphObject,
} from './knowledge-graph-mappers'

describe('knowledge graph mappers', () => {
  it('maps Space Knowledge objects to graph nodes with source-type counts and parent edges', () => {
    const objects: KnowledgeGraphObject[] = [
      {
        id: 'space-1',
        source_type: 'space',
        source_id: 'space-1',
        title: 'Launch Space',
        summary: 'Workspace for launch work.',
        created_at: '2026-05-28T10:00:00.000Z',
        updated_at: '2026-05-28T10:00:00.000Z',
      },
      {
        id: 'doc-1',
        source_type: 'space_doc',
        source_id: 'doc-1',
        title: 'Offer notes',
        summary: 'Pricing and offer positioning.',
        space_id: 'space-1',
        parent_type: 'space',
        parent_id: 'space-1',
        retrieve_via: { action: 'read_space_document', data: { document_id: 'doc-1' } },
        created_at: '2026-05-28T11:00:00.000Z',
        updated_at: '2026-05-28T11:00:00.000Z',
      },
    ]

    const graph = knowledgeObjectsToBrainGraph(
      objects,
      [
        {
          id: 'edge-1',
          from_node_id: 'space-1',
          to_node_id: 'doc-1',
          edge_type: 'contains_doc',
          edge_class: 'structural',
          confidence: 1,
          strength: 1,
          reason: 'Object belongs to this Space.',
          metadata: {},
        },
      ],
      'space',
    )

    expect(graph.nodes).toHaveLength(2)
    expect(graph.nodes[0]).toMatchObject({
      node_type: 'knowledge_source',
      knowledge_scope: 'space',
      knowledge_source_type: 'space',
    })
    expect(graph.nodes[1]).toMatchObject({
      node_type: 'knowledge_item',
      knowledge_scope: 'space',
      knowledge_source_type: 'space_doc',
      retrieve_via: { action: 'read_space_document' },
    })
    expect(graph.connections).toEqual([
      {
        id: 'edge-1',
        source_memory_id: 'space-1',
        target_memory_id: 'doc-1',
        relationship_type: 'contains_doc',
        strength: 1,
      },
    ])
    expect(graph.stats.by_type).toEqual({ space: 1, space_doc: 1 })
  })

  it('maps legacy Campaign Knowledge nodes to operational knowledge nodes and source groups', () => {
    const nodes: CampaignKnowledgeGraphNode[] = [
      {
        id: 'node-1',
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        node_type: 'document',
        title: 'Voice guide',
        content: 'Use direct language.',
        source_type: 'upload',
        source_id: 'upload-1',
        metadata: {},
        domain: 'creative',
        created_at: '2026-05-28T10:00:00.000Z',
        updated_at: '2026-05-28T10:00:00.000Z',
      },
      {
        id: 'node-2',
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        node_type: 'offer',
        title: 'Offer',
        content: 'Launch offer.',
        source_type: 'upload',
        source_id: 'upload-1',
        metadata: {},
        domain: 'marketing',
        created_at: '2026-05-28T10:05:00.000Z',
        updated_at: '2026-05-28T10:05:00.000Z',
      },
    ]
    const edges: CampaignKnowledgeGraphEdge[] = [
      {
        id: 'edge-1',
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        from_node_id: 'node-1',
        to_node_id: 'node-2',
        edge_type: 'connected',
        strength: 0.7,
        auto_generated: true,
        metadata: {},
        created_at: '2026-05-28T10:06:00.000Z',
      },
    ]

    const graph = campaignKnowledgeToBrainGraph(nodes, edges)

    expect(graph.nodes.map((node) => node.node_type)).toEqual([
      'knowledge_source',
      'knowledge_item',
      'knowledge_item',
    ])
    expect(
      graph.nodes.filter((node) => node.knowledge_source_type === 'campaign_source'),
    ).toHaveLength(1)
    expect(graph.connections).toHaveLength(3)
    expect(graph.stats.by_type).toEqual({ document: 1, offer: 1 })
  })
})
