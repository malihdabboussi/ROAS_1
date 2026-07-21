import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentTeam, AgentTeamExternalMember } from '../types'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

const EXTERNAL_MEMBER_SELECT =
  'team_id, person_id, added_at, added_by, channel_members!inner(display_name, email, avatar_url, title, relationship_kind, org_id)'

function applyTeamScope(query: any, scope: ScopeKey) {
  if (scope.orgId) return query.eq('org_id', scope.orgId).is('user_id', null)
  if (scope.userId) return query.is('org_id', null).eq('user_id', scope.userId)
  return query
}

function flattenExternalMember(row: any): AgentTeamExternalMember {
  const person = Array.isArray(row.channel_members) ? row.channel_members[0] : row.channel_members
  return {
    team_id: String(row.team_id),
    person_id: String(row.person_id),
    added_at: String(row.added_at),
    added_by: row.added_by ? String(row.added_by) : null,
    display_name: String(person?.display_name ?? 'External person'),
    email: person?.email ? String(person.email) : null,
    avatar_url: person?.avatar_url ? String(person.avatar_url) : null,
    title: person?.title ? String(person.title) : null,
    relationship_kind: 'external',
  }
}

@Injectable()
export class AgentTeamExternalMembersRepository {
  private async getTeam(
    supabase: SupabaseClient,
    teamId: string,
    scope: ScopeKey,
  ): Promise<AgentTeam> {
    const { data, error } = await applyTeamScope(
      supabase.from('agent_teams').select('*').eq('id', teamId).limit(1),
      scope,
    )
    if (error) throw new Error(`getExternalMemberTeam: ${error.message}`)
    const team = ((data as AgentTeam[] | null)?.[0] as AgentTeam | undefined) ?? null
    if (!team) throw new NotFoundException('Team not found')
    if (team.team_kind !== 'external' && team.team_kind !== 'mixed') {
      throw new BadRequestException('Only External or Mixed teams can contain external people')
    }
    return team
  }

  async list(
    supabase: SupabaseClient,
    teamId: string,
    scope: ScopeKey,
  ): Promise<AgentTeamExternalMember[]> {
    await this.getTeam(supabase, teamId, scope)
    const { data, error } = await supabase
      .from('agent_team_external_members')
      .select(EXTERNAL_MEMBER_SELECT)
      .eq('team_id', teamId)
      .order('added_at', { ascending: true })
    if (error) throw new Error(`listExternalTeamMembers: ${error.message}`)
    return (data ?? []).map(flattenExternalMember)
  }

  async add(
    supabase: SupabaseClient,
    teamId: string,
    personId: string,
    addedBy: string,
    scope: ScopeKey,
  ): Promise<AgentTeamExternalMember> {
    const team = await this.getTeam(supabase, teamId, scope)
    if (!team.org_id) throw new BadRequestException('External teams require an organization')
    const { data: person, error: personError } = await supabase
      .from('channel_members')
      .select('id')
      .eq('id', personId)
      .eq('org_id', team.org_id)
      .eq('relationship_kind', 'external')
      .maybeSingle()
    if (personError) throw new Error(`verifyExternalTeamMember: ${personError.message}`)
    if (!person) throw new BadRequestException('Person is not classified as external')

    const { data, error } = await supabase
      .from('agent_team_external_members')
      .upsert(
        { team_id: teamId, person_id: personId, added_by: addedBy },
        { onConflict: 'team_id,person_id' },
      )
      .select(EXTERNAL_MEMBER_SELECT)
      .single()
    if (error) throw new Error(`addExternalTeamMember: ${error.message}`)
    return flattenExternalMember(data)
  }

  async remove(
    supabase: SupabaseClient,
    teamId: string,
    personId: string,
    scope: ScopeKey,
  ): Promise<void> {
    await this.getTeam(supabase, teamId, scope)
    const { error } = await supabase
      .from('agent_team_external_members')
      .delete()
      .eq('team_id', teamId)
      .eq('person_id', personId)
    if (error) throw new Error(`removeExternalTeamMember: ${error.message}`)
  }
}
