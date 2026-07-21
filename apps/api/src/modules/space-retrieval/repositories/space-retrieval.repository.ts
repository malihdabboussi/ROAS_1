import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpaceSemanticEdgeInput } from '../space-semantic-edge.types'

const GRAPH_PAGE_SIZE = 1_000
const GRAPH_DEFAULT_LIMIT = 5_000

@Injectable()
export class SpaceRetrievalRepository {
  /**
   * SQL aggregate for the knowledge stats batch endpoint — one RPC instead of
   * fetching every object/edge row and counting in app memory. SECURITY INVOKER
   * function, so the caller's RLS applies (see migration
   * 20260610110000_space_knowledge_stats_batch.sql).
   */
  async statsBatch(
    supabase: SupabaseClient,
    input: { spaceIds: string[]; campaignIds: string[] },
  ): Promise<any> {
    return supabase.rpc('space_knowledge_stats_batch', {
      p_space_ids: input.spaceIds,
      p_campaign_ids: input.campaignIds,
    })
  }

  async listScopeObjects(
    supabase: SupabaseClient,
    scopeColumn: 'space_id' | 'campaign_id',
    scopeIds: string[],
  ): Promise<any> {
    return supabase
      .from('space_semantic_objects')
      .select(`${scopeColumn}, id, source_type, parent_id, updated_at`)
      .in(scopeColumn, scopeIds)
  }

  async listScopeEdges(
    supabase: SupabaseClient,
    scopeColumn: 'space_id' | 'campaign_id',
    scopeIds: string[],
  ): Promise<any> {
    return supabase
      .from('space_semantic_edges')
      .select(`${scopeColumn}, id`)
      .in(scopeColumn, scopeIds)
      .is('deleted_at', null)
  }

  /** Campaign-level objects that have no space (counted alongside space membership). */
  async listCampaignSpacelessObjects(
    supabase: SupabaseClient,
    campaignIds: string[],
  ): Promise<any> {
    return supabase
      .from('space_semantic_objects')
      .select('campaign_id, id, source_type, updated_at')
      .in('campaign_id', campaignIds)
      .is('space_id', null)
  }

  /** Campaign-level edges that have no space (counted alongside space membership). */
  async listCampaignSpacelessEdges(supabase: SupabaseClient, campaignIds: string[]): Promise<any> {
    return supabase
      .from('space_semantic_edges')
      .select('campaign_id, id')
      .in('campaign_id', campaignIds)
      .is('space_id', null)
      .is('deleted_at', null)
  }

  /**
   * Current space membership of a campaign. `spaces.campaign_id` is the single
   * source of truth for the campaign rollup — the denormalized
   * `space_semantic_objects.campaign_id` is stamped at index time and goes stale
   * when a space is reassigned, so the graph/stats must resolve membership live.
   */
  async resolveCampaignSpaceIds(supabase: SupabaseClient, campaignId: string): Promise<string[]> {
    const { data, error } = await supabase.from('spaces').select('id').eq('campaign_id', campaignId)
    if (error) throw new Error(`Failed to resolve campaign spaces: ${error.message}`)
    return ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
  }

