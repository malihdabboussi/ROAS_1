import type { SupabaseClient } from '@supabase/supabase-js'
import { MISSION_MESSAGES } from '../config/messages.config'
import type { AgentKey, MissionStatus, SubtaskStatus } from '../types/missions.types'
import { MissionsRepositoryMissionsBase } from './missions-repository-missions.base'

export abstract class MissionsRepositoryPlansBase extends MissionsRepositoryMissionsBase {
  async insertMissionLog(
    supabase: SupabaseClient,
    input: {
      mission_id: string
      user_id: string
      org_id?: string | null
      event_type: string
      from_status?: MissionStatus | SubtaskStatus
      to_status?: MissionStatus | SubtaskStatus
      agent_key?: AgentKey
      correlation_id?: string
      payload?: Record<string, unknown>
    },
  ) {
    const { data, error } = await supabase
      .from('missions_logs')
      .insert({
        ...input,
        org_id: input.org_id ?? null,
        payload: input.payload || {},
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to write mission log: ${error.message}`)
    return data
  }

  async listMissionLogs(
    supabase: SupabaseClient,
    missionId: string,
    _userId: string,
    _orgId?: string | null,
  ) {
    const { data, error } = await supabase
      .from('missions_logs')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list mission logs: ${error.message}`)
    return data || []
  }

  async createPlan(
    supabase: SupabaseClient,
    input: {
      mission_id: string
      user_id: string
      org_id?: string | null
      content: Record<string, unknown>
      created_by: string
    },
  ) {
    const existing = await this.findPlanByMissionId(supabase, input.mission_id)
    if (existing) return existing

    const { data, error } = await supabase.from('missions_plans').insert(input).select('*').single()
    if (!error) return data

    const message = error.message || ''
    const details = (error as { details?: string }).details || ''
    const isDuplicateMissionPlan =
      message.includes('idx_missions_plans_mission_unique') ||
      message.includes('duplicate key value violates unique constraint') ||
      details.includes('mission_id')

    if (isDuplicateMissionPlan) {
      const retryFetch = await this.findPlanByMissionId(supabase, input.mission_id)
      if (retryFetch) return retryFetch
    }

    throw new Error(`Failed to create plan: ${error.message}`)
  }

  async findPlanByMissionId(supabase: SupabaseClient, missionId: string) {
    const { data, error } = await supabase
      .from('missions_plans')
      .select('*')
      .eq('mission_id', missionId)
      .maybeSingle()
    if (error) throw new Error(`Failed to fetch plan: ${error.message}`)
    return data
  }

  async createSubtasks(
    supabase: SupabaseClient,
    subtasks: Array<{
      id?: string
      mission_id: string
      user_id: string
      org_id?: string | null
      title: string
      assigned_agent_key: string | null
      assignee_type?: 'agent' | 'human'
      assigned_user_id?: string | null
      status?: string
      awaiting_human_since?: string | null
      sla_escalate_at?: string | null
      sort_order: number
      depends_on: string[]
      scheduled_at?: string | null
      publish_to_task_list?: boolean
      intent?: Record<string, unknown>
      output_contract?: Record<string, unknown> | null
      contract_status?: string | null
      contract_verification?: Record<string, unknown> | null
      preflight_attempts?: number
      correction_attempts?: number
    }>,
  ) {
    if (subtasks.length === 0) return []
    const { data, error } = await supabase.from('mission_subtasks').insert(subtasks).select('*')
    if (error) throw new Error(`Failed to create subtasks: ${error.message}`)
    return data || []
  }

  async listSubtasks(supabase: SupabaseClient, missionId: string) {
    const { data, error } = await supabase
      .from('mission_subtasks')
      .select('*')
      .eq('mission_id', missionId)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(`Failed to list subtasks: ${error.message}`)
    return data || []
  }

  async listSubtaskSummaryRows(supabase: SupabaseClient, missionIds: string[]) {
    const { data } = await supabase
      .from('mission_subtasks')
      .select('mission_id, status, assigned_agent_key')
      .in('mission_id', missionIds)

    return data || []
  }

  async listMissionAccessRequests(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId: string | null | undefined,
  ) {
    await this.findMissionById(supabase, missionId, userId, orgId)
    const { data, error } = await supabase
      .from('mission_agent_access_requests')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list mission access requests: ${error.message}`)
    return data || []
  }

  async approveMissionAccessRequests(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId: string | null | undefined,
    requestIds?: string[],
  ) {
    const mission = await this.findMissionById(supabase, missionId, userId, orgId)
    let pendingQuery = supabase
      .from('mission_agent_access_requests')
      .select('*')
      .eq('mission_id', missionId)
      .eq('status', 'pending')
    if (requestIds?.length) pendingQuery = pendingQuery.in('id', requestIds)
    const { data: pending, error: pendingError } = await pendingQuery
    if (pendingError)
      throw new Error(`Failed to load pending mission access requests: ${pendingError.message}`)
    if (!pending?.length)
      return { mission, approved: [], missionStatus: mission.status as MissionStatus }

    const nowIso = new Date().toISOString()
    const ids = pending.map((row: { id: string }) => row.id)
    const { data: approved, error: approveError } = await supabase
      .from('mission_agent_access_requests')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: nowIso,
        updated_at: nowIso,
      })
      .in('id', ids)
      .select('*')
    if (approveError)
      throw new Error(`Failed to approve mission access requests: ${approveError.message}`)

    const subtaskIds = [
      ...new Set(
        (pending || [])
          .map((row: { subtask_id?: string | null }) => row.subtask_id)
          .filter((id: string | null | undefined): id is string => !!id),
      ),
    ]
    if (subtaskIds.length > 0) {
      const { error: subtaskError } = await supabase
        .from('mission_subtasks')
        .update({
          status: 'pending',
          awaiting_human_since: null,
          feedback: null,
          contract_status: null,
          updated_at: nowIso,
        })
        .in('id', subtaskIds)
        .eq('mission_id', missionId)
        .in('status', ['awaiting_human', 'blocked'])
      if (subtaskError)
        throw new Error(`Failed to reopen access-gated subtasks: ${subtaskError.message}`)
    }

    const { count: pendingCount, error: countError } = await supabase
      .from('mission_agent_access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('mission_id', missionId)
      .eq('status', 'pending')
    if (countError)
      throw new Error(`Failed to count remaining mission access requests: ${countError.message}`)
    const missionStatus: MissionStatus = pendingCount ? 'awaiting_access_approval' : 'todo'
    await this.updateMissionStatus(supabase, missionId, userId, orgId, {
      status: missionStatus,
      current_agent_key: null,
      progress_notes: pendingCount
        ? MISSION_MESSAGES.ACCESS_PARTIALLY_APPROVED_PROGRESS
        : MISSION_MESSAGES.ACCESS_APPROVED_PROGRESS,
    })
    return { mission, approved: approved || [], missionStatus }
  }

  async denyMissionAccessRequests(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId: string | null | undefined,
    requestIds?: string[],
  ) {
    const mission = await this.findMissionById(supabase, missionId, userId, orgId)
    let query = supabase
      .from('mission_agent_access_requests')
      .select('*')
      .eq('mission_id', missionId)
      .eq('status', 'pending')
    if (requestIds?.length) query = query.in('id', requestIds)
    const { data: pending, error } = await query
    if (error) throw new Error(`Failed to load pending mission access requests: ${error.message}`)
    if (!pending?.length)
      return { mission, denied: [], missionStatus: mission.status as MissionStatus }
    const ids = pending.map((r: { id: string }) => r.id)
    const now = new Date().toISOString()
    const { data: denied, error: denyError } = await supabase
      .from('mission_agent_access_requests')
      .update({ status: 'denied', updated_at: now })
      .in('id', ids)
      .select('*')
    if (denyError) throw new Error(`Failed to deny mission access requests: ${denyError.message}`)
    const subtaskIds = [
      ...new Set(
        pending
          .map((r: { subtask_id?: string | null }) => r.subtask_id)
          .filter((id: string | null | undefined): id is string => !!id),
      ),
    ]
    if (subtaskIds.length)
      await supabase
        .from('mission_subtasks')
        .update({
          status: 'blocked',
          awaiting_human_since: null,
          feedback: MISSION_MESSAGES.ACCESS_DENIED_SUBTASK_FEEDBACK,
          contract_status: 'blocked',
          updated_at: now,
        })
        .in('id', subtaskIds)
        .eq('mission_id', missionId)
        .eq('status', 'awaiting_human')
    const { count } = await supabase
      .from('mission_agent_access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('mission_id', missionId)
      .eq('status', 'pending')
    const missionStatus: MissionStatus = count ? 'awaiting_access_approval' : 'blocked'
    await this.updateMissionStatus(supabase, missionId, userId, orgId, {
      status: missionStatus,
      current_agent_key: null,
      progress_notes: count
        ? MISSION_MESSAGES.ACCESS_PARTIALLY_DENIED_PROGRESS
        : MISSION_MESSAGES.ACCESS_DENIED_PROGRESS,
    })
    return { mission, denied: denied || [], missionStatus }
  }

  async getSubtaskById(
    supabase: SupabaseClient,
    subtaskId: string,
    userId: string,
    orgId: string | null | undefined,
  ) {
    const { data, error } = await this.applyOwnerScope(
      supabase.from('mission_subtasks').select('*').eq('id', subtaskId),
      userId,
      orgId,
    ).maybeSingle()
    if (error) throw new Error(`Failed to load subtask: ${error.message}`)
    return data
  }

  async updateSubtask(
    supabase: SupabaseClient,
    subtaskId: string,
    userId: string,
    orgId: string | null | undefined,
    updates: Record<string, unknown>,
  ) {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    const { data, error } = await this.applyOwnerScope(
      supabase.from('mission_subtasks').update(payload).eq('id', subtaskId),
      userId,
      orgId,
    )
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update subtask: ${error.message}`)
    return data
  }

