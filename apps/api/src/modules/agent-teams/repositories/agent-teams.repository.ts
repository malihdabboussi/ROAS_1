import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AgentCapabilityKind,
  AgentOverride,
  AgentOverrideMode,
  AgentTeam,
  AgentTeamGrant,
  AgentTeamWithCounts,
} from '../types'
import { AgentTeamMembersRepository } from './agent-team-members.repository'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

function scopeMatchClauses(
  scope: ScopeKey,
  prefix = '',
): {
  filterFn: (q: any) => any
} {
  const p = prefix ? `${prefix}.` : ''
  return {
    filterFn: (q: any) => {
      if (scope.orgId) {
        return q.eq(`${p}org_id`, scope.orgId).is(`${p}user_id`, null)
      }
      if (scope.userId) {
        return q.is(`${p}org_id`, null).eq(`${p}user_id`, scope.userId)
      }
      return q
    },
  }
}

@Injectable()
export class AgentTeamsRepository {
  constructor(
    private readonly membersRepository: AgentTeamMembersRepository = new AgentTeamMembersRepository(),
  ) {}

  // -------- TEAMS --------

  async listTeams(supabase: SupabaseClient, scope: ScopeKey): Promise<AgentTeamWithCounts[]> {
    const { filterFn } = scopeMatchClauses(scope)
    const { data: teams, error } = await filterFn(
      supabase
        .from('agent_teams')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true }),
    )
    if (error) throw new Error(`listTeams: ${error.message}`)
    if (!teams || teams.length === 0) return []
    const teamIds = teams.map((t: AgentTeam) => t.id)
    const [grantCounts, memberCounts, userMemberCounts, externalMemberCounts] = await Promise.all([
      this.countGrants(supabase, teamIds),
      this.countMembers(supabase, teamIds, scope),
      this.countUserMembers(supabase, teamIds),
      this.countExternalMembers(supabase, teamIds),
    ])
    return (teams as AgentTeam[]).map((t) => ({
      ...t,
      grant_count: grantCounts.get(t.id) ?? 0,
      member_count: memberCounts.get(t.id) ?? 0,
      user_member_count: userMemberCounts.get(t.id) ?? 0,
      external_member_count: externalMemberCounts.get(t.id) ?? 0,
    }))
  }

  private async countGrants(
    supabase: SupabaseClient,
    teamIds: string[],
  ): Promise<Map<string, number>> {
    if (teamIds.length === 0) return new Map()
    const { data, error } = await supabase
      .from('agent_team_grants')
      .select('team_id')
      .in('team_id', teamIds)
    if (error) throw new Error(`countGrants: ${error.message}`)
    const map = new Map<string, number>()
    for (const row of (data ?? []) as Array<{ team_id: string }>) {
      map.set(row.team_id, (map.get(row.team_id) ?? 0) + 1)
    }
    return map
  }

  private async countMembers(
    supabase: SupabaseClient,
    teamIds: string[],
    scope: ScopeKey,
  ): Promise<Map<string, number>> {
    if (teamIds.length === 0) return new Map()
    let q = supabase.from('agents_registry').select('team_id').in('team_id', teamIds)
    if (scope.orgId) q = q.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) q = q.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await q
    if (error) throw new Error(`countMembers: ${error.message}`)
    const map = new Map<string, number>()
    for (const row of (data ?? []) as Array<{ team_id: string | null }>) {
      if (!row.team_id) continue
      map.set(row.team_id, (map.get(row.team_id) ?? 0) + 1)
    }
    return map
  }

  private async countUserMembers(
    supabase: SupabaseClient,
    teamIds: string[],
  ): Promise<Map<string, number>> {
    if (teamIds.length === 0) return new Map()
    const { data, error } = await supabase
      .from('agent_team_members')
      .select('team_id')
      .in('team_id', teamIds)
    if (error) throw new Error(`countUserMembers: ${error.message}`)
    const map = new Map<string, number>()
    for (const row of (data ?? []) as Array<{ team_id: string }>) {
      map.set(row.team_id, (map.get(row.team_id) ?? 0) + 1)
    }
    return map
  }

  private async countExternalMembers(
    supabase: SupabaseClient,
    teamIds: string[],
  ): Promise<Map<string, number>> {
    if (teamIds.length === 0) return new Map()
    const { data, error } = await supabase
      .from('agent_team_external_members')
      .select('team_id')
      .in('team_id', teamIds)
    if (error) throw new Error(`countExternalMembers: ${error.message}`)
    const map = new Map<string, number>()
    for (const row of (data ?? []) as Array<{ team_id: string }>) {
      map.set(row.team_id, (map.get(row.team_id) ?? 0) + 1)
    }
    return map
  }

  async getTeamById(
    supabase: SupabaseClient,
    teamId: string,
    scope: ScopeKey,
  ): Promise<AgentTeam | null> {
    const { filterFn } = scopeMatchClauses(scope)
    const { data, error } = await filterFn(
      supabase.from('agent_teams').select('*').eq('id', teamId).limit(1),
    )
    if (error) throw new Error(`getTeamById: ${error.message}`)
    return ((data as AgentTeam[] | null)?.[0] as AgentTeam | undefined) ?? null
  }

  async findGeneralTeam(supabase: SupabaseClient, scope: ScopeKey): Promise<AgentTeam | null> {
    const { filterFn } = scopeMatchClauses(scope)
    const { data, error } = await filterFn(
      supabase.from('agent_teams').select('*').eq('is_system', true).eq('name', 'General').limit(1),
    )
    if (error) throw new Error(`findGeneralTeam: ${error.message}`)
    return ((data as AgentTeam[] | null)?.[0] as AgentTeam | undefined) ?? null
  }

  async createTeam(
    supabase: SupabaseClient,
    scope: ScopeKey,
    payload: {
      name: string
      color?: string
      icon?: string
      parent_team_id?: string | null
      team_kind?: 'internal' | 'external' | 'agent' | 'mixed'
    },
  ): Promise<AgentTeam> {
    const insertRow: Record<string, unknown> = {
      name: payload.name.trim(),
      color: payload.color ?? 'muted',
      icon: payload.icon ?? 'users',
      is_system: false,
      parent_team_id: payload.parent_team_id ?? null,
      team_kind: payload.team_kind ?? 'agent',
      org_id: scope.orgId,
      user_id: scope.orgId ? null : scope.userId,
    }
    const { data, error } = await supabase
      .from('agent_teams')
      .insert(insertRow)
      .select('*')
      .single()
    if (error) throw new Error(`createTeam: ${error.message}`)
    return data as AgentTeam
  }

  async updateTeam(
    supabase: SupabaseClient,
    teamId: string,
    scope: ScopeKey,
    patch: {
      name?: string
      color?: string
      icon?: string
      parent_team_id?: string | null
    },
  ): Promise<AgentTeam> {
    const team = await this.getTeamById(supabase, teamId, scope)
    if (!team) throw new NotFoundException('Team not found')
    const next: Record<string, unknown> = {}
    if (patch.name !== undefined) next.name = patch.name.trim()
    if (patch.color !== undefined) next.color = patch.color
    if (patch.icon !== undefined) next.icon = patch.icon
    if (patch.parent_team_id !== undefined) next.parent_team_id = patch.parent_team_id
    const { data, error } = await supabase
      .from('agent_teams')
      .update(next)
      .eq('id', teamId)
      .select('*')
      .single()
    if (error) throw new Error(`updateTeam: ${error.message}`)
    return data as AgentTeam
  }

  async deleteTeam(
    supabase: SupabaseClient,
    teamId: string,
    scope: ScopeKey,
  ): Promise<{ deleted: true; reassigned_to_team_id: string | null }> {
    const team = await this.getTeamById(supabase, teamId, scope)
    if (!team) throw new NotFoundException('Team not found')
    if (team.is_system) {
      throw new Error('Cannot delete a system team')
    }
    const general = await this.findGeneralTeam(supabase, scope)
    if (general) {
      let q = supabase.from('agents_registry').update({ team_id: general.id }).eq('team_id', teamId)
      if (scope.orgId) q = q.eq('org_id', scope.orgId).is('user_id', null)
      else if (scope.userId) q = q.is('org_id', null).eq('user_id', scope.userId)
      const { error: reErr } = await q
      if (reErr) throw new Error(`deleteTeam.reassign: ${reErr.message}`)
    }
    const { error } = await supabase.from('agent_teams').delete().eq('id', teamId)
    if (error) throw new Error(`deleteTeam: ${error.message}`)
    return { deleted: true, reassigned_to_team_id: general?.id ?? null }
  }

  // -------- USER MEMBERS --------

  async listTeamMembers(supabase: SupabaseClient, teamId: string, scope: ScopeKey) {
    return this.membersRepository.listTeamMembers(supabase, teamId, scope)
  }

  async listMyTeamMemberships(
    supabase: SupabaseClient,
    userId: string,
    scope: ScopeKey,
  ): Promise<string[]> {
    return this.membersRepository.listMyTeamMemberships(supabase, userId, scope)
  }

  async addTeamMember(
    supabase: SupabaseClient,
    teamId: string,
    userId: string,
    addedBy: string,
    scope: ScopeKey,
  ) {
    return this.membersRepository.addTeamMember(supabase, teamId, userId, addedBy, scope)
  }

  async removeTeamMember(
    supabase: SupabaseClient,
    teamId: string,
    userId: string,
    scope: ScopeKey,
  ): Promise<void> {
    return this.membersRepository.removeTeamMember(supabase, teamId, userId, scope)
  }

  // -------- GRANTS --------

  async listTeamGrants(supabase: SupabaseClient, teamId: string): Promise<AgentTeamGrant[]> {
    const { data, error } = await supabase
      .from('agent_team_grants')
      .select('*')
      .eq('team_id', teamId)
    if (error) throw new Error(`listTeamGrants: ${error.message}`)
    return (data ?? []) as AgentTeamGrant[]
  }

  async replaceTeamGrants(
    supabase: SupabaseClient,
    teamId: string,
    grants: Array<{ kind: AgentCapabilityKind; id: string }>,
  ): Promise<AgentTeamGrant[]> {
    const { error: delErr } = await supabase
      .from('agent_team_grants')
      .delete()
      .eq('team_id', teamId)
    if (delErr) throw new Error(`replaceTeamGrants.delete: ${delErr.message}`)
    if (grants.length === 0) return []
    const rows = grants.map((g) => ({
      team_id: teamId,
      capability_kind: g.kind,
      capability_id: g.id,
      mode: 'allow' as const,
    }))
    const { data, error } = await supabase.from('agent_team_grants').insert(rows).select('*')
    if (error) throw new Error(`replaceTeamGrants.insert: ${error.message}`)
    return (data ?? []) as AgentTeamGrant[]
  }

  // -------- OVERRIDES --------

  async listOverrides(
    supabase: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
  ): Promise<AgentOverride[]> {
    let q = supabase.from('agent_overrides').select('*').eq('agent_key', agentKey)
    if (scope.orgId) q = q.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) q = q.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await q
    if (error) throw new Error(`listOverrides: ${error.message}`)
    return (data ?? []) as AgentOverride[]
  }

  async replaceOverrides(
    supabase: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
    overrides: Array<{
      kind: AgentCapabilityKind
      id: string
      mode: AgentOverrideMode
    }>,
  ): Promise<AgentOverride[]> {
    let delQ = supabase.from('agent_overrides').delete().eq('agent_key', agentKey)
    if (scope.orgId) delQ = delQ.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) delQ = delQ.is('org_id', null).eq('user_id', scope.userId)
    const { error: delErr } = await delQ
    if (delErr) throw new Error(`replaceOverrides.delete: ${delErr.message}`)
    if (overrides.length === 0) return []
    const rows = overrides.map((o) => ({
      agent_key: agentKey,
      org_id: scope.orgId,
      user_id: scope.orgId ? null : scope.userId,
      capability_kind: o.kind,
      capability_id: o.id,
      mode: o.mode,
    }))
    const { data, error } = await supabase.from('agent_overrides').insert(rows).select('*')
    if (error) throw new Error(`replaceOverrides.insert: ${error.message}`)
    return (data ?? []) as AgentOverride[]
  }

  // -------- AGENT TEAM ASSIGNMENT --------

  async setAgentTeam(
    supabase: SupabaseClient,
    agentKey: string,
    teamId: string | null,
    scope: ScopeKey,
  ): Promise<{ agent_key: string; team_id: string | null }> {
    let q = supabase.from('agents_registry').update({ team_id: teamId }).eq('agent_key', agentKey)
    if (scope.orgId) q = q.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) q = q.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await q.select('agent_key, team_id').single()
    if (error) throw new Error(`setAgentTeam: ${error.message}`)
    return data as { agent_key: string; team_id: string | null }
  }

  async getAgentTeamId(
    supabase: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
  ): Promise<string | null> {
    let q = supabase.from('agents_registry').select('team_id').eq('agent_key', agentKey)
    if (scope.orgId) q = q.eq('org_id', scope.orgId).is('user_id', null)
    else if (scope.userId) q = q.is('org_id', null).eq('user_id', scope.userId)
    const { data, error } = await q.maybeSingle()
    if (error) throw new Error(`getAgentTeamId: ${error.message}`)
    return ((data as { team_id?: string | null } | null)?.team_id ?? null) as string | null
  }

  async canManageAgent(
    supabase: SupabaseClient,
    agentKey: string,
    scope: ScopeKey,
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_manage_agent', {
      p_agent_key: agentKey,
      p_org_id: scope.orgId,
      p_user_id: scope.orgId ? null : scope.userId,
    })
    if (error) throw new Error(`canManageAgent: ${error.message}`)
    return data === true
  }
}
