import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceRetrievalRepository } from '../repositories/space-retrieval.repository'

type KnowledgeGraphScope = 'space' | 'campaign'

export type SpaceKnowledgeGraphObject = {
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
  retrieve_via: Record<string, unknown> | null
  source_updated_at: string | null
  indexed_at: string | null
  content_hash: string | null
  chunk_count: number
  created_at: string
  updated_at: string
}

export type SpaceKnowledgeGraphEdge = {
  id: string
  from_node_id: string
  to_node_id: string
  edge_type: string
  edge_class: 'structural' | 'inferred'
  confidence: number
  strength: number
  reason: string | null
  metadata: Record<string, unknown>
}

export type SpaceKnowledgeGraphResponse = {
  scope: {
    type: KnowledgeGraphScope
    space_id?: string
    campaign_id?: string
  }
  objects: SpaceKnowledgeGraphObject[]
  edges: SpaceKnowledgeGraphEdge[]
  stats: {
    total_objects: number
    total_edges: number
    by_source_type: Record<string, number>
  }
}

export type KnowledgeGraphScopeStats = {
  total_objects: number
  total_edges: number
  last_updated: string | null
  by_source_type: Record<string, number>
}

export type KnowledgeGraphStatsBatchResponse = {
  spaces: Record<string, KnowledgeGraphScopeStats>
  campaigns: Record<string, KnowledgeGraphScopeStats>
}

type StatsBatchRpcRow = {
  scope: 'space' | 'campaign'
  scope_id: string
  total_objects: number
  total_edges: number
  last_updated: string | null
  by_source_type: Record<string, number> | null
}

@Injectable()
export class SpaceKnowledgeGraphService {
  private readonly logger = new Logger(SpaceKnowledgeGraphService.name)

  constructor(private readonly repository: SpaceRetrievalRepository) {}

  async getSpaceGraph(
    supabase: SupabaseClient,
    spaceId: string,
    limit = 500,
  ): Promise<SpaceKnowledgeGraphResponse> {
    const objects = await this.listObjects(supabase, { spaceId, limit })
    const edges = await this.listEdges(supabase, { spaceId, objectIds: objects.map((o) => o.id) })
    return this.response('space', objects, edges, { space_id: spaceId })
  }

  async getCampaignGraph(
    supabase: SupabaseClient,
    campaignId: string,
    limit = 500,
  ): Promise<SpaceKnowledgeGraphResponse> {
    const spaceIds = await this.repository.resolveCampaignSpaceIds(supabase, campaignId)
    if (spaceIds.length === 0) {
      return this.response('campaign', [], [], { campaign_id: campaignId })
    }
    const objects = await this.listObjects(supabase, { spaceIds, campaignId, limit })
    const edges = await this.listEdges(supabase, {
      spaceIds,
      objectIds: objects.map((o) => o.id),
    })
    return this.response('campaign', objects, edges, { campaign_id: campaignId })
  }

  async getStatsBatch(
    supabase: SupabaseClient,
    input: { spaceIds?: string[]; campaignIds?: string[] },
  ): Promise<KnowledgeGraphStatsBatchResponse> {
    const spaceIds = [...new Set((input.spaceIds ?? []).filter(Boolean))]
    const campaignIds = [...new Set((input.campaignIds ?? []).filter(Boolean))]
    if (spaceIds.length === 0 && campaignIds.length === 0) {
      return { spaces: {}, campaigns: {} }
    }

    const { data, error } = await this.repository.statsBatch(supabase, { spaceIds, campaignIds })
    if (!error) {
      const spaces: Record<string, KnowledgeGraphScopeStats> = {}
      const campaigns: Record<string, KnowledgeGraphScopeStats> = {}
      for (const row of (data ?? []) as StatsBatchRpcRow[]) {
        const scopeId = this.optionalString(row.scope_id)
        if (!scopeId) continue
        const bucket = row.scope === 'space' ? spaces : campaigns
        bucket[scopeId] = {
          total_objects: Number(row.total_objects ?? 0),
          total_edges: Number(row.total_edges ?? 0),
          last_updated: this.optionalString(row.last_updated),
          by_source_type: this.record(row.by_source_type) as Record<string, number>,
        }
      }
      return { spaces, campaigns }
    }

    // Rollout guard: until the space_knowledge_stats_batch migration is applied
    // to this database, keep the endpoint working via the legacy row scan.
    this.logger.warn(
      `space_knowledge_stats_batch RPC unavailable (${error.message}); falling back to row-scan stats`,
    )
    const [spaces, campaigns] = await Promise.all([
      this.loadScopeStatsMap(supabase, 'space_id', spaceIds),
      this.loadCampaignStatsMap(supabase, campaignIds),
    ])
    return { spaces, campaigns }
  }

