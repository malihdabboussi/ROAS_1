import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'

export type KnowledgeGraphObject = {
  id: string
  source_type: string
  source_id: string
  title: string
  summary: string
  user_id: string
  org_id: string | null
  space_id: string | null
  campaign_id: string | null
  parent_type: string | null
  parent_id: string | null
  metadata: Record<string, unknown>
  retrieve_via: { action: string; data: Record<string, unknown> } | null
  source_updated_at: string | null
  indexed_at: string | null
  content_hash: string | null
  chunk_count: number
  created_at: string
  updated_at: string
}

export type KnowledgeGraphEdge = {
  id: string
  from_node_id: string
  to_node_id: string
  edge_type: string
  edge_class?: 'structural' | 'inferred'
  confidence?: number
  strength: number
  reason?: string | null
  metadata?: Record<string, unknown>
}

export type KnowledgeGraphResponse = {
  scope: {
    type: 'space' | 'campaign'
    space_id?: string
    campaign_id?: string
  }
  objects: KnowledgeGraphObject[]
  edges: KnowledgeGraphEdge[]
  stats: {
    total_objects: number
    total_edges: number
    by_source_type: Record<string, number>
  }
}

export type KnowledgeGraphStats = {
  total_objects: number
  total_edges: number
  last_updated: string | null
  by_source_type: Record<string, number>
}

export type KnowledgeGraphStatsBatchResponse = {
  spaces: Record<string, KnowledgeGraphStats>
  campaigns: Record<string, KnowledgeGraphStats>
}

export async function fetchKnowledgeGraphStatsBatch(input: {
  spaceIds?: string[]
  campaignIds?: string[]
}): Promise<KnowledgeGraphStatsBatchResponse> {
  const spaceIds = [...new Set((input.spaceIds ?? []).filter(Boolean))].sort()
  const campaignIds = [...new Set((input.campaignIds ?? []).filter(Boolean))].sort()
  if (spaceIds.length === 0 && campaignIds.length === 0) {
    return { spaces: {}, campaigns: {} }
  }
  // Signature-keyed TTL cache — absorbs the scopeOptions identity-churn
  // double-fire from BrainHome's batch effect (same sorted ids = cache hit).
  return cachedFetch(
    `knowledge-stats-batch:${spaceIds.join(',')}|${campaignIds.join(',')}`,
    () => {
      const params = new URLSearchParams()
      if (spaceIds.length > 0) params.set('space_ids', spaceIds.join(','))
      if (campaignIds.length > 0) params.set('campaign_ids', campaignIds.join(','))
      return backendGet<KnowledgeGraphStatsBatchResponse>(
        `/api/space-retrieval/knowledge/stats/batch?${params.toString()}`,
      )
    },
    { ttlMs: 30_000 },
  )
}

export async function fetchSpaceKnowledgeGraph(spaceId: string): Promise<KnowledgeGraphResponse> {
  return backendGet<KnowledgeGraphResponse>(
    `/api/space-retrieval/knowledge/spaces/${encodeURIComponent(spaceId)}/graph?limit=5000`,
  )
}

export async function fetchCampaignKnowledgeRollupGraph(
  campaignId: string,
): Promise<KnowledgeGraphResponse> {
  return backendGet<KnowledgeGraphResponse>(
    `/api/space-retrieval/knowledge/campaigns/${encodeURIComponent(campaignId)}/graph?limit=5000`,
  )
}
