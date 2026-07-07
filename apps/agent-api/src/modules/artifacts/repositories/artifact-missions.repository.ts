import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactMissionsRepository {
  async findVisibilityAgent(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, level, role, config')
      .eq('user_id', input.userId)
      .eq('agent_key', input.agentKey)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listVisibilityAgents(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, role, config')
      .eq('user_id', input.userId)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listVisibleMissions(
    supabase: SupabaseClient,
    input: {
      userId: string
      agentKeys: string[]
      status?: string
      campaignId?: string
      limit: number
    },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    const orFilters = [
      `assigned_agent_key.in.(${input.agentKeys.join(',')})`,
      `current_agent_key.in.(${input.agentKeys.join(',')})`,
    ]
    let query = supabase
      .from('missions')
      .select('*')
      .eq('user_id', input.userId)
      .or(orFilters.join(','))
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (input.status) query = query.eq('status', input.status)
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    query = query.limit(input.limit)

    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listAssignedSubtaskMissionIds(
    supabase: SupabaseClient,
    input: { userId: string; agentKeys: string[] },
  ): Promise<{ data: Array<{ mission_id: string }> | null; error: QueryError | null }> {
    return (await supabase
      .from('mission_subtasks')
      .select('mission_id')
      .eq('user_id', input.userId)
      .in('assigned_agent_key', input.agentKeys)) as {
      data: Array<{ mission_id: string }> | null
      error: QueryError | null
    }
  }

  async listMissionsByIds(
    supabase: SupabaseClient,
    input: { userId: string; missionIds: string[] },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('missions')
      .select('*')
      .eq('user_id', input.userId)
      .in('id', input.missionIds)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listUserMissions(
    supabase: SupabaseClient,
    input: { userId: string; status?: string; campaignId?: string; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('missions')
      .select('*')
      .eq('user_id', input.userId)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (input.status) query = query.eq('status', input.status)
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    query = query.limit(input.limit)

    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findMissionForUser(
    supabase: SupabaseClient,
    input: { missionId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('missions')
      .select('*')
      .eq('id', input.missionId)
      .eq('user_id', input.userId)
      .single()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async listMissionSubtasks(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('mission_subtasks')
      .select('*')
      .eq('mission_id', missionId)
      .order('sort_order', { ascending: true })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listMissionLogs(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('missions_logs')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listMissionDeliverables(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('mission_deliverables')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }
}
