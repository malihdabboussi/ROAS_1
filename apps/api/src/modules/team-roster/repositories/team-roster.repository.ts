import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { TeamRosterEntry } from '@vibey/api-shared'
import type { UpdateTeamProfileDto } from '../dto'

@Injectable()
export class TeamRosterRepository {
  getServiceRoleClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }

  async listRoster(
    supabase: SupabaseClient,
    orgId: string,
    opts: { kind?: 'agent' | 'human' | 'all'; readyOnly?: boolean } = {},
  ): Promise<TeamRosterEntry[]> {
    let query = supabase.from('team_roster').select('*').eq('org_id', orgId)
    if (opts.kind && opts.kind !== 'all') {
      query = query.eq('kind', opts.kind)
    }
    if (opts.readyOnly) {
      query = query.eq('is_ready', true)
    }
    const { data, error } = await query.order('kind').order('display_name')
    if (error) throw new Error(`Failed to list team roster: ${error.message}`)
    return (data || []) as TeamRosterEntry[]
  }

  /**
   * Personal-scope roster: the `team_roster` view filters out agents with `org_id IS NULL`,
   * so personal workspaces appear empty there. We query `agents_registry` directly and map
   * to the same TeamRosterEntry shape consumers expect. Humans are intentionally excluded —
   * a personal workspace has no human teammates (just the user themselves, who is always
   * filtered out client-side anyway).
   */
  async listPersonalAgents(supabase: SupabaseClient, userId: string): Promise<TeamRosterEntry[]> {
    const { data, error } = await supabase
      .from('agents_registry')
      .select('id, agent_key, name, role, specialty, image_url, level, created_at, updated_at')
      .eq('user_id', userId)
      .is('org_id', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to list personal agents: ${error.message}`)

    type AgentRow = {
      id: string
      agent_key: string
      name: string | null
      role: string | null
      specialty: string | null
      image_url: string | null
      level: string | null
      created_at: string
      updated_at: string | null
    }

    const rows = (data || []) as AgentRow[]
    return rows.map<TeamRosterEntry>((ar) => ({
      participant_id: ar.id,
      kind: 'agent',
      org_id: null,
      user_id: null,
      agent_key: ar.agent_key,
      display_name: ar.name ?? ar.agent_key,
      avatar_url: ar.image_url,
      role_label: ar.role,
      specialties: ar.specialty ? [ar.specialty] : [],
      accepts_assignments: true,
      delegation_notes: null,
      timezone: null,
      working_hours: null,
      out_of_office_until: null,
      current_load: 0,
      is_ready: true,
      agent_level: ar.level,
      org_role: null,
      email: null,
      created_at: ar.created_at,
      updated_at: ar.updated_at,
    }))
  }

  async findReadyHumansForOrg(supabase: SupabaseClient, orgId: string): Promise<TeamRosterEntry[]> {
    return this.listRoster(supabase, orgId, { kind: 'human', readyOnly: true })
  }

  /**
   * Personal-scope self entry: the `team_roster` view JOINs `org_members`, so a user
   * with no org membership returns null from getHumanProfile(). For personal workspaces
   * we query `profiles` directly so the user can self-assign ("Me") in the assignee picker.
   */
  async getSelfHumanEntry(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<TeamRosterEntry | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, avatar_url, functional_role, specialties, accepts_agent_assignments, timezone, working_hours, out_of_office_until, created_at, updated_at',
      )
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load self profile: ${error.message}`)
    if (!data) return null

    type ProfileRow = {
      id: string
      full_name: string | null
      email: string | null
      avatar_url: string | null
      functional_role: string | null
      specialties: string[] | null
      accepts_agent_assignments: boolean | null
      timezone: string | null
      working_hours: Record<string, { start: string; end: string }> | null
      out_of_office_until: string | null
      created_at: string | null
      updated_at: string | null
    }
    const p = data as ProfileRow
    const specialties = p.specialties ?? []
    const acceptsAssignments = p.accepts_agent_assignments ?? true
    const isReady =
      p.functional_role !== null &&
      p.functional_role !== '' &&
      specialties.length >= 1 &&
      acceptsAssignments

    return {
      participant_id: p.id,
      kind: 'human',
      org_id: null,
      user_id: p.id,
      agent_key: null,
      display_name: p.full_name ?? p.email ?? 'Me',
      avatar_url: p.avatar_url,
      role_label: p.functional_role,
      specialties,
      accepts_assignments: acceptsAssignments,
      delegation_notes: null,
      timezone: p.timezone,
      working_hours: p.working_hours,
      out_of_office_until: p.out_of_office_until,
      current_load: 0,
      is_ready: isReady,
      agent_level: null,
      org_role: null,
      email: p.email,
      created_at: p.created_at ?? new Date(0).toISOString(),
      updated_at: p.updated_at,
    }
  }

  async getHumanProfile(supabase: SupabaseClient, userId: string): Promise<TeamRosterEntry | null> {
    const { data, error } = await supabase
      .from('team_roster')
      .select('*')
      .eq('kind', 'human')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load team member: ${error.message}`)
    return (data as TeamRosterEntry | null) ?? null
  }

  async updateProfile(
    supabase: SupabaseClient,
    userId: string,
    patch: UpdateTeamProfileDto,
  ): Promise<void> {
    const payload: Record<string, unknown> = {}
    if (patch.functional_role !== undefined) payload.functional_role = patch.functional_role
    if (patch.specialties !== undefined) payload.specialties = patch.specialties
    if (patch.accepts_agent_assignments !== undefined)
      payload.accepts_agent_assignments = patch.accepts_agent_assignments
    if (patch.delegation_notes !== undefined) payload.delegation_notes = patch.delegation_notes
    if (patch.timezone !== undefined) payload.timezone = patch.timezone
    if (patch.working_hours !== undefined) payload.working_hours = patch.working_hours
    if (patch.out_of_office_until !== undefined)
      payload.out_of_office_until = patch.out_of_office_until
    payload.updated_at = new Date().toISOString()

    const { error } = await supabase.from('profiles').update(payload).eq('id', userId)
    if (error) throw new Error(`Failed to update profile: ${error.message}`)
  }

  async getMembership(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
  ): Promise<{ role: string; status: string } | null> {
    const { data, error } = await supabase
      .from('org_members')
      .select('role,status')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load membership: ${error.message}`)
    return data as { role: string; status: string } | null
  }

  async listSlackChannelMembers(
    supabase: SupabaseClient,
    actorUserId: string,
    orgId: string | null,
  ): Promise<
    Array<{ platform_id: string; display_name?: string | null; username?: string | null }>
  > {
    let query = supabase
      .from('channel_members')
      .select('platform_id,display_name,username')
      .eq('user_id', actorUserId)
      .eq('platform', 'slack')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)

    const { data, error } = await query.limit(500)
    if (error) throw new Error(error.message)
    return (data ?? []) as Array<{
      platform_id: string
      display_name?: string | null
      username?: string | null
    }>
  }
}
