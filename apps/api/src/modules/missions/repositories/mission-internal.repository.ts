import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MissionInternalAgentRegistration = {
  agent_key: string
  is_active?: boolean | null
}

export type MissionInternalSubtaskStatusRow = {
  id: string
  status: string
  depends_on: string[] | null
}

@Injectable()
export class MissionInternalRepository {
  async findOrgMemberForAssignment(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
  ): Promise<{ user_id: string; status: string } | null> {
    const { data } = await supabase
      .from('org_members')
      .select('user_id,status')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()
    return (data as { user_id: string; status: string } | null) ?? null
  }

  async findProfileAssignmentPreference(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{
    accepts_agent_assignments?: boolean | null
    functional_role?: string | null
    specialties?: unknown
  } | null> {
    const { data } = await supabase
      .from('profiles')
      .select('accepts_agent_assignments,functional_role,specialties')
      .eq('id', userId)
      .maybeSingle()
    return (
      (data as {
        accepts_agent_assignments?: boolean | null
        functional_role?: string | null
        specialties?: unknown
      } | null) ?? null
    )
  }

  async findScopedAgentRegistration(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<MissionInternalAgentRegistration | null> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, is_active')
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Agent lookup failed: ${error.message}`)
    return (data as MissionInternalAgentRegistration | null) ?? null
  }

  async findAwarenessSubtask(
    supabase: SupabaseClient,
    input: { subtaskId: string; missionId: string; userId: string },
  ): Promise<{
    id: string
    mission_id: string
    user_id: string
    scheduled_at?: string | null
  } | null> {
    const { data, error } = await supabase
      .from('mission_subtasks')
      .select('id, mission_id, user_id, scheduled_at')
      .eq('id', input.subtaskId)
      .eq('mission_id', input.missionId)
      .eq('user_id', input.userId)
      .maybeSingle()
    if (error) throw new Error(`Subtask lookup failed: ${error.message}`)
    return (
      (data as {
        id: string
        mission_id: string
        user_id: string
        scheduled_at?: string | null
      } | null) ?? null
    )
  }

  async findActiveAgentChannel(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; channelType: 'telegram' | 'slack' },
  ): Promise<{ provider_config?: Record<string, unknown> | null } | null> {
    const { data, error } = await supabase
      .from('agent_channels')
      .select('provider_config')
      .eq('user_id', input.userId)
      .eq('agent_key', input.agentKey)
      .eq('channel_type', input.channelType)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load ${input.channelType} channel: ${error.message}`)
    return (data as { provider_config?: Record<string, unknown> | null } | null) ?? null
  }

