import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentTeam, AgentTeamMember } from '../types'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

function applyTeamScope(query: any, scope: ScopeKey) {
  if (scope.orgId) return query.eq('org_id', scope.orgId).is('user_id', null)
  if (scope.userId) return query.is('org_id', null).eq('user_id', scope.userId)
  return query
}

@Injectable()
export class AgentTeamMembersRepository {
  private async getTeamById(
    supabase: SupabaseClient,
    teamId: string,
    scope: ScopeKey,
  ): Promise<AgentTeam | null> {
    const { data, error } = await applyTeamScope(
      supabase.from('agent_teams').select('*').eq('id', teamId).limit(1),
      scope,
    )
    if (error) throw new Error(`getTeamById: ${error.message}`)
    return ((data as AgentTeam[] | null)?.[0] as AgentTeam | undefined) ?? null
  }

  async listTeamMembers(
    supabase: SupabaseClient,
    teamId: string,
    scope: ScopeKey,
  ): Promise<AgentTeamMember[]> {
    const team = await this.getTeamById(supabase, teamId, scope)
    if (!team) throw new NotFoundException('Team not found')
    const { data: rows, error } = await supabase
      .from('agent_team_members')
      .select('team_id, user_id, added_at, added_by')
      .eq('team_id', teamId)
      .order('added_at', { ascending: true })
    if (error) throw new Error(`listTeamMembers.members: ${error.message}`)
    const members = (rows ?? []) as AgentTeamMember[]
    if (members.length === 0) return []

    const userIds = members.map((member) => member.user_id)
    if (team.org_id) return this.listOrgTeamMembers(supabase, team.org_id, members, userIds)
    return this.listPersonalTeamMembers(supabase, members, userIds)
  }

  async listMyTeamMemberships(
    supabase: SupabaseClient,
    userId: string,
    scope: ScopeKey,
  ): Promise<string[]> {
    let query = supabase
      .from('agent_team_members')
      .select('team_id, agent_teams!inner(org_id, user_id)')
      .eq('user_id', userId)
    if (scope.orgId) {
      query = query.eq('agent_teams.org_id', scope.orgId).is('agent_teams.user_id', null)
    } else if (scope.userId) {
      query = query.is('agent_teams.org_id', null).eq('agent_teams.user_id', scope.userId)
    }
    const { data, error } = await query
    if (error) throw new Error(`listMyTeamMemberships: ${error.message}`)
    return ((data ?? []) as Array<{ team_id: string }>).map((row) => row.team_id)
  }

  async addTeamMember(
    supabase: SupabaseClient,
    teamId: string,
    userId: string,
    addedBy: string,
    scope: ScopeKey,
  ): Promise<AgentTeamMember> {
    const team = await this.getTeamById(supabase, teamId, scope)
    if (!team) throw new NotFoundException('Team not found')
    if (team.team_kind !== 'internal' && team.team_kind !== 'mixed') {
      throw new BadRequestException('Only Internal or Mixed teams can contain organization users')
    }
    const { data, error } = await supabase
      .from('agent_team_members')
      .upsert(
        { team_id: teamId, user_id: userId, added_by: addedBy },
        { onConflict: 'team_id,user_id' },
      )
      .select('team_id, user_id, added_at, added_by')
      .single()
    if (error) throw new Error(`addTeamMember: ${error.message}`)
    return data as AgentTeamMember
  }

  async removeTeamMember(
    supabase: SupabaseClient,
    teamId: string,
    userId: string,
    scope: ScopeKey,
  ): Promise<void> {
    const team = await this.getTeamById(supabase, teamId, scope)
    if (!team) throw new NotFoundException('Team not found')
    const { error } = await supabase
      .from('agent_team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
    if (error) throw new Error(`removeTeamMember: ${error.message}`)
  }

  private async listOrgTeamMembers(
    supabase: SupabaseClient,
    orgId: string,
    members: AgentTeamMember[],
    userIds: string[],
  ) {
    const { data, error } = await supabase
      .from('org_members')
      .select(
        'user_id, role, profiles!org_members_user_id_fk_profiles(id, full_name, avatar_url, email)',
      )
      .eq('org_id', orgId)
      .eq('status', 'active')
      .in('user_id', userIds)
    if (error) throw new Error(`listTeamMembers.orgMembers: ${error.message}`)
    const byUser = new Map<string, any>()
    for (const row of data ?? []) byUser.set((row as any).user_id, row)
    return members.map((member) => {
      const orgRow = byUser.get(member.user_id)
      const profile = orgRow?.profiles
      return {
        ...member,
        role: orgRow?.role ?? null,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        email: profile?.email ?? null,
      }
    })
  }

  private async listPersonalTeamMembers(
    supabase: SupabaseClient,
    members: AgentTeamMember[],
    userIds: string[],
  ) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', userIds)
    if (error) throw new Error(`listTeamMembers.profiles: ${error.message}`)
    const byProfile = new Map<string, any>()
    for (const profile of data ?? []) byProfile.set((profile as any).id, profile)
    return members.map((member) => {
      const profile = byProfile.get(member.user_id)
      return {
        ...member,
        role: null,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        email: profile?.email ?? null,
      }
    })
  }
}