  /**
   * Campaign stats by live space membership (mirrors the graph + the v2 RPC).
   * Counts objects/edges of the campaign's current member spaces, plus
   * campaign-level objects/edges that have no space — deduped by id so the
   * stale denormalized `campaign_id` cannot pull in rows from other campaigns.
   */
  private async loadCampaignStatsMap(
    supabase: SupabaseClient,
    campaignIds: string[],
  ): Promise<Record<string, KnowledgeGraphScopeStats>> {
    if (campaignIds.length === 0) return {}

    // spaces.campaign_id is 1:1, so each space maps to exactly one campaign.
    const spaceToCampaign = new Map<string, string>()
    const allSpaceIds: string[] = []
    for (const campaignId of campaignIds) {
      const ids = await this.repository.resolveCampaignSpaceIds(supabase, campaignId)
      for (const spaceId of ids) {
        spaceToCampaign.set(spaceId, campaignId)
        allSpaceIds.push(spaceId)
      }
    }

    type Bucket = {
      objectIds: Set<string>
      edgeIds: Set<string>
      by_source_type: Record<string, number>
      last_updated: string | null
    }
    const buckets = new Map<string, Bucket>()
    const bucketFor = (campaignId: string): Bucket => {
      let bucket = buckets.get(campaignId)
      if (!bucket) {
        bucket = { objectIds: new Set(), edgeIds: new Set(), by_source_type: {}, last_updated: null }
        buckets.set(campaignId, bucket)
      }
      return bucket
    }
    const countObject = (campaignId: string, row: Record<string, unknown>): void => {
      const id = this.optionalString(row.id)
      if (!id) return
      const bucket = bucketFor(campaignId)
      if (bucket.objectIds.has(id)) return
      bucket.objectIds.add(id)
      const sourceType = String(row.source_type ?? 'space')
      bucket.by_source_type[sourceType] = (bucket.by_source_type[sourceType] ?? 0) + 1
      const updatedAt = this.optionalString(row.updated_at)
      if (updatedAt && (!bucket.last_updated || updatedAt > bucket.last_updated)) {
        bucket.last_updated = updatedAt
      }
    }

    if (allSpaceIds.length > 0) {
      const { data, error } = await this.repository.listScopeObjects(supabase, 'space_id', allSpaceIds)
      if (error) throw new Error(`Failed to load campaign stats: ${error.message}`)
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const campaignId = spaceToCampaign.get(this.optionalString(row.space_id) ?? '')
        if (campaignId) countObject(campaignId, row)
      }

      const { data: edgeData, error: edgeError } = await this.repository.listScopeEdges(
        supabase,
        'space_id',
        allSpaceIds,
      )
      if (edgeError) throw new Error(`Failed to load campaign edge stats: ${edgeError.message}`)
      for (const row of (edgeData ?? []) as Array<Record<string, unknown>>) {
        const campaignId = spaceToCampaign.get(this.optionalString(row.space_id) ?? '')
        const id = this.optionalString(row.id)
        if (campaignId && id) bucketFor(campaignId).edgeIds.add(id)
      }
    }

    const { data: spacelessObjects, error: spacelessObjError } =
      await this.repository.listCampaignSpacelessObjects(supabase, campaignIds)
    if (spacelessObjError)
      throw new Error(`Failed to load campaign stats: ${spacelessObjError.message}`)
    for (const row of (spacelessObjects ?? []) as Array<Record<string, unknown>>) {
      const campaignId = this.optionalString(row.campaign_id)
      if (campaignId) countObject(campaignId, row)
    }

    const { data: spacelessEdges, error: spacelessEdgeError } =
      await this.repository.listCampaignSpacelessEdges(supabase, campaignIds)
    if (spacelessEdgeError)
      throw new Error(`Failed to load campaign edge stats: ${spacelessEdgeError.message}`)
    for (const row of (spacelessEdges ?? []) as Array<Record<string, unknown>>) {
      const campaignId = this.optionalString(row.campaign_id)
      const id = this.optionalString(row.id)
      if (campaignId && id) bucketFor(campaignId).edgeIds.add(id)
    }