  async reschedulePendingSubtaskExecutionOutbox(
    supabase: SupabaseClient,
    missionId: string,
    subtaskId: string,
    nextAttemptAt: string,
  ) {
    await supabase
      .from('mission_outbox')
      .update({ next_attempt_at: nextAttemptAt })
      .eq('mission_id', missionId)
      .eq('event_type', 'mission.subtask.execute.requested')
      .eq('status', 'pending')
      .like('dedupe_key', `%:subtask:${subtaskId}:%`)
  }

  async createDeliverable(
    supabase: SupabaseClient,
    input: {
      mission_id: string
      user_id: string
      org_id?: string | null
      agent_key: string
      type: string
      title: string
      content?: string
      file_url?: string
      file_name?: string
      file_size?: number
      mime_type?: string
      metadata?: Record<string, unknown>
    },
  ) {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .insert(input)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create deliverable: ${error.message}`)
    return data
  }

  async updateDeliverable(
    supabase: SupabaseClient,
    id: string,
    patch: {
      title?: string
      content?: string | null
      metadata?: Record<string, unknown>
    },
  ) {
    const { data: existing, error: fetchErr } = await supabase
      .from('mission_deliverables')
      .select('metadata')
      .eq('id', id)
      .maybeSingle()
    if (fetchErr) throw new Error(`Failed to load deliverable: ${fetchErr.message}`)
    if (!existing) throw new Error('Deliverable not found')

    const prevMeta =
      existing.metadata !== null && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {}
    const nextMeta = patch.metadata !== undefined ? { ...prevMeta, ...patch.metadata } : undefined

    const updatePayload: Record<string, unknown> = {}
    if (patch.title !== undefined) updatePayload.title = patch.title
    if (patch.content !== undefined) updatePayload.content = patch.content
    if (nextMeta !== undefined) updatePayload.metadata = nextMeta

    const { data, error } = await supabase
      .from('mission_deliverables')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update deliverable: ${error.message}`)
    return data
  }

  async listDeliverables(supabase: SupabaseClient, missionId: string) {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list deliverables: ${error.message}`)
    return data || []
  }
}
