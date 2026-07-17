import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

function like(query: string): string {
  return `%${query.replace(/[%_]/g, '')}%`
}

function applyTextFilter(query: any, column: string, q: string) {
  if (!q) return query
  return query.ilike(column, like(q))
}

function scoped(query: any, userId: string, orgId: string | null) {
  return orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId)
}

function applyRange(query: any, offset: number, limit: number) {
  return query.range(offset, offset + limit - 1)
}

@Injectable()
export class EntitySearchRepository {
  async searchCampaigns(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    let query = supabase
      .from('campaigns')
      .select('id,name,icon,updated_at')
      .order('updated_at', { ascending: false })
    query = applyTextFilter(query, 'name', q)
    query = scoped(query, userId, orgId)
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async searchSpaceItems(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
    mode: 'task' | 'doc',
  ): Promise<any[]> {
    let query = supabase
      .from('space_items')
      .select('id,title,space_id,status,custom_data,updated_at')
      .order('updated_at', { ascending: false })
    query = applyTextFilter(query, 'title', q)
    query = scoped(query, userId, orgId)
    if (mode === 'doc') {
      query = query.eq('custom_data->>_view_type', 'doc')
    } else {
      query = query.or('custom_data->>_view_type.is.null,custom_data->>_view_type.neq.doc')
    }
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async listSpaceSchemas(supabase: SupabaseClient, spaceIds: string[]): Promise<any[]> {
    const { data } = await supabase.from('spaces').select('id,schema').in('id', spaceIds)
    return data ?? []
  }

  async searchSpaces(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    let query = supabase
      .from('spaces')
      .select('id,title,description,updated_at')
      .order('updated_at', { ascending: false })
    query = applyTextFilter(query, 'title', q)
    query = scoped(query, userId, orgId)
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async searchConversationDocuments(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    let query = supabase
      .from('conversation_documents')
      .select('id,title,document_type,campaign_id,conversation_id,resource_id,updated_at')
      .order('updated_at', { ascending: false })
    query = applyTextFilter(query, 'title', q)
    query = scoped(query, userId, orgId)
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async searchDeliverables(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    let query = supabase
      .from('mission_deliverables')
      .select('id,title,type,mission_id,campaign_id,created_at')
      .order('created_at', { ascending: false })
    query = applyTextFilter(query, 'title', q)
    query = scoped(query, userId, orgId)
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async searchChannels(
    supabase: SupabaseClient,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    let query = supabase
      .from('channels')
      .select('id,name,description,created_at')
      .order('created_at', { ascending: false })
    query = applyTextFilter(query, 'name', q)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async searchMissions(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    let query = supabase
      .from('missions')
      .select('id,title,status,updated_at')
      .order('updated_at', { ascending: false })
    query = applyTextFilter(query, 'title', q)
    query = scoped(query, userId, orgId)
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async searchConversations(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
    campaignId: string | null,
  ): Promise<any[]> {
    let query = supabase
      .from('conversations')
      .select('id,title,agent_id,updated_at,status,campaign_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
    query = applyTextFilter(query, 'title', q)
    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.is('org_id', null)
    }
    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async searchOrgRoster(
    supabase: SupabaseClient,
    orgId: string,
    q: string,
    limit: number,
    offset: number,
    rosterKind: 'human' | 'agent',
  ): Promise<any[]> {
    let query = supabase
      .from('team_roster')
      .select('participant_id,user_id,agent_key,display_name,role_label,avatar_url')
      .eq('org_id', orgId)
      .eq('kind', rosterKind)
      .order('display_name')
    query = applyTextFilter(query, 'display_name', q)
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }

  async findPersonalProfile(
    supabase: SupabaseClient,
    userId: string,
    offset: number,
  ): Promise<any[]> {
    if (offset > 0) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,email,avatar_url')
      .eq('id', userId)
      .limit(1)
    if (error) return []
    return data ?? []
  }

  async searchPersonalAgents(
    supabase: SupabaseClient,
    userId: string,
    q: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key,name,role,image_url')
      .eq('user_id', userId)
      .is('org_id', null)
      .order('updated_at', { ascending: false })
    query = applyTextFilter(query, 'name', q)
    query = applyRange(query, offset, limit)
    const { data, error } = await query
    if (error) return []
    return data ?? []
  }
}