    const out: Record<string, KnowledgeGraphScopeStats> = {}
    for (const [campaignId, bucket] of buckets.entries()) {
      out[campaignId] = {
        total_objects: bucket.objectIds.size,
        total_edges: bucket.edgeIds.size,
        last_updated: bucket.last_updated,
        by_source_type: bucket.by_source_type,
      }
    }
    return out
  }

  private async loadScopeStatsMap(
    supabase: SupabaseClient,
    scopeColumn: 'space_id' | 'campaign_id',
    scopeIds: string[],
  ): Promise<Record<string, KnowledgeGraphScopeStats>> {
    if (scopeIds.length === 0) return {}

    const { data, error } = await this.repository.listScopeObjects(supabase, scopeColumn, scopeIds)

    if (error) throw new Error(`Failed to load Space Knowledge stats: ${error.message}`)

    const rows = (data ?? []) as Array<Record<string, unknown>>
    const grouped = new Map<
      string,
      {
        total_objects: number
        total_edges: number
        last_updated: string | null
        by_source_type: Record<string, number>
      }
    >()

    for (const row of rows) {
      const scopeId = this.optionalString(row[scopeColumn])
      if (!scopeId) continue
      const existing = grouped.get(scopeId) ?? {
        total_objects: 0,
        total_edges: 0,
        last_updated: null,
        by_source_type: {},
      }
      existing.total_objects += 1
      const sourceType = String(row.source_type ?? 'space')
      existing.by_source_type[sourceType] = (existing.by_source_type[sourceType] ?? 0) + 1
      const updatedAt = this.optionalString(row.updated_at)
      if (updatedAt && (!existing.last_updated || updatedAt > existing.last_updated)) {
        existing.last_updated = updatedAt
      }
      grouped.set(scopeId, existing)
    }

    const edgeCounts = await this.loadScopeEdgeCounts(supabase, scopeColumn, scopeIds)
    for (const [scopeId, totalEdges] of edgeCounts.entries()) {
      const bucket = grouped.get(scopeId)
      if (bucket) bucket.total_edges = totalEdges
    }

    const out: Record<string, KnowledgeGraphScopeStats> = {}
    for (const [scopeId, bucket] of grouped.entries()) {
      out[scopeId] = {
        total_objects: bucket.total_objects,
        total_edges: bucket.total_edges,
        last_updated: bucket.last_updated,
        by_source_type: bucket.by_source_type,
      }
    }
    return out
  }

  private async loadScopeEdgeCounts(
    supabase: SupabaseClient,
    scopeColumn: 'space_id' | 'campaign_id',
    scopeIds: string[],
  ): Promise<Map<string, number>> {
    if (scopeIds.length === 0) return new Map()
    const { data, error } = await this.repository.listScopeEdges(supabase, scopeColumn, scopeIds)
    if (error) throw new Error(`Failed to load Space Knowledge edge stats: ${error.message}`)
    const out = new Map<string, number>()
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const scopeId = this.optionalString(row[scopeColumn])
      if (!scopeId) continue
      out.set(scopeId, (out.get(scopeId) ?? 0) + 1)
    }
    return out
  }

  private async listObjects(
    supabase: SupabaseClient,
    input: { spaceId?: string; campaignId?: string; spaceIds?: string[]; limit: number },
  ): Promise<SpaceKnowledgeGraphObject[]> {
    const { data, error } = await this.repository.listGraphObjects(supabase, input)
    if (error) throw new Error(`Failed to load Space Knowledge graph: ${error.message}`)

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const metadata = this.record(row.metadata)
      const chunkRows = Array.isArray(row.space_semantic_chunks) ? row.space_semantic_chunks : []
      return {
        id: String(row.id),
        source_type: String(row.source_type ?? 'space'),
        source_id: String(row.source_id ?? row.id),
        title: String(row.title ?? ''),
        summary: String(row.summary ?? ''),
        user_id: String(row.user_id ?? ''),
        org_id: this.optionalString(row.org_id),
        space_id: this.optionalString(row.space_id),
        campaign_id: this.optionalString(row.campaign_id),
        parent_type: this.optionalString(row.parent_type),
        parent_id: this.optionalString(row.parent_id),
        metadata,
        retrieve_via: metadata.retrieve_via ? this.record(metadata.retrieve_via) : null,
        source_updated_at: this.optionalString(row.source_updated_at),
        indexed_at: this.optionalString(row.indexed_at),
        content_hash: this.optionalString(row.content_hash),
        chunk_count: chunkRows.length,
        created_at: String(row.created_at ?? ''),
        updated_at: String(row.updated_at ?? row.created_at ?? ''),
      }
    })
  }

  private async listEdges(
    supabase: SupabaseClient,
    input: { spaceId?: string; campaignId?: string; spaceIds?: string[]; objectIds: string[] },
  ): Promise<SpaceKnowledgeGraphEdge[]> {
    const objectIds = [...new Set(input.objectIds.filter(Boolean))]
    if (objectIds.length === 0) return []

    const { data, error } = await this.repository.listGraphEdges(supabase, {
      ...input,
      objectIds,
    })
    if (error) throw new Error(`Failed to load Space Knowledge edges: ${error.message}`)

    const objectIdSet = new Set(objectIds)
    return ((data ?? []) as Array<Record<string, unknown>>)
      .filter((row) => objectIdSet.has(String(row.to_object_id ?? '')))
      .map((row) => ({
        id: String(row.id),
        from_node_id: String(row.from_object_id ?? ''),
        to_node_id: String(row.to_object_id ?? ''),
        edge_type: String(row.edge_type ?? 'contains_item'),
        edge_class: row.edge_class === 'inferred' ? 'inferred' : 'structural',
        confidence: Number(row.confidence ?? 1),
        strength: Number(row.strength ?? 1),
        reason: this.optionalString(row.reason),
        metadata: this.record(row.metadata),
      }))
  }

  private response(
    type: KnowledgeGraphScope,
    objects: SpaceKnowledgeGraphObject[],
    edges: SpaceKnowledgeGraphEdge[],
    scope: { space_id?: string; campaign_id?: string },
  ): SpaceKnowledgeGraphResponse {
    const bySourceType: Record<string, number> = {}
    for (const object of objects) {
      bySourceType[object.source_type] = (bySourceType[object.source_type] ?? 0) + 1
    }
    return {
      scope: { type, ...scope },
      objects,
      edges,
      stats: {
        total_objects: objects.length,
        total_edges: edges.length,
        by_source_type: bySourceType,
      },
    }
  }

  private optionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }
}