  async findLatestConversationMetadata(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string },
  ): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('user_id', input.userId)
      .eq('agent_id', input.agentKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const metadata = (data as { metadata?: unknown } | null)?.metadata
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : null
  }

  async findMissionLogByIdempotencyKey(
    supabase: SupabaseClient,
    input: { missionId: string; eventType: string; idempotencyKey: string },
  ): Promise<{ id: string } | null> {
    const { data } = await supabase
      .from('missions_logs')
      .select('id')
      .eq('mission_id', input.missionId)
      .eq('event_type', input.eventType)
      .filter('payload->>idempotency_key', 'eq', input.idempotencyKey)
      .limit(1)
      .maybeSingle()
    return (data as { id: string } | null) ?? null
  }

  async countActiveSubtasksForMission(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<number> {
    const { count } = await supabase
      .from('mission_subtasks')
      .select('id', { count: 'exact', head: true })
      .eq('mission_id', missionId)
      .not('status', 'in', '("done","cancelled")')
    return count ?? 0
  }

  async findUserAutoApprovePlans(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('auto_approve_plans')
      .eq('id', userId)
      .maybeSingle()
    return (data as { auto_approve_plans?: boolean } | null)?.auto_approve_plans === true
  }

  async countPlanApprovalRounds(supabase: SupabaseClient, missionId: string): Promise<number> {
    const { count } = await supabase
      .from('missions_logs')
      .select('id', { count: 'exact', head: true })
      .eq('mission_id', missionId)
      .eq('event_type', 'mission.plan.pending_approval')
    return count ?? 0
  }

  async insertPlanApprovalNotification(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id?: string | null
      title: string
      body: string
      mission_id: string
    },
  ): Promise<string | null> {
    const { error } = await supabase.from('user_notifications').insert({
      user_id: input.user_id,
      org_id: input.org_id ?? null,
      type: 'plan_approval_required',
      title: input.title,
      body: input.body,
      mission_id: input.mission_id,
    })
    return error?.message ?? null
  }

  async findLatestSubtaskSortOrder(supabase: SupabaseClient, missionId: string): Promise<number> {
    const { data } = await supabase
      .from('mission_subtasks')
      .select('id, sort_order, status')
      .eq('mission_id', missionId)
      .order('sort_order', { ascending: false })
      .limit(1)
    return (Array.isArray(data) ? data[0]?.sort_order : undefined) ?? -1
  }

  async listActiveSubtaskIds(supabase: SupabaseClient, missionId: string): Promise<Set<string>> {
    const { data } = await supabase
      .from('mission_subtasks')
      .select('id, status')
      .eq('mission_id', missionId)
    const ids = new Set<string>()
    for (const row of (data || []) as Array<{ id: string; status: string }>) {
      if (String(row.status) !== 'cancelled') ids.add(String(row.id))
    }
    return ids
  }

  async cancelIncompleteSubtasksForMission(
    supabase: SupabaseClient,
    missionId: string,
    updatedAt: string,
  ): Promise<number> {
    const { data } = await supabase
      .from('mission_subtasks')
      .update({ status: 'cancelled', updated_at: updatedAt })
      .eq('mission_id', missionId)
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .select('id')
    return Array.isArray(data) ? data.length : 0
  }

  async updateMissionForReplan(
    supabase: SupabaseClient,
    input: {
      missionId: string
      userId: string
      managerKey: string
      missionInput: Record<string, unknown>
      updatedAt: string
    },
  ): Promise<void> {
    await supabase
      .from('missions')
      .update({
        status: 'planning',
        current_agent_key: input.managerKey,
        input: input.missionInput,
        updated_at: input.updatedAt,
      })
      .eq('id', input.missionId)
      .eq('user_id', input.userId)
  }

  async listSubtaskStatusesForAggregate(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<MissionInternalSubtaskStatusRow[]> {
    const { data, error } = await supabase
      .from('mission_subtasks')
      .select('id,status,depends_on')
      .eq('mission_id', missionId)
    if (error) throw new Error(error.message)
    return (data || []) as MissionInternalSubtaskStatusRow[]
  }

  async findManagerSubtask(
    supabase: SupabaseClient,
    input: { subtaskId: string; missionId: string; userId: string },
    select: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('mission_subtasks')
      .select(select)
      .eq('id', input.subtaskId)
      .eq('mission_id', input.missionId)
      .eq('user_id', input.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async listSubtasksForCancellation(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<Array<{ id: string; depends_on: string[] | null }>> {
    const { data, error } = await supabase
      .from('mission_subtasks')
      .select('id, depends_on')
      .eq('mission_id', missionId)
    if (error) throw new Error(error.message)
    return (data || []) as Array<{ id: string; depends_on: string[] | null }>
  }

  async listSubtasksForRetryCascade(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<Array<{ id: string; status: string; depends_on: string[] | null }>> {
    const { data, error } = await supabase
      .from('mission_subtasks')
      .select('id, status, depends_on')
      .eq('mission_id', missionId)
    if (error) throw new Error(error.message)
    return (data || []) as Array<{ id: string; status: string; depends_on: string[] | null }>
  }

  async cancelSubtasksByIds(
    supabase: SupabaseClient,
    subtaskIds: string[],
    updatedAt: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('mission_subtasks')
      .update({ status: 'cancelled', updated_at: updatedAt })
      .in('id', subtaskIds)
    if (error) throw new Error(error.message)
  }

  async updateSubtaskById(
    supabase: SupabaseClient,
    subtaskId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('mission_subtasks').update(updates).eq('id', subtaskId)
    if (error) throw new Error(error.message)
  }

  async resetSubtasksForRetry(
    supabase: SupabaseClient,
    subtaskIds: string[],
    updatedAt: string,
  ): Promise<void> {
    const { data: existingRows, error: readError } = await supabase
      .from('mission_subtasks')
      .select('id, execution_state, output_contract')
      .in('id', subtaskIds)
    if (readError) throw new Error(readError.message)

    for (const row of existingRows || []) {
      const prev =
        row.execution_state && typeof row.execution_state === 'object'
          ? (row.execution_state as Record<string, unknown>)
          : {}
      const completedActions = Array.isArray(prev.completed_actions) ? prev.completed_actions : []
      const { error } = await supabase
        .from('mission_subtasks')
        .update({
          status: 'pending',
          feedback: null,
          awaiting_human_since: null,
          sla_escalate_at: null,
          contract_status: row.output_contract ? 'pending' : null,
          contract_verification: null,
          preflight_attempts: 0,
          correction_attempts: 0,
          // Drop zombie current_tool / partial stream so UI does not show a dead step as "working"
          execution_state: {
            completed_actions: completedActions,
            current_tool: null,
            execution_status: 'queued',
          },
          updated_at: updatedAt,
        })
        .eq('id', String(row.id))
      if (error) throw new Error(error.message)
    }
  }
}
