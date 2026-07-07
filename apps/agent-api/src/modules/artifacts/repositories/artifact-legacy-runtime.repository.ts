import { Injectable } from '@nestjs/common'
import { isProtectedSystemAgent } from '@vibey/agent-policy'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }

@Injectable()
export class ArtifactLegacyRuntimeRepository {
  async findAgentForAuthorization(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId: string | null },
  ): Promise<QueryResult<Record<string, unknown>>> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, level, role, config')
      .eq('agent_key', input.agentKey)
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    const scoped = (await query.maybeSingle()) as QueryResult<Record<string, unknown>>
    if (scoped.error || scoped.data || !isProtectedSystemAgent(input.agentKey)) {
      return scoped
    }

    return (await supabase
      .from('agents_registry')
      .select('agent_key, level, role, config')
      .eq('agent_key', input.agentKey)
      .is('user_id', null)
      .is('org_id', null)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async findCampaignAccessCampaign(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('campaigns')
      .select('user_id, org_id')
      .eq('id', campaignId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async findActiveOrgMember(
    supabase: SupabaseClient,
    input: { orgId: string; userId: string },
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('org_members')
      .select('id, role')
      .eq('org_id', input.orgId)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async findOrgCampaignPermission(
    supabase: SupabaseClient,
    input: { orgMemberId: string; campaignId: string },
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('org_campaign_permissions')
      .select('permission')
      .eq('org_member_id', input.orgMemberId)
      .eq('campaign_id', input.campaignId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async findTargetAgentLevelForSkillAuthorization(
    supabase: SupabaseClient,
    input: { userId: string; targetAgentKey: string; orgId?: string | null },
  ): Promise<QueryResult<Record<string, unknown>>> {
    let query = supabase
      .from('agents_registry')
      .select('level')
      .eq('agent_key', input.targetAgentKey)
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    const scoped = (await query.maybeSingle()) as QueryResult<Record<string, unknown>>
    if (scoped.error || scoped.data || !isProtectedSystemAgent(input.targetAgentKey)) {
      return scoped
    }

    return (await supabase
      .from('agents_registry')
      .select('level')
      .eq('agent_key', input.targetAgentKey)
      .is('user_id', null)
      .is('org_id', null)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async findMissionContext(
    serviceClient: SupabaseClient,
    missionId: string,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await serviceClient
      .from('missions')
      .select('id, user_id, campaign_id, org_id')
      .eq('id', missionId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async findSubtaskMissionContext(
    serviceClient: SupabaseClient,
    subtaskId: string,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await serviceClient
      .from('mission_subtasks')
      .select('mission_id, user_id')
      .eq('id', subtaskId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async saveMissionDeliverable(
    serviceClient: SupabaseClient,
    input: {
      payload: Record<string, unknown>
      updateId?: string | null
      missionId: string
      userId: string
    },
  ): Promise<QueryResult<Record<string, unknown>>> {
    const query = input.updateId
      ? serviceClient
          .from('mission_deliverables')
          .update(input.payload)
          .eq('id', input.updateId)
          .eq('mission_id', input.missionId)
          .eq('user_id', input.userId)
      : serviceClient.from('mission_deliverables').insert(input.payload)
    return (await query
      .select('id, type, title, file_url, file_name, metadata')
      .single()) as QueryResult<Record<string, unknown>>
  }

  async listMissionSessionMissions(
    serviceClient: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = serviceClient.from('missions').select('*').eq('user_id', input.userId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.order('updated_at', { ascending: false }).limit(30)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findMissionSessionMission(
    serviceClient: SupabaseClient,
    input: { missionId: string; userId: string; orgId?: string | null },
  ): Promise<QueryResult<Record<string, unknown>>> {
    let query = serviceClient
      .from('missions')
      .select('*')
      .eq('id', input.missionId)
      .eq('user_id', input.userId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.single()) as QueryResult<Record<string, unknown>>
  }

  async updateMissionSessionMission(
    serviceClient: SupabaseClient,
    input: {
      missionId: string
      userId: string
      orgId?: string | null
      updates: Record<string, unknown>
    },
  ): Promise<QueryResult<Record<string, unknown>>> {
    let query = serviceClient
      .from('missions')
      .update(input.updates)
      .eq('id', input.missionId)
      .eq('user_id', input.userId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.select('*').single()) as QueryResult<Record<string, unknown>>
  }

  async insertMissionSessionComment(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await serviceClient
      .from('missions_logs')
      .insert(payload)
      .select('*')
      .single()) as QueryResult<Record<string, unknown>>
  }

  async createMissionSessionMission(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await serviceClient
      .from('missions')
      .insert(payload)
      .select('*')
      .single()) as QueryResult<Record<string, unknown>>
  }

  async listMissionSessionAgentSkills(
    serviceClient: SupabaseClient,
    input: { userId: string; agentKey: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await serviceClient
      .from('agent_skills')
      .select('*')
      .eq('user_id', input.userId)
      .or(`agent_key.eq.${input.agentKey},agent_key.eq.*`)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }
}
