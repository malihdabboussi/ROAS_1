import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrainAccessRow, BrainShareRow } from '../services/brain-permissions.service'

@Injectable()
export class BrainPermissionsRepository {
  async loadBrain(client: SupabaseClient, brainId: string): Promise<BrainAccessRow | null> {
    const { data, error } = await client
      .from('ns_brains')
      .select('id, owner_id, org_id, scope, agent_id, created_by')
      .eq('id', brainId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load brain: ${error.message}`)
    return (data ?? null) as BrainAccessRow | null
  }

  async loadTeamIds(
    client: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<Set<string>> {
    let query = client
      .from('agent_team_members')
      .select('team_id, agent_teams!inner(org_id, user_id)')
      .eq('user_id', userId)

    if (orgId) {
      query = query.eq('agent_teams.org_id', orgId).is('agent_teams.user_id', null)
    } else {
      query = query.is('agent_teams.org_id', null).eq('agent_teams.user_id', userId)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to load team memberships: ${error.message}`)
    return new Set(((data ?? []) as Array<{ team_id: string }>).map((row) => row.team_id))
  }

  async loadShares(client: SupabaseClient, brainId: string): Promise<BrainShareRow[]> {
    const { data, error } = await client
      .from('brain_shares')
      .select('id, brain_id, org_id, entity_type, entity_id, level, created_by, created_at')
      .eq('brain_id', brainId)
    if (error) throw new Error(`Failed to load brain shares: ${error.message}`)
    return (data ?? []) as BrainShareRow[]
  }

  async listBrains(
    client: SupabaseClient,
    scope: { orgId?: string | null },
  ): Promise<BrainAccessRow[]> {
    let query = client
      .from('ns_brains')
      .select('id, owner_id, org_id, scope, agent_id, created_by')
      .order('created_at', { ascending: true })

    query = scope.orgId ? query.eq('org_id', scope.orgId) : query.is('org_id', null)

    const { data, error } = await query
    if (error) throw new Error(`Failed to list accessible brains: ${error.message}`)
    return (data ?? []) as BrainAccessRow[]
  }
}
