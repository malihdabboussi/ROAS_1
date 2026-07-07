import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type ScopeKey = {
  orgId: string | null
  userId: string | null
}

@Injectable()
export class AgentPolicyRepository {
  private scopedAgentQuery(
    supa: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
    select: string,
  ) {
    let query = supa.from('agents_registry').select(select).eq('agent_key', agentKey)
    if (scope.orgId) query = query.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) query = query.is('org_id', null).eq('user_id', scope.userId)
    return query
  }

  async lookupSystemAgent(
    supa: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
  ): Promise<{ isSystem: boolean; errorMessage: string | null }> {
    const { data, error } = await this.scopedAgentQuery(supa, agentKey, scope, 'is_system')
      .maybeSingle()
    return {
      isSystem: Boolean((data as { is_system?: boolean } | null)?.is_system),
      errorMessage: error?.message ?? null,
    }
  }

  async lookupRegistryTeam(
    supa: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
  ): Promise<{ teamId: string | null; errorMessage: string | null }> {
    const { data, error } = await this.scopedAgentQuery(
      supa,
      agentKey,
      scope,
      'agent_key, team_id',
    ).maybeSingle()
    return {
      teamId: (data as { team_id?: string | null } | null)?.team_id ?? null,
      errorMessage: error?.message ?? null,
    }
  }

  async lookupTeamName(
    supa: SupabaseClient,
    teamId: string,
  ): Promise<{ teamName: string | null; errorMessage: string | null }> {
    const { data, error } = await supa
      .from('agent_teams')
      .select('id, name')
      .eq('id', teamId)
      .maybeSingle()
    return {
      teamName: (data as { name?: string | null } | null)?.name ?? null,
      errorMessage: error?.message ?? null,
    }
  }

  async listTeamGrants(
    supa: SupabaseClient,
    teamId: string,
  ): Promise<{ grants: Array<{ capability_kind: string; capability_id: string }>; errorMessage: string | null }> {
    const { data, error } = await supa
      .from('agent_team_grants')
      .select('capability_kind, capability_id')
      .eq('team_id', teamId)
    return {
      grants: (data ?? []) as Array<{ capability_kind: string; capability_id: string }>,
      errorMessage: error?.message ?? null,
    }
  }

  async listOverrides(
    supa: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
  ): Promise<{
    overrides: Array<{ capability_kind: string; capability_id: string; mode: string }>
    errorMessage: string | null
  }> {
    let query = supa
      .from('agent_overrides')
      .select('capability_kind, capability_id, mode')
      .eq('agent_key', agentKey)
    if (scope.orgId) query = query.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) query = query.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await query
    return {
      overrides: (data ?? []) as Array<{
        capability_kind: string
        capability_id: string
        mode: string
      }>,
      errorMessage: error?.message ?? null,
    }
  }

  async lookupRoleDefaultAgent(
    supa: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
  ): Promise<{ agent: Record<string, unknown> | null; errorMessage: string | null }> {
    const { data, error } = await this.scopedAgentQuery(
      supa,
      agentKey,
      scope,
      'agent_key, role, level, config',
    ).maybeSingle()
    return {
      agent: (data as Record<string, unknown> | null) ?? null,
      errorMessage: error?.message ?? null,
    }
  }
}
