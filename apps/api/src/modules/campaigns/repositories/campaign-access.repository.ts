import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CampaignAccessRepository {
  async findAgentRegistryEntry(
    supabase: SupabaseClient,
    agentKey: string,
    userId: string,
    orgId?: string | null,
    select = 'agent_key, name',
  ): Promise<Record<string, unknown> | null> {
    let query = supabase.from('agents_registry').select(select).eq('agent_key', agentKey)
    query = orgId
      ? query.eq('org_id', orgId).is('user_id', null)
      : query.eq('user_id', userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return (data as Record<string, unknown> | null) ?? null
  }

  async findCampaignBrain(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('campaign_id', campaignId)
      .maybeSingle()
    return (data as Record<string, unknown> | null) ?? null
  }

  async createCampaignBrain(
    supabase: SupabaseClient,
    record: {
      owner_id: string
      campaign_id: string
      name: string
      is_default: boolean
      color: string
      icon: string
      tags: string[]
      org_id?: string | null
    },
  ) {
    return supabase.from('ns_brains').insert(record)
  }

  async createCampaignBrainReturningId(
    supabase: SupabaseClient,
    record: {
      owner_id: string
      org_id?: string | null
      campaign_id: string
      name: string
      is_default: boolean
    },
  ) {
    const { data, error } = await supabase
      .from('ns_brains')
      .insert(record)
      .select('id')
      .maybeSingle()
    return { data, error }
  }

  async listUserState(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('campaign_user_state')
      .select('campaign_id, is_favorite, is_hidden, updated_at')
      .eq('user_id', userId)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async upsertUserState(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('campaign_user_state')
      .upsert(payload, { onConflict: 'user_id,campaign_id' })
      .select('campaign_id, is_favorite, is_hidden, updated_at')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findOrgMembership(supabase: SupabaseClient, orgId: string, userId: string) {
    const { data } = await supabase
      .from('org_members')
      .select('id, role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    return data ?? null
  }

  async listOrgCampaignPermissions(supabase: SupabaseClient, orgMemberId: string) {
    const { data } = await supabase
      .from('org_campaign_permissions')
      .select('campaign_id, permission')
      .eq('org_member_id', orgMemberId)
    return data ?? []
  }

  async listProfilesByIds(supabase: SupabaseClient, ownerIds: string[]) {
    if (ownerIds.length === 0) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', ownerIds)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async listAgentRegistryEntries(
    supabase: SupabaseClient,
    keys: string[],
    ownerId: string,
    orgId?: string | null,
  ): Promise<Array<Record<string, unknown>>> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, name, role, level, image_url, config')
      .in('agent_key', keys)
    query = orgId
      ? query.eq('org_id', orgId).is('user_id', null)
      : query.eq('user_id', ownerId).is('org_id', null)
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listAssignedAccessibleCampaignIds(
    supabase: SupabaseClient,
    userId: string,
    assignedCampaignIds: string[],
    orgId?: string | null,
  ): Promise<string[]> {
    if (assignedCampaignIds.length === 0) return []
    let query = supabase
      .from('campaigns')
      .select('id')
      .is('deleted_at', null)
      .neq('status', 'archived')
      .in('id', assignedCampaignIds)
    if (orgId !== undefined)
      query = orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId).is('org_id', null)
    else query = query.eq('user_id', userId)
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []).map((row) => String(row.id))
  }

  async userBelongsToAgentTeam(
    supabase: SupabaseClient,
    userId: string,
    teamId: string,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('agent_team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return Boolean(data?.team_id)
  }
}