  async listGraphObjects(
    supabase: SupabaseClient,
    input: { spaceId?: string; campaignId?: string; spaceIds?: string[]; limit: number },
  ): Promise<any> {
    const rows: Array<Record<string, unknown>> = []
    while (rows.length < input.limit) {
      const pageSize = Math.min(GRAPH_PAGE_SIZE, input.limit - rows.length)
      let query = supabase
        .from('space_semantic_objects')
        .select(
          'id, source_type, source_id, title, summary, user_id, org_id, space_id, campaign_id, parent_type, parent_id, metadata, source_updated_at, indexed_at, content_hash, created_at, updated_at, space_semantic_chunks(id)',
        )
        .order('updated_at', { ascending: false })
        .order('id', { ascending: true })

      if (input.spaceIds) {
        // Campaign rollup by live space membership, plus campaign-level objects
        // that have no space (e.g. campaign-scoped contacts/snapshots).
        const list = input.spaceIds.map((id) => `"${id}"`).join(',')
        query =
          input.campaignId && list
            ? query.or(
                `space_id.in.(${list}),and(space_id.is.null,campaign_id.eq.${input.campaignId})`,
              )
            : query.in('space_id', input.spaceIds)
      } else if (input.spaceId) {
        query = query.eq('space_id', input.spaceId)
      } else if (input.campaignId) {
        query = query.eq('campaign_id', input.campaignId)
      }

      const { data, error } = await query.range(rows.length, rows.length + pageSize - 1)
      if (error) return { data: null, error }
      const page = (data ?? []) as unknown as Array<Record<string, unknown>>
      rows.push(...page)
      if (page.length < pageSize) break
    }
    return { data: rows, error: null }
  }

  async listGraphHubObjects(supabase: SupabaseClient, spaceIds: string[]): Promise<any> {
    return supabase
      .from('space_semantic_objects')
      .select(
        'id, source_type, source_id, title, summary, user_id, org_id, space_id, campaign_id, parent_type, parent_id, metadata, source_updated_at, indexed_at, content_hash, created_at, updated_at, space_semantic_chunks(id)',
      )
      .eq('source_type', 'space')
      .in('space_id', spaceIds)
  }

  async listGraphEdges(
    supabase: SupabaseClient,
    input: {
      spaceId?: string
      campaignId?: string
      spaceIds?: string[]
      objectIds: string[]
      limit?: number
    },
  ): Promise<any> {
    const selectCols =
      'id, from_object_id, to_object_id, edge_type, edge_class, confidence, strength, reason, metadata'

    // Prefer compact space/campaign filters. A single `.in(from_object_id, …)` with
    // hundreds of UUIDs (Page Grader campaign rollups) overflows PostgREST/URL limits
    // and makes Campaign Knowledge return an empty graph after the request fails.
    if (input.spaceIds && input.spaceIds.length > 0) {
      return this.listScopedGraphEdges(supabase, selectCols, input)
    }
    if (input.spaceId) {
      return this.listScopedGraphEdges(supabase, selectCols, input)
    }
    if (input.campaignId) {
      return this.listScopedGraphEdges(supabase, selectCols, input)
    }

    const objectIds = [...new Set(input.objectIds.filter(Boolean))]
    if (objectIds.length === 0) {
      return { data: [], error: null }
    }

    const chunkSize = 100
    const rows: Array<Record<string, unknown>> = []
    for (let i = 0; i < objectIds.length; i += chunkSize) {
      const chunk = objectIds.slice(i, i + chunkSize)
      const { data, error } = await supabase
        .from('space_semantic_edges')
        .select(selectCols)
        .in('from_object_id', chunk)
        .is('deleted_at', null)
      if (error) return { data: null, error }
      rows.push(...((data ?? []) as unknown as Array<Record<string, unknown>>))
    }
    return { data: rows, error: null }
  }

  private async listScopedGraphEdges(
    supabase: SupabaseClient,
    selectCols: string,
    input: {
      spaceId?: string
      campaignId?: string
      spaceIds?: string[]
      limit?: number
    },
  ): Promise<any> {
    const limit = Math.max(1, input.limit ?? GRAPH_DEFAULT_LIMIT)
    const rows: Array<Record<string, unknown>> = []
    while (rows.length < limit) {
      const pageSize = Math.min(GRAPH_PAGE_SIZE, limit - rows.length)
      let query = supabase
        .from('space_semantic_edges')
        .select(selectCols)
        .is('deleted_at', null)
        .order('id', { ascending: true })
      if (input.spaceIds && input.spaceIds.length > 0) {
        query = query.in('space_id', input.spaceIds)
      } else if (input.spaceId) {
        query = query.eq('space_id', input.spaceId)
      } else if (input.campaignId) {
        query = query.eq('campaign_id', input.campaignId)
      }

      const { data, error } = await query.range(rows.length, rows.length + pageSize - 1)
      if (error) return { data: null, error }
      const page = (data ?? []) as unknown as Array<Record<string, unknown>>
      rows.push(...page)
      if (page.length < pageSize) break
    }
    return { data: rows, error: null }
  }

