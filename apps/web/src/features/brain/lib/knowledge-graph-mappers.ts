import type {
  BrainConnection,
  BrainGraphData,
  BrainMemory,
  KnowledgeGraphSourceType,
  KnowledgeRetrieveVia,
} from '../types'

export type KnowledgeGraphObject = {
  id: string
  source_type: KnowledgeGraphSourceType | string
  source_id: string
  title: string
  summary?: string | null
  content?: string | null
  user_id?: string | null
  org_id?: string | null
  space_id?: string | null
  campaign_id?: string | null
  parent_type?: string | null
  parent_id?: string | null
  metadata?: Record<string, unknown> | null
  retrieve_via?: KnowledgeRetrieveVia | null
  source_updated_at?: string | null
  indexed_at?: string | null
  content_hash?: string | null
  chunk_count?: number | null
  created_at: string
  updated_at: string
}

export type KnowledgeGraphEdge = {
  id: string
  from_node_id: string
  to_node_id: string
  edge_type: string
  edge_class?: 'structural' | 'inferred'
  confidence?: number | null
  strength?: number | null
  reason?: string | null
  metadata?: Record<string, unknown> | null
}

export type CampaignKnowledgeGraphNode = {
  id: string
  campaign_id: string
  user_id: string
  node_type: string
  title: string
  content: string
  source_type: string
  source_id: string | null
  metadata: Record<string, unknown>
  domain: string
  media_type?: BrainMemory['media_type']
  media_url?: string | null
  media_mime_type?: string | null
  created_at: string
  updated_at: string
}

export type CampaignKnowledgeGraphEdge = {
  id: string
  campaign_id: string
  user_id: string
  from_node_id: string
  to_node_id: string
  edge_type: string
  strength: number
  auto_generated: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export function knowledgeObjectsToBrainGraph(
  objects: KnowledgeGraphObject[],
  edges: KnowledgeGraphEdge[] = [],
  scope: 'space' | 'campaign',
  stats?: {
    total_objects?: number
    total_edges?: number
    by_source_type?: Record<string, number>
  },
): BrainGraphData {
  const incomingNodeIds = new Set(edges.map((edge) => edge.to_node_id))
  const nodes = objects.map((object) =>
    knowledgeObjectToNode(object, scope, incomingNodeIds.has(object.id)),
  )
  const connections = edges.map((edge) => ({
    id: edge.id,
    source_memory_id: edge.from_node_id,
    target_memory_id: edge.to_node_id,
    relationship_type: edge.edge_type,
    strength: edge.strength ?? 0.7,
  }))
  const byType: Record<string, number> = {}
  for (const object of objects) {
    const type = String(object.source_type || 'unknown')
    byType[type] = (byType[type] ?? 0) + 1
  }

  return {
    nodes,
    connections,
    stats: {
      total_memories: stats?.total_objects ?? nodes.length,
      total_experiences: 0,
      total_connections: stats?.total_edges ?? connections.length,
      by_type:
        stats?.by_source_type && Object.keys(stats.by_source_type).length > 0
          ? stats.by_source_type
          : byType,
      hub_nodes: [],
    },
  }
}

export function campaignKnowledgeToBrainGraph(
  nodes: CampaignKnowledgeGraphNode[],
  edges: CampaignKnowledgeGraphEdge[],
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
      node_type: 'knowledge_item',
      knowledge_scope: 'campaign',
      knowledge_source_type: 'campaign_node',
      campaign_id: node.campaign_id,
      name: node.title,
      entry_type: node.node_type,
      domain: node.domain,
      media_type: node.media_type,
      media_url: node.media_url,
      media_mime_type: node.media_mime_type,
    }
  })

  const sourceNodes: BrainMemory[] = [...sourceGroups.values()].map((group) => ({
    id: group.nodeId,
    content: group.title || group.sourceType || 'Source',
    memory_type: 'campaign_source',
    source_type: group.sourceType,
    source_title: group.title || group.sourceType || 'Source',
    significance: 1,
    confidence: 1,
    tags: [],
    recalled_count: 0,
    created_at: group.createdAt,
    updated_at: group.updatedAt,
    node_type: 'knowledge_source',
    knowledge_scope: 'campaign',
    knowledge_source_type: 'campaign_source',
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
  for (const node of nodes) byType[node.node_type] = (byType[node.node_type] ?? 0) + 1
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

function knowledgeObjectToNode(
  object: KnowledgeGraphObject,
  scope: 'space' | 'campaign',
  hasIncomingEdge = false,
): BrainMemory {
  const sourceType = String(object.source_type || 'space') as KnowledgeGraphSourceType
  return {
    id: object.id,
    content: object.summary || object.content || object.title,
    memory_type: sourceType,
    source_type: sourceType,
    source_id: object.source_id,
    source_title: object.title,
    significance: 0.65,
    confidence: 1,
    tags: [sourceType].filter(Boolean),
    recalled_count: 0,
    created_at: object.created_at,
    updated_at: object.updated_at,
    node_type: object.parent_type || hasIncomingEdge ? 'knowledge_item' : 'knowledge_source',
    knowledge_scope: scope,
    knowledge_source_type: sourceType,
    retrieve_via: object.retrieve_via ?? null,
    metadata: object.metadata ?? null,
    source_updated_at: object.source_updated_at ?? null,
    indexed_at: object.indexed_at ?? null,
    content_hash: object.content_hash ?? null,
    chunk_count: object.chunk_count ?? null,
    space_id: object.space_id ?? null,
    campaign_id: object.campaign_id ?? null,
    parent_type: object.parent_type ?? null,
    parent_id: object.parent_id ?? null,
    name: object.title,
    summary: object.summary ?? undefined,
  }
}
