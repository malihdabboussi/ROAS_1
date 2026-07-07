import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PlanDecisionSubtaskRow = {
  id: string
  assigned_agent_key?: string | null
  assignee_type?: string | null
  assigned_user_id?: string | null
  depends_on?: unknown
  status?: string | null
  scheduled_at?: string | null
}

@Injectable()
export class MissionsPlanDecisionRepository {
  async findCampaignAgentRegistration(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, name')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data } = await query.maybeSingle()
    return data
  }

  async upsertCampaignAgent(
    supabase: SupabaseClient,
    input: {
      campaign_id: string
      user_id: string
      org_id: string | null
      agent_key: string
      name: string
      status: string
    },
  ) {
    await supabase.from('campaign_agents').upsert(input, { onConflict: 'campaign_id,agent_key' })
  }

  async listPlanDecisionSubtasks(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<PlanDecisionSubtaskRow[]> {
    let query = supabase
      .from('mission_subtasks')
      .select(
        'id, assigned_agent_key, assignee_type, assigned_user_id, depends_on, status, scheduled_at',
      )
      .eq('mission_id', missionId)
      .eq('user_id', userId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data } = await query.neq('status', 'cancelled').order('sort_order', { ascending: true })
    return (data ?? []) as PlanDecisionSubtaskRow[]
  }

  async updateSubtaskAssignedAgent(
    supabase: SupabaseClient,
    subtaskId: string,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
  ) {
    let query = supabase
      .from('mission_subtasks')
      .update({ assigned_agent_key: agentKey, updated_at: new Date().toISOString() })
      .eq('id', subtaskId)
      .eq('user_id', userId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    await query
  }

  async markSubtaskAwaitingHuman(
    supabase: SupabaseClient,
    subtaskId: string,
    nowIso: string,
    slaEscalateAt: string,
  ) {
    await supabase
      .from('mission_subtasks')
      .update({
        status: 'awaiting_human',
        awaiting_human_since: nowIso,
        sla_escalate_at: slaEscalateAt,
        updated_at: nowIso,
      })
      .eq('id', subtaskId)
  }

  async cancelIncompleteSubtasksForRejectedPlan(supabase: SupabaseClient, missionId: string) {
    await supabase
      .from('mission_subtasks')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('mission_id', missionId)
      .neq('status', 'done')
      .neq('status', 'cancelled')
  }
}
