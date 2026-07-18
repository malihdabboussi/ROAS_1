import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MissionHumanSubtaskRow = Record<string, unknown>

export type MissionHumanOwnerScope = {
  user_id: string
  org_id: string | null
  correlation_id: string | null
  priority: string | null
  title: string | null
}

export type MissionHumanAdvanceSubtaskRow = {
  id: string
  status: string
  depends_on: string[] | null
  assignee_type: 'agent' | 'human'
  assigned_user_id: string | null
  scheduled_at: string | null
}

@Injectable()
export class MissionHumanSubtaskRepository {
  async loadSubtask(
    supabase: SupabaseClient,
    missionId: string,
    subtaskId: string,
  ): Promise<MissionHumanSubtaskRow | null> {
    const { data, error } = await supabase
      .from('mission_subtasks')
      .select('*')
      .eq('id', subtaskId)
      .eq('mission_id', missionId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as MissionHumanSubtaskRow | null) ?? null
  }

  async getMissionOwnerScope(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<MissionHumanOwnerScope | null> {
    const { data, error } = await supabase
      .from('missions')
      .select('user_id, org_id, correlation_id, priority, title')
      .eq('id', missionId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as MissionHumanOwnerScope | null) ?? null
  }

  async markHumanSubtaskDone(
    supabase: SupabaseClient,
    missionId: string,
    subtaskId: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    const { error } = await supabase
      .from('mission_subtasks')
      .update(payload)
      .eq('id', subtaskId)
      .eq('mission_id', missionId)
    return error?.message ?? null
  }

  async findAgentInMissionOrg(
    supabase: SupabaseClient,
    orgId: string | null,
    agentKey: string,
  ): Promise<{ agent_key: string } | null> {
    const { data } = await supabase
      .from('agents_registry')
      .select('agent_key')
      [orgId ? 'eq' : 'is']('org_id', orgId)
      .eq('agent_key', agentKey)
      .maybeSingle()
    return (data as { agent_key: string } | null) ?? null
  }

  async bounceSubtaskToAgent(
    supabase: SupabaseClient,
    missionId: string,
    subtaskId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await supabase
      .from('mission_subtasks')
      .update(payload)
      .eq('id', subtaskId)
      .eq('mission_id', missionId)
  }

  async findOrgMemberForHumanAssignment(
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
  ): Promise<{ accepts_agent_assignments?: boolean | null } | null> {
    const { data } = await supabase
      .from('profiles')
      .select('accepts_agent_assignments')
      .eq('id', userId)
      .maybeSingle()
    return (data as { accepts_agent_assignments?: boolean | null } | null) ?? null
  }

  async reassignSubtaskToHuman(
    supabase: SupabaseClient,
    missionId: string,
    subtaskId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await supabase
      .from('mission_subtasks')
      .update(payload)
      .eq('id', subtaskId)
      .eq('mission_id', missionId)
  }

  async blockHumanSubtask(
    supabase: SupabaseClient,
    missionId: string,
    subtaskId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await supabase
      .from('mission_subtasks')
      .update(payload)
      .eq('id', subtaskId)
      .eq('mission_id', missionId)
  }

  async insertSubtaskBlockedNotification(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    const { error } = await supabase.from('user_notifications').insert(payload)
    return error?.message ?? null
  }

  async listSubtasksForHumanAdvance(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<MissionHumanAdvanceSubtaskRow[]> {
    const { data } = await supabase
      .from('mission_subtasks')
      .select('id, status, depends_on, assignee_type, assigned_user_id, scheduled_at')
      .eq('mission_id', missionId)
    return (data || []) as MissionHumanAdvanceSubtaskRow[]
  }

  async moveMissionToReview(supabase: SupabaseClient, missionId: string): Promise<void> {
    await supabase
      .from('missions')
      .update({ status: 'review', updated_at: new Date().toISOString() })
      .eq('id', missionId)
  }

  async moveMissionToTodoIfAwaitingHuman(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('missions')
      .update({ status: 'todo', updated_at: new Date().toISOString() })
      .eq('id', missionId)
      .eq('status', 'awaiting_human')
    if (error) throw new Error(error.message)
  }

  async moveDependentHumanSubtaskAwaiting(
    supabase: SupabaseClient,
    subtaskId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await supabase.from('mission_subtasks').update(payload).eq('id', subtaskId)
  }
}
