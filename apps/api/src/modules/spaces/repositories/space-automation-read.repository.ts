import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SpaceAutomationReadRepository {
  async findLatestFathomIntegration(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase
      .from('user_integrations')
      .select('id, status, scope_mode, org_id')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .order('updated_at', { ascending: false })
      .limit(1)
    return (data ?? [])[0] ?? null
  }

  async listOrgSharedFathomIntegrations(supabase: SupabaseClient, orgId: string) {
    const { data } = await supabase
      .from('user_integrations')
      .select('id, user_id')
      .eq('integration_id', 'fathom')
      .eq('status', 'connected')
      .eq('scope_mode', 'org_shared')
      .eq('org_id', orgId)
    return (data ?? []) as Array<{ id: string; user_id: string }>
  }

  async listProfiles(supabase: SupabaseClient, userIds: string[]) {
    if (userIds.length === 0) {
      return [] as Array<{ id: string; full_name?: string; email?: string }>
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
    return (data ?? []) as Array<{ id: string; full_name?: string; email?: string }>
  }

  async listAgentTeams(supabase: SupabaseClient, orgId: string) {
    const { data } = await supabase
      .from('agent_teams')
      .select('id, name, color, icon')
      .eq('org_id', orgId)
      .order('name', { ascending: true })
    return (data ?? []) as Array<{
      id: string
      name: string
      color: string | null
      icon: string | null
    }>
  }

  async listAgentTeamMembers(supabase: SupabaseClient, teamIds: string[]) {
    if (teamIds.length === 0) return [] as Array<{ team_id: string; user_id: string }>
    const { data } = await supabase
      .from('agent_team_members')
      .select('team_id, user_id')
      .in('team_id', teamIds)
    return (data ?? []) as Array<{ team_id: string; user_id: string }>
  }

  async listConnectedFathomUserIds(
    supabase: SupabaseClient,
    userIds: string[],
  ): Promise<Set<string>> {
    if (userIds.length === 0) return new Set()
    const { data } = await supabase
      .from('user_integrations')
      .select('user_id')
      .eq('integration_id', 'fathom')
      .eq('status', 'connected')
      .in('user_id', userIds)
    return new Set(((data ?? []) as Array<{ user_id: string }>).map((row) => String(row.user_id)))
  }

  async listRuns(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('space_automation_runs')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async listRunsForOrg(
    supabase: SupabaseClient,
    orgId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ) {
    let query = supabase
      .from('space_automation_runs')
      .select('*, spaces!inner(id, title, campaign_id, org_id)')
      .eq('spaces.org_id', orgId)

    if (filters.spaceId) query = query.eq('space_id', filters.spaceId)
    if (filters.campaignId) query = query.eq('spaces.campaign_id', filters.campaignId)

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async listRunsForPersonalUser(
    supabase: SupabaseClient,
    userId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ) {
    let query = supabase
      .from('space_automation_runs')
      .select('*, spaces!inner(id, title, campaign_id, org_id, user_id)')
      .eq('spaces.user_id', userId)
      .is('spaces.org_id', null)

    if (filters.spaceId) query = query.eq('space_id', filters.spaceId)
    if (filters.campaignId) query = query.eq('spaces.campaign_id', filters.campaignId)

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }
}
