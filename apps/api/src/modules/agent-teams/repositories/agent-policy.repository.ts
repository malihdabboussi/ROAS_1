import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { AgentCapability, AgentCapabilityKind, AgentOverrideMode } from '../types'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

@Injectable()
export class AgentPolicyRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async getSystemFlag(agentKey: string, scope: ScopeKey): Promise<boolean> {
    let regQ = this.serviceClient.client
      .from('agents_registry')
      .select('is_system')
      .eq('agent_key', agentKey)
    if (scope.orgId) regQ = regQ.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) regQ = regQ.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await regQ.maybeSingle()
    if (error) throw new Error(`policy.lookupSystemAgent failed: ${error.message}`)
    return Boolean((data as { is_system?: boolean } | null)?.is_system)
  }

  async getAgentTeamRow(
    agentKey: string,
    scope: ScopeKey,
  ): Promise<{ agent_key?: string; team_id?: string | null } | null> {
    let regQ = this.serviceClient.client
      .from('agents_registry')
      .select('agent_key, team_id')
      .eq('agent_key', agentKey)
    if (scope.orgId) regQ = regQ.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) regQ = regQ.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await regQ.maybeSingle()
    if (error) throw new Error(`policy.lookupRegistry failed: ${error.message}`)
    return (data as { agent_key?: string; team_id?: string | null } | null) ?? null
  }

  async getTeamName(teamId: string): Promise<string | null> {
    const { data, error } = await this.serviceClient.client
      .from('agent_teams')
      .select('id, name')
      .eq('id', teamId)
      .maybeSingle()
    if (error) throw new Error(`policy.lookupTeam failed: ${error.message}`)
    return (data as { name?: string | null } | null)?.name ?? null
  }

  async listTeamGrants(teamId: string): Promise<AgentCapability[]> {
    const { data, error } = await this.serviceClient.client
      .from('agent_team_grants')
      .select('capability_kind, capability_id')
      .eq('team_id', teamId)
    if (error) throw new Error(`policy.lookupGrants failed: ${error.message}`)
    return ((data ?? []) as Array<{ capability_kind: string; capability_id: string }>).map(
      (row) => ({
        kind: row.capability_kind as AgentCapabilityKind,
        id: row.capability_id,
      }),
    )
  }

  async listOverrides(
    agentKey: string,
    scope: ScopeKey,
  ): Promise<{ allowExtra: AgentCapability[]; deny: AgentCapability[] }> {
    let ovQ = this.serviceClient.client
      .from('agent_overrides')
      .select('capability_kind, capability_id, mode')
      .eq('agent_key', agentKey)
    if (scope.orgId) ovQ = ovQ.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) ovQ = ovQ.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await ovQ
    if (error) throw new Error(`policy.lookupOverrides failed: ${error.message}`)
    const allowExtra: AgentCapability[] = []
    const deny: AgentCapability[] = []
    for (const row of (data ?? []) as Array<{
      capability_kind: string
      capability_id: string
      mode: AgentOverrideMode
    }>) {
      const capability: AgentCapability = {
        kind: row.capability_kind as AgentCapabilityKind,
        id: row.capability_id,
      }
      if (row.mode === 'allow_extra') allowExtra.push(capability)
      else if (row.mode === 'deny') deny.push(capability)
    }
    return { allowExtra, deny }
  }

  async getRoleDefaultAgentRow(
    agentKey: string,
    scope: ScopeKey,
  ): Promise<Record<string, unknown> | null> {
    let regQ = this.serviceClient.client
      .from('agents_registry')
      .select('agent_key, role, level, config')
      .eq('agent_key', agentKey)
    if (scope.orgId) regQ = regQ.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) regQ = regQ.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await regQ.maybeSingle()
    if (error) throw new Error(`policy.lookupRoleDefaults failed: ${error.message}`)
    return (data as Record<string, unknown> | null) ?? null
  }
}
