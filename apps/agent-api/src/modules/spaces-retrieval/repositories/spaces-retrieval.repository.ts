import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpaceSemanticEdgeClass } from '../types/space-retrieval.types'

export type SpaceSemanticEdgeRow = {
  id: string
  from_object_id: string
  to_object_id: string
  edge_type: string
  edge_class: SpaceSemanticEdgeClass
  confidence: number | null
  strength: number | null
  reason: string | null
}

export type SpaceSemanticObjectRef = {
  id: string
  scope_type: string
  user_id: string
  org_id: string | null
  space_id: string | null
  campaign_id: string | null
  source_type: string
  source_id: string
}

@Injectable()
export class SpacesRetrievalRepository {
  async searchVectorRows(
    supabase: SupabaseClient,
    params: {
      embedding: number[]
      limit: number
      spaceId: string | null
      campaignId: string | null
      sourceTypes: string[] | null
    },
  ): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await supabase.rpc('search_space_semantic_chunks', {
      p_query_embedding: `[${params.embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: params.limit,
      p_space_id: params.spaceId,
      p_campaign_id: params.campaignId,
      p_source_types: params.sourceTypes,
    })
    if (error) throw new Error(`Space vector search failed: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async searchLexicalRows(
    supabase: SupabaseClient,
    params: {
      query: string
      limit: number
      spaceId: string | null
      campaignId: string | null
      sourceTypes: string[] | null
    },
  ): Promise<Array<Record<string, unknown>>> {
    let builder = supabase
      .from('space_semantic_chunks')
      .select(
        'id, space_object_id, scope_type, user_id, org_id, space_id, campaign_id, source_type, source_id, source_title, chunk_index, title, contextual_prefix, content, metadata',
      )
      .textSearch('search_vector', params.query, { type: 'websearch', config: 'english' })
      .limit(params.limit)
    if (params.spaceId) builder = builder.eq('space_id', params.spaceId)
    if (params.campaignId) builder = builder.eq('campaign_id', params.campaignId)
    if (params.sourceTypes?.length) builder = builder.in('source_type', params.sourceTypes)
    const { data, error } = await builder
    if (error) throw new Error(`Space lexical search failed: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listEdgesByObjectColumn(
    supabase: SupabaseClient,
    params: {
      column: 'from_object_id' | 'to_object_id'
      objectIds: string[]
      edgeClasses: SpaceSemanticEdgeClass[]
      edgeTypes?: string[]
      spaceId: string | null
      campaignId: string | null
    },
  ): Promise<SpaceSemanticEdgeRow[]> {
    let query = supabase
      .from('space_semantic_edges')
      .select(
        'id, from_object_id, to_object_id, edge_type, edge_class, confidence, strength, reason',
      )
      .in(params.column, params.objectIds)
      .in('edge_class', params.edgeClasses)
      .is('deleted_at', null)
      .limit(100)
    if (params.edgeTypes?.length) query = query.in('edge_type', params.edgeTypes)
    if (params.spaceId) query = query.eq('space_id', params.spaceId)
    if (params.campaignId) query = query.eq('campaign_id', params.campaignId)
    const { data, error } = await query
    if (error) throw new Error(`Space graph edge expansion failed: ${error.message}`)
    return (data ?? []) as SpaceSemanticEdgeRow[]
  }

  async listChunksByObjectIds(
    supabase: SupabaseClient,
    params: {
      objectIds: string[]
      limit: number
      sourceTypes?: string[]
    },
  ): Promise<Array<Record<string, unknown>>> {
    let query = supabase
      .from('space_semantic_chunks')
      .select(
        'id, space_object_id, scope_type, user_id, org_id, space_id, campaign_id, source_type, source_id, source_title, chunk_index, title, contextual_prefix, content, metadata',
      )
      .in('space_object_id', params.objectIds)
      .limit(params.limit)
    if (params.sourceTypes?.length) query = query.in('source_type', params.sourceTypes)
    const { data, error } = await query
    if (error) throw new Error(`Space graph chunk expansion failed: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async deleteSemanticObjectSource(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_semantic_objects')
      .delete()
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
    if (error) throw new Error(`Failed to delete Space semantic source: ${error.message}`)
  }

  async upsertSemanticObject(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('space_semantic_objects')
      .upsert(payload, { onConflict: 'source_type,source_id' })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to upsert Space semantic object: ${error.message}`)
    return data as { id: string }
  }

  async insertSemanticChunk(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('space_semantic_chunks').insert(payload)
    if (error) throw new Error(`Failed to insert Space semantic chunk: ${error.message}`)
  }

  async insertSemanticEdge(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('space_semantic_edges').insert(payload)
    if (error) throw new Error(`Failed to insert Space semantic edge: ${error.message}`)
  }

  async softDeleteStructuralEdgesForSource(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
    direction: 'from' | 'to',
  ): Promise<void> {
    const patch = { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const result = await supabase
      .from('space_semantic_edges')
      .update(patch)
      .eq('edge_class', 'structural')
      .eq(`${direction}_source_type`, sourceType)
      .eq(`${direction}_source_id`, sourceId)
      .is('deleted_at', null)
    if (!result.error) return
    const label = direction === 'from' ? 'outgoing' : 'incoming'
    throw new Error(`Failed to delete ${label} Space semantic edges: ${result.error.message}`)
  }

  async findSemanticObjectRef(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<SpaceSemanticObjectRef | null> {
    const { data, error } = await supabase
      .from('space_semantic_objects')
      .select('id, scope_type, user_id, org_id, space_id, campaign_id, source_type, source_id')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve Space semantic object: ${error.message}`)
    return (data as SpaceSemanticObjectRef | null) ?? null
  }

  async findSpaceSchema(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('schema')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve Space view edge: ${error.message}`)
    return (data as Record<string, unknown> | null) ?? null
  }

  async findSemanticObjectSourceType(
    supabase: SupabaseClient,
    sourceId: string,
    spaceId?: string | null,
  ): Promise<string | null> {
    let query = supabase
      .from('space_semantic_objects')
      .select('source_type')
      .eq('source_id', sourceId)
      .limit(1)
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to resolve Space item edge: ${error.message}`)
    return this.text((data as Record<string, unknown> | null)?.source_type) || null
  }

  async findSourceRow(
    supabase: SupabaseClient,
    table: string,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`)
    return (data as Record<string, unknown> | null) ?? null
  }

  async findConversationDocumentSpaceItem(
    supabase: SupabaseClient,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('space_items')
      .select('id, space_id, parent_item_id, org_id, custom_data')
      .eq('custom_data->>_source_id', id)
      .limit(1)
      .maybeSingle()
    return (data as Record<string, unknown> | null) ?? null
  }

  private text(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value.trim() : ''
  }
}
