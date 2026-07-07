import type { BrainConnection, BrainGraphData, BrainMemory } from '../types'

export type BrainCampaignKnowledgeNode = {
  id: string
  node_type: string
  title: string
  content: string
  source_type: string
  source_id?: string | null
  domain: string
  media_type?: BrainMemory['media_type']
  media_url?: string | null
  media_mime_type?: string | null
  created_at: string
  updated_at: string
}

export type BrainCampaignKnowledgeEdge = {
  id: string
  from_node_id: string
  to_node_id: string
  edge_type: string
  strength: number
}

/**
 * Per-campaign SWR snapshots for the campaign / campaign-knowledge scopes.
 * Restored synchronously on scope entry, then refreshed in the background.
 */
export const campaignGraphSnapshotByCampaignId = new Map<string, BrainGraphData>()
export const knowledgeGraphSnapshotByCampaignId = new Map<string, BrainGraphData>()

export function campaignKnowledgeNodeToBrainMemory(
  node: BrainCampaignKnowledgeNode,
): BrainMemory {
  return {
    id: node.id,
    content: node.content,
    memory_type: node.domain || 'general',
    source_type: node.source_type,
    source_id: node.source_id ?? undefined,
    source_title: node.title,
    significance: 0.6,
    confidence: 1,
    tags: [node.node_type, node.domain].filter(Boolean),
    recalled_count: 0,
    created_at: node.created_at,
    updated_at: node.updated_at,
    node_type: 'sk_entry',
    name: node.title,
    entry_type: node.node_type,
    domain: node.domain,
    media_type: node.media_type,
    media_url: node.media_url,
    media_mime_type: node.media_mime_type,
  }
}

export function campaignKnowledgeToBrainScopeGraph(
  nodes: BrainCampaignKnowledgeNode[],
  edges: BrainCampaignKnowledgeEdge[],
): BrainGraphData {
  const sourceGroups = new Map<
    string,
    {
      nodeId: string
      sourceType: string
      title: string
      createdAt: string
      updatedAt: string
      count: number
    }
  >()

  const entryNodes: BrainMemory[] = nodes.map((node) => {
    const sourceKey = `${node.source_type}:${node.source_id ?? node.title}`
    const sourceNodeId = `campaign-source:${encodeURIComponent(sourceKey)}`
    const existing = sourceGroups.get(sourceKey)
    if (existing) {
      existing.count += 1
      if (new Date(node.updated_at).getTime() > new Date(existing.updatedAt).getTime()) {
        existing.updatedAt = node.updated_at
      }
      if (new Date(node.created_at).getTime() < new Date(existing.createdAt).getTime()) {
        existing.createdAt = node.created_at
      }
    } else {
      sourceGroups.set(sourceKey, {
        nodeId: sourceNodeId,
        sourceType: node.source_type,
        title: node.title,
        createdAt: node.created_at,
        updatedAt: node.updated_at,
        count: 1,
      })
    }

    return campaignKnowledgeNodeToBrainMemory(node)
  })

  const sourceNodes: BrainMemory[] = [...sourceGroups.values()].map((group) => ({
    id: group.nodeId,
    content: group.title || group.sourceType || 'Source',
    memory_type: 'sk_source',
    source_type: group.sourceType,
    source_title: group.title || group.sourceType || 'Source',
    significance: 1,
    confidence: 1,
    tags: [],
    recalled_count: 0,
    created_at: group.createdAt,
    updated_at: group.updatedAt,
    node_type: 'sk_source',
    memory_count: group.count,
  }))

  const sourceConnections: BrainConnection[] = nodes.map((node) => {
    const sourceKey = `${node.source_type}:${node.source_id ?? node.title}`
    const sourceNodeId = `campaign-source:${encodeURIComponent(sourceKey)}`
    return {
      id: `${sourceNodeId}-${node.id}`,
      source_memory_id: sourceNodeId,
      target_memory_id: node.id,
      relationship_type: 'emerged_from',
      strength: 0.8,
    }
  })

  const graphConnections: BrainConnection[] = edges.map((edge) => ({
    id: edge.id,
    source_memory_id: edge.from_node_id,
    target_memory_id: edge.to_node_id,
    relationship_type: edge.edge_type,
    strength: edge.strength,
  }))
  const byType: Record<string, number> = {}
  for (const node of nodes) byType[node.domain] = (byType[node.domain] || 0) + 1
  return {
    nodes: [...sourceNodes, ...entryNodes],
    connections: [...sourceConnections, ...graphConnections],
    stats: {
      total_memories: nodes.length,
      total_experiences: sourceNodes.length,
      total_connections: edges.length + sourceConnections.length,
      by_type: byType,
      hub_nodes: [],
    },
  }
}
