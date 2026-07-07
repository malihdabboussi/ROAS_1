import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

@Injectable()
export class AgentTeamRuntimeRepository {
  async listAgentKeysByTeam(
    supabase: SupabaseClient,
    teamId: string,
    scope: ScopeKey,
  ): Promise<{ agentKeys: string[]; errorMessage: string | null }> {
    let q = supabase.from('agents_registry').select('agent_key').eq('team_id', teamId)
    if (scope.orgId) q = q.eq('org_id', scope.orgId).is('user_id', null)
    else q = q.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await q
    if (error) return { agentKeys: [], errorMessage: error.message }
    const agentKeys = [
      ...new Set(
        ((data ?? []) as Array<{ agent_key?: string }>)
          .map((row) => row.agent_key)
          .filter(Boolean) as string[],
      ),
    ]
    return { agentKeys, errorMessage: null }
  }

  async getOrgMemberRoleStatus(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
  ): Promise<{ role: string | null; status: string | null }> {
    const { data, error } = await supabase
      .from('org_members')
      .select('role, status')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`removeTeamMember.orgRoleCheck: ${error.message}`)
    return {
      role: (data as { role?: string; status?: string } | null)?.role ?? null,
      status: (data as { role?: string; status?: string } | null)?.status ?? null,
    }
  }

  async getTeamOverview(
    supabase: SupabaseClient,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc('get_team_overview', params)
    if (error) throw new Error(`getTeamOverview: ${error.message}`)
    return (data ?? {}) as Record<string, unknown>
  }

  async getTeamSpending(
    supabase: SupabaseClient,
    input: {
      orgId: string
      teamId: string
      start: string
      end: string
      campaignIds: string[] | null
    },
  ): Promise<{ data: Record<string, unknown>; errorMessage: string | null }> {
    const { data, error } = await supabase.rpc('billing_team_spending_org', {
      p_org_id: input.orgId,
      p_team_id: input.teamId,
      p_start: input.start,
      p_end: input.end,
      p_campaign_ids: input.campaignIds,
    })
    return {
      data: (data as Record<string, unknown> | null) ?? {},
      errorMessage: error?.message ?? null,
    }
  }

  async notifyPolicyInvalidate(
    supabase: SupabaseClient,
    scope: ScopeKey,
    payload: { agentKey?: string; teamId?: string | null },
  ): Promise<string | null> {
    const { error } = await supabase.rpc('notify_agent_policy_invalidate', {
      p_agent_key: payload.agentKey ?? null,
      p_team_id: payload.teamId ?? null,
      p_org_id: scope.orgId ?? null,
      p_user_id: scope.orgId ? null : scope.userId,
    })
    return error?.message ?? null
  }
}
