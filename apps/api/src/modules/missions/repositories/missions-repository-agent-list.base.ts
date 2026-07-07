import type { SupabaseClient } from '@supabase/supabase-js'
import { isVisibleInOrgAgentList } from '../lib/system-agent-keys'
import { MissionsRepositoryPlansBase } from './missions-repository-plans.base'

export abstract class MissionsRepositoryAgentListBase extends MissionsRepositoryPlansBase {
  async listDeliverablesForMissions(supabase: SupabaseClient, missionIds: string[]) {
    if (missionIds.length === 0) return []
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('*')
      .in('mission_id', missionIds)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to batch-list deliverables: ${error.message}`)
    return data || []
  }

  async findPrimaryManagerKey(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key')
      .in('level', ['c_level', 'manager'])
      .order('created_at', { ascending: true })
      .limit(1)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data } = await query.maybeSingle()
    return data?.agent_key ?? 'vibey'
  }

  async listOrgAgents(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    let query = supabase
      .from('agents_registry')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.or('is_active.eq.true,level.neq.system')
    if (error) throw new Error(`Failed to list org agents: ${error.message}`)
    return (data || []).filter((row) => isVisibleInOrgAgentList(String(row.agent_key), orgId))
  }

  async listOrgAgentsSlim(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    let query = supabase
      .from('agents_registry')
      .select(
        'id, agent_key, name, image_url, is_active, status, updated_at, level, team_id, role, sort_order',
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.or('is_active.eq.true,level.neq.system')
    if (error) throw new Error(`Failed to list slim org agents: ${error.message}`)
    return (data || []).filter((row) => isVisibleInOrgAgentList(String(row.agent_key), orgId))
  }

  async reorderAgents(
    supabase: SupabaseClient,
    userId: string,
    agentKeys: string[],
    orgId?: string | null,
  ) {
    const updates = agentKeys.map((key, idx) => {
      let q = supabase.from('agents_registry').update({ sort_order: idx }).eq('agent_key', key)
      if (orgId) {
        q = q.eq('org_id', orgId).is('user_id', null)
      } else {
        q = q.eq('user_id', userId).is('org_id', null)
      }
      return q
    })
    await Promise.all(updates)
  }
}
