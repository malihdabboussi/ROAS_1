import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CampaignKnowledgeRepository {
  async listKnowledgeSyncOffers(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('offers')
      .select('id, name, step1_data, step2_data')
      .eq('campaign_id', campaignId)
      .limit(100)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async listKnowledgeSyncAvatars(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('avatars')
      .select('id, name, persona_data')
      .eq('campaign_id', campaignId)
      .limit(100)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async listKnowledgeSyncThemes(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('themes')
      .select('id, name, brand_voice, brand_values')
      .eq('campaign_id', campaignId)
      .limit(100)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async listKnowledgeSyncDeliverables(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('id, title, type, content, content_json, file_url, agent_key')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findMissionDeliverableForKnowledge(supabase: SupabaseClient, deliverableId: string) {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select(
        'id, mission_id, user_id, campaign_id, title, type, content, content_json, file_url, agent_key, metadata',
      )
      .eq('id', deliverableId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findMissionForKnowledgeDeliverable(supabase: SupabaseClient, missionId: string) {
    const { data, error } = await supabase
      .from('missions')
      .select('id, user_id, campaign_id, status')
      .eq('id', missionId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async listKnowledgeNodes(
    supabase: SupabaseClient,
    campaignId: string,
    opts?: {
      nodeType?: string
      query?: string
      limit?: number
      domain?: string
      domains?: string[]
      sourceType?: string
    },
  ) {
    let query = supabase
      .from('campaign_nodes')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(opts?.limit ?? 100)

    if (opts?.nodeType) query = query.eq('node_type', opts.nodeType)
    if (opts?.query) query = query.ilike('title', `%${opts.query}%`)
    if (opts?.domain) query = query.eq('domain', opts.domain)
    if (opts?.domains && opts.domains.length > 0) query = query.in('domain', opts.domains)
    if (opts?.sourceType) query = query.eq('source_type', opts.sourceType)

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async createKnowledgeNode(
    supabase: SupabaseClient,
    record: {
      campaign_id: string
      user_id: string
      node_type:
        | 'deliverable'
        | 'document'
        | 'offer'
        | 'avatar'
        | 'theme'
        | 'agent_learning'
        | 'user_upload'
        | 'url_import'
      title: string
      content: string
      content_embedding?: string
      source_type: 'mission' | 'upload' | 'drive' | 'dropbox' | 'url' | 'auto_sync'
      source_id?: string | null
      metadata?: Record<string, unknown>
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
      content_hash?: string
      canonical_node_id?: string | null
      duplicate_kind?: 'exact' | 'semantic' | 'partial' | null
      novelty_score?: number | null
      chunk_index?: number | null
      import_job_id?: string | null
      media_type?: string
      media_url?: string | null
      media_mime_type?: string | null
    },
  ) {
    const payload: Record<string, unknown> = { ...record, metadata: record.metadata ?? {} }
    if (!record.content_embedding) delete payload.content_embedding

    const { data, error } = await supabase
      .from('campaign_nodes')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async updateKnowledgeNode(
    supabase: SupabaseClient,
    nodeId: string,
    fields: Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('campaign_nodes')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', nodeId)
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async deleteKnowledgeNode(supabase: SupabaseClient, nodeId: string) {
    const { error } = await supabase.from('campaign_nodes').delete().eq('id', nodeId)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async findKnowledgeNodeBySource(
    supabase: SupabaseClient,
    campaignId: string,
    sourceType: string,
    sourceId: string,
  ) {
    const { data, error } = await supabase
      .from('campaign_nodes')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findKnowledgeNodeByHash(supabase: SupabaseClient, campaignId: string, contentHash: string) {
    const { data, error } = await supabase
      .from('campaign_nodes')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('content_hash', contentHash)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async createKnowledgeNodeSource(
    supabase: SupabaseClient,
    record: {
      campaign_id: string
      user_id: string
      node_id: string
      source_type: 'mission' | 'upload' | 'drive' | 'dropbox' | 'url' | 'auto_sync'
      source_id?: string | null
      source_uri?: string | null
      source_title?: string | null
      chunk_index?: number | null
      metadata?: Record<string, unknown>
    },
  ) {
    const payload = {
      ...record,
      source_id: record.source_id ?? '',
      source_uri: record.source_uri ?? '',
      source_title: record.source_title ?? '',
      chunk_index: record.chunk_index ?? -1,
      metadata: record.metadata ?? {},
    }
    const { data, error } = await supabase
      .from('campaign_node_sources')
      .upsert(payload, {
        onConflict: 'campaign_id,node_id,source_type,source_id,source_uri,chunk_index',
        ignoreDuplicates: true,
      })
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async createKnowledgeEdge(
    supabase: SupabaseClient,
    record: {
      campaign_id: string
      user_id: string
      from_node_id: string
      to_node_id: string
      edge_type:
        | 'connected'
        | 'evolved_from'
        | 'contradicts'
        | 'used_by'
        | 'created_by'
        | 'references'
        | 'supersedes'
      strength?: number
      auto_generated?: boolean
      metadata?: Record<string, unknown>
    },
  ) {
    const { data, error } = await supabase
      .from('campaign_edges')
      .upsert(
        {
          ...record,
          strength: record.strength ?? 0.5,
          auto_generated: record.auto_generated ?? true,
          metadata: record.metadata ?? {},
        },
        { onConflict: 'from_node_id,to_node_id,edge_type' },
      )
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async listKnowledgeEdges(supabase: SupabaseClient, campaignId: string, limit = 500) {
    const { data, error } = await supabase
      .from('campaign_edges')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async matchKnowledgeNodes(
    supabase: SupabaseClient,
    campaignId: string,
    queryEmbedding: string,
    matchCount = 10,
    threshold = 0.6,
    domains?: string[],
  ) {
    const { data, error } = await supabase.rpc('campaign_match_nodes', {
      p_campaign_id: campaignId,
      p_query_embedding: queryEmbedding,
      p_match_count: matchCount,
      p_match_threshold: threshold,
      p_domains: domains && domains.length > 0 ? domains : null,
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async traverseKnowledgeEdges(
    supabase: SupabaseClient,
    campaignId: string,
    seedNodeIds: string[],
    maxDepth = 2,
    minStrength = 0.3,
  ) {
    const { data, error } = await supabase.rpc('campaign_traverse_edges', {
      p_campaign_id: campaignId,
      p_seed_node_ids: seedNodeIds,
      p_max_depth: maxDepth,
      p_min_strength: minStrength,
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async getKnowledgeNodeById(supabase: SupabaseClient, nodeId: string) {
    const { data, error } = await supabase
      .from('campaign_nodes')
      .select('*')
      .eq('id', nodeId)
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async getKnowledgeNodeByIds(supabase: SupabaseClient, nodeIds: string[]) {
    if (nodeIds.length === 0) return []
    const { data, error } = await supabase.from('campaign_nodes').select('*').in('id', nodeIds)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }
}