  async upsertSemanticObject(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<any> {
    return supabase
      .from('space_semantic_objects')
      .upsert(payload, { onConflict: 'source_type,source_id' })
      .select('id')
      .single()
  }

  async insertSemanticChunk(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<any> {
    return supabase.from('space_semantic_chunks').insert(payload)
  }

  async deleteSemanticSource(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<any> {
    return supabase
      .from('space_semantic_objects')
      .delete()
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
  }

  async loadSingle(supabase: SupabaseClient, table: string, id: string): Promise<any> {
    return supabase.from(table).select('*').eq('id', id).maybeSingle()
  }

  async findSpaceItemForConversationDocument(
    supabase: SupabaseClient,
    documentId: string,
  ): Promise<any> {
    return supabase
      .from('space_items')
      .select('id, space_id, org_id')
      .eq('custom_data->>_source_id', documentId)
      .limit(1)
      .maybeSingle()
  }

  async insertSemanticEdge(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<any> {
    return supabase.from('space_semantic_edges').insert(payload)
  }

  async softDeleteStructuralEdgesForSource(
    supabase: SupabaseClient,
    side: 'from' | 'to',
    sourceType: string,
    sourceId: string,
    patch: Record<string, unknown>,
  ): Promise<any> {
    const typeColumn = side === 'from' ? 'from_source_type' : 'to_source_type'
    const idColumn = side === 'from' ? 'from_source_id' : 'to_source_id'
    return supabase
      .from('space_semantic_edges')
      .update(patch)
      .eq('edge_class', 'structural')
      .eq(typeColumn, sourceType)
      .eq(idColumn, sourceId)
      .is('deleted_at', null)
  }

  async loadSemanticObjectRef(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<any> {
    return supabase
      .from('space_semantic_objects')
      .select('id, scope_type, user_id, org_id, space_id, campaign_id, source_type, source_id')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .maybeSingle()
  }

  async getSpaceSchema(supabase: SupabaseClient, spaceId: string): Promise<any> {
    return supabase.from('spaces').select('schema').eq('id', spaceId).maybeSingle()
  }

  async findObjectSourceType(
    supabase: SupabaseClient,
    sourceId: string,
    spaceId?: string | null,
  ): Promise<any> {
    let query = supabase
      .from('space_semantic_objects')
      .select('source_type')
      .eq('source_id', sourceId)
      .limit(1)
    if (spaceId) query = query.eq('space_id', spaceId)
    return query.maybeSingle()
  }

  edgeInsertPayload(edge: SpaceSemanticEdgeInput, from: any, to: any): Record<string, unknown> {
    const scope = to.space_id || to.campaign_id ? to : from
    return {
      scope_type: scope.scope_type,
      user_id: scope.user_id,
      org_id: scope.org_id,
      space_id: scope.space_id,
      campaign_id: scope.campaign_id,
      from_object_id: from.id,
      to_object_id: to.id,
      from_source_type: from.source_type,
      from_source_id: from.source_id,
      to_source_type: to.source_type,
      to_source_id: to.source_id,
      edge_type: edge.edgeType,
      edge_class: edge.edgeClass ?? 'structural',
      confidence: edge.confidence ?? 1,
      strength: edge.strength ?? 1,
      reason: edge.reason ?? null,
      evidence: edge.evidence ?? [],
      metadata: edge.metadata ?? {},
      created_by: edge.createdBy ?? 'system',
    }
  }
}
