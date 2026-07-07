import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type JsonRecord = Record<string, unknown>
type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null }

@Injectable()
export class ArtifactLegacyTeamBrainRepository {
  private applyAgentScope(query: any, input: { userId: string; orgId?: string | null }) {
    if (input.orgId) return query.eq('org_id', input.orgId).is('user_id', null)
    return query.eq('user_id', input.userId).is('org_id', null)
  }

  private applyOptionalOrgScope(query: any, orgId: string | null | undefined) {
    if (orgId === undefined) return query
    return orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
  }

  async listTeamAgents(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<QueryListResult<JsonRecord>> {
    const query = this.applyOptionalOrgScope(
      supabase
        .from('agents_registry')
        .select('agent_key, name, role, level, skills, status, specialty, config')
        .eq('user_id', input.userId)
        .neq('agent_key', 'hr'),
      input.orgId,
    )
    return (await query.order('created_at', { ascending: true })) as QueryListResult<JsonRecord>
  }

  async findAgentProfile(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<QueryResult<JsonRecord>> {
    return (await this.applyAgentScope(
      supabase
        .from('agents_registry')
        .select('agent_key, name, role, level, specialty, config, status, skills')
        .eq('agent_key', input.agentKey),
      input,
    ).maybeSingle()) as QueryResult<JsonRecord>
  }

  async listAgentDefinitions(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<QueryListResult<{ file_name: string; content: string }>> {
    let query = supabase
      .from('agent_definitions')
      .select('file_name, content')
      .eq('agent_key', input.agentKey)
    if (input.orgId) {
      query = query.or(`org_id.eq.${input.orgId},org_id.is.null`).is('user_id', null)
    } else {
      query = query.or(`user_id.eq.${input.userId},user_id.is.null`).is('org_id', null)
    }
    return (await query) as QueryListResult<{ file_name: string; content: string }>
  }

  async listAgentSkills(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<QueryListResult<{ skill_key: string; name: string; description: string }>> {
    let query = supabase
      .from('agent_skills')
      .select('skill_key, name, description')
      .eq('agent_key', input.agentKey)
      .eq('is_enabled', true)
    if (input.orgId) {
      query = query.or(`org_id.eq.${input.orgId},org_id.is.null`).is('user_id', null)
    } else {
      query = query.or(`user_id.eq.${input.userId},user_id.is.null`).is('org_id', null)
    }
    return (await query) as QueryListResult<{
      skill_key: string
      name: string
      description: string
    }>
  }

  async listCampaignAgents(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string },
  ): Promise<QueryListResult<JsonRecord>> {
    return (await supabase
      .from('campaign_agents')
      .select('agent_key, name, status, created_at, updated_at')
      .eq('user_id', input.userId)
      .eq('campaign_id', input.campaignId)
      .order('created_at', { ascending: true })) as QueryListResult<JsonRecord>
  }

  async listAgentRoles(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKeys: string[] },
  ): Promise<QueryListResult<JsonRecord>> {
    const query = this.applyOptionalOrgScope(
      supabase
        .from('agents_registry')
        .select('agent_key, role, level')
        .eq('user_id', input.userId)
        .in('agent_key', input.agentKeys),
      input.orgId,
    )
    return (await query) as QueryListResult<JsonRecord>
  }

  async findAgentAssignmentCandidate(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<QueryResult<JsonRecord>> {
    return (await this.applyAgentScope(
      supabase.from('agents_registry').select('agent_key, name').eq('agent_key', input.agentKey),
      input,
    ).maybeSingle()) as QueryResult<JsonRecord>
  }

  async upsertCampaignAgent(
    supabase: SupabaseClient,
    payload: JsonRecord,
  ): Promise<{ data: JsonRecord; error: QueryError | null }> {
    return (await supabase
      .from('campaign_agents')
      .upsert(payload, { onConflict: 'campaign_id,agent_key' })
      .select('campaign_id, agent_key, name, status')
      .single()) as { data: JsonRecord; error: QueryError | null }
  }

  async deleteCampaignAgent(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; campaignId: string; agentKey: string },
  ): Promise<{ error: QueryError | null }> {
    let query = supabase
      .from('campaign_agents')
      .delete()
      .eq('campaign_id', input.campaignId)
      .eq('agent_key', input.agentKey)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.eq('user_id', input.userId)
    return (await query) as { error: QueryError | null }
  }

  async findAgentRegistryRowInScope(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<QueryResult<{ agent_key: string }>> {
    return (await this.applyAgentScope(
      supabase.from('agents_registry').select('agent_key').eq('agent_key', input.agentKey),
      input,
    ).maybeSingle()) as QueryResult<{ agent_key: string }>
  }

  async findAgentForUpdate(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<QueryResult<JsonRecord>> {
    return (await this.applyAgentScope(
      supabase.from('agents_registry').select('agent_key, name, role').eq('agent_key', input.agentKey),
      input,
    ).maybeSingle()) as QueryResult<JsonRecord>
  }

  async updateAgentRegistry(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string; updates: JsonRecord },
  ): Promise<{ error: QueryError | null }> {
    return (await this.applyAgentScope(
      supabase.from('agents_registry').update(input.updates).eq('agent_key', input.agentKey),
      input,
    )) as { error: QueryError | null }
  }

  async findConversationTitle(
    serviceClient: SupabaseClient,
    conversationId: string,
  ): Promise<QueryResult<{ title?: string | null }>> {
    return (await serviceClient
      .from('conversations')
      .select('title')
      .eq('id', conversationId)
      .maybeSingle()) as QueryResult<{ title?: string | null }>
  }

  async findSimilarSnapshots(
    serviceClient: SupabaseClient,
    input: { embedding: number[]; brainId: string; limit: number },
  ): Promise<QueryListResult<{ id: string; similarity: number }>> {
    return (await serviceClient.rpc('find_similar_snapshots', {
      p_embedding: `[${input.embedding.join(',')}]`,
      p_brain_id: input.brainId,
      p_exclude_ids: [],
      p_limit: input.limit,
    })) as QueryListResult<{ id: string; similarity: number }>
  }

  async findSnapshotsByIds(
    serviceClient: SupabaseClient,
    snapshotIds: string[],
  ): Promise<QueryListResult<JsonRecord>> {
    return (await serviceClient
      .from('ns_snapshots')
      .select('id, name, core, type, confidence, significance_score, tags')
      .in('id', snapshotIds)) as QueryListResult<JsonRecord>
  }

  async findOrgMemberRole(
    serviceClient: SupabaseClient,
    input: { userId: string; orgId: string },
  ): Promise<QueryResult<{ role?: string | null }>> {
    return (await serviceClient
      .from('org_members')
      .select('role')
      .eq('org_id', input.orgId)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .maybeSingle()) as QueryResult<{ role?: string | null }>
  }

  async findAgentTeamMembership(
    serviceClient: SupabaseClient,
    input: { userId: string; teamId: string },
  ): Promise<QueryResult<{ team_id?: string | null }>> {
    return (await serviceClient
      .from('agent_team_members')
      .select('team_id')
      .eq('team_id', input.teamId)
      .eq('user_id', input.userId)
      .maybeSingle()) as QueryResult<{ team_id?: string | null }>
  }

  async canManageAgent(
    supabase: { rpc: Function },
    input: { userId: string; orgId: string | null; agentKey: string },
  ): Promise<{ data: boolean | null; error: QueryError | null }> {
    return (await supabase.rpc('can_manage_agent', {
      p_agent_key: input.agentKey,
      p_org_id: input.orgId,
      p_user_id: input.orgId ? null : input.userId,
    })) as { data: boolean | null; error: QueryError | null }
  }

  async findDefaultBrain(
    serviceClient: SupabaseClient,
    userId: string,
  ): Promise<QueryListResult<{ id: string }>> {
    return (await serviceClient
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)) as QueryListResult<{ id: string }>
  }

  async createDefaultBrain(
    serviceClient: SupabaseClient,
    userId: string,
  ): Promise<{ data: { id: string } | null; error: QueryError | null }> {
    return (await serviceClient
      .from('ns_brains')
      .insert({
        owner_id: userId,
        org_id: null,
        name: 'Default Brain',
        is_default: true,
        scope: 'user',
        color: '#8B85C8',
        icon: 'brain',
        tags: [],
      })
      .select('id')
      .single()) as { data: { id: string } | null; error: QueryError | null }
  }

  async canAccessBrain(
    userClient: SupabaseClient,
    required: 'view' | 'query' | 'train',
    brainId: string,
  ): Promise<{ data: boolean | null; error: QueryError | null }> {
    return (await userClient.rpc('can_access_brain', {
      p_brain_id: brainId,
      p_min_level: required,
    })) as { data: boolean | null; error: QueryError | null }
  }
}
