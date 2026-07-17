import { DatabaseService } from '../../../lib/services/database.service'
import { MissionsSchedulerRecoveryCtx } from './missions.scheduler-recovery.types'

export async function detectStalledSubtasks(ctx: MissionsSchedulerRecoveryCtx) {
  const supabase = ctx.databaseService.getClient()

  type StalledRow = {
    id: string
    mission_id: string
    assigned_agent_key: string | null
    updated_at: string | null
    execution_state: Record<string, unknown> | null
  }
  let stalledSubtasks: StalledRow[]
  if (ctx.databaseService.hasPgPool()) {
    try {
      stalledSubtasks = (
        await ctx.databaseService.pgQuery<StalledRow>(
          `SELECT id, mission_id, assigned_agent_key, updated_at::text AS updated_at, execution_state FROM mission_subtasks WHERE status = 'in_progress' LIMIT 100`,
          [],
        )
      ).rows
    } catch (err) {
      ctx.logger.warn(`detectStalledSubtasks PG failed, using Supabase: ${(err as Error).message}`)
      const { data } = await supabase
        .from('mission_subtasks')
        .select('id, mission_id, assigned_agent_key, updated_at, execution_state')
        .eq('status', 'in_progress')
        .limit(100)
      stalledSubtasks = (data || []) as StalledRow[]
    }
  } else {
    const { data } = await supabase
      .from('mission_subtasks')
      .select('id, mission_id, assigned_agent_key, updated_at, execution_state')
      .eq('status', 'in_progress')
      .limit(100)
    stalledSubtasks = (data || []) as StalledRow[]
  }
  if (!stalledSubtasks?.length) return

  const missionIds = [
    ...new Set(stalledSubtasks.map((row) => String(row.mission_id || ''))),
  ].filter(Boolean)
  type MissionRow = {
    id: string
    user_id: string
    org_id: string | null
    campaign_id: string | null
    space_id: string | null
    assigned_agent_key: string | null
    priority: string | null
  }
  let missionRows: MissionRow[]
  if (ctx.databaseService.hasPgPool()) {
    try {
      missionRows = (
        await ctx.databaseService.pgQuery<MissionRow>(
          `SELECT id, user_id, org_id, campaign_id, space_id, assigned_agent_key, priority FROM missions WHERE id = ANY($1::uuid[])`,
          [missionIds],
        )
      ).rows
    } catch {
      const { data } = await supabase
        .from('missions')
        .select('id, user_id, org_id, campaign_id, space_id, assigned_agent_key, priority')
        .in('id', missionIds)
      missionRows = (data || []) as MissionRow[]
    }
  } else {
    const { data } = await supabase
      .from('missions')
      .select('id, user_id, org_id, campaign_id, space_id, assigned_agent_key, priority')
      .in('id', missionIds)
    missionRows = (data || []) as MissionRow[]
  }

  const missionById = new Map<string, MissionRow>(
    (missionRows || []).map((row) => [String(row.id), row]),
  )

  for (const subtask of stalledSubtasks) {
    const mission = missionById.get(String(subtask.mission_id))
    if (!mission) continue
    const executionStatus =
      subtask.execution_state && typeof subtask.execution_state.execution_status === 'string'
        ? subtask.execution_state.execution_status
        : null
    if (!ctx.isPastMissionExecutionLease(subtask.updated_at, executionStatus)) continue

    const agentKey = String(subtask.assigned_agent_key || mission.assigned_agent_key || 'vibey')
    const runtime = await ctx.resolveRuntimeAgent(
      String(mission.user_id),
      agentKey,
      mission.org_id ?? null,
    )
    const sessionKey = ctx.agentRuntime.buildSubtaskSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey,
      userId: String(mission.user_id),
      subtaskId: String(subtask.id),
      campaignId: mission.campaign_id ?? null,
      spaceId: mission.space_id ?? null,
      orgId: mission.org_id ?? null,
    })
    const isActive = await ctx.openclawGateway.probeSessionActiveForUser(
      sessionKey,
      String(mission.user_id),
    )
    if (isActive) continue

    // Preserve completed_actions when possible; drop zombie current_tool so UI is not stuck.
    let completedActions: unknown[] = []
    try {
      const { data: row } = await supabase
        .from('mission_subtasks')
        .select('execution_state')
        .eq('id', subtask.id)
        .maybeSingle()
      const prev =
        row?.execution_state && typeof row.execution_state === 'object'
          ? (row.execution_state as Record<string, unknown>)
          : {}
      if (Array.isArray(prev.completed_actions)) completedActions = prev.completed_actions
    } catch {
      /* keep empty */
    }
    const queuedState = {
      completed_actions: completedActions,
      current_tool: null,
      execution_status: 'queued',
    }

    let didReclaim = false
    if (ctx.databaseService.hasPgPool()) {
      try {
        const result = await ctx.databaseService.pgQuery(
          `UPDATE mission_subtasks
           SET status = 'pending',
               updated_at = NOW(),
               feedback = NULL,
               execution_state = $3::jsonb
           WHERE id = $1
             AND updated_at = $2::timestamptz
             AND status = 'in_progress'
           RETURNING id`,
          [subtask.id, subtask.updated_at, JSON.stringify(queuedState)],
        )
        didReclaim = (result.rowCount || 0) > 0
      } catch {
        const { data, error } = await supabase
          .from('mission_subtasks')
          .update({
            status: 'pending',
            feedback: null,
            execution_state: queuedState,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subtask.id)
          .eq('updated_at', subtask.updated_at)
          .eq('status', 'in_progress')
          .select('id')
        if (error) throw new Error(error.message)
        didReclaim = (data?.length || 0) > 0
      }
    } else {
      const { data, error } = await supabase
        .from('mission_subtasks')
        .update({
          status: 'pending',
          feedback: null,
          execution_state: queuedState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subtask.id)
        .eq('updated_at', subtask.updated_at)
        .eq('status', 'in_progress')
        .select('id')
      if (error) throw new Error(error.message)
      didReclaim = (data?.length || 0) > 0
    }

    if (!didReclaim) continue

    await ctx.enqueueOutboxEvent({
      missionId: String(subtask.mission_id),
      userId: String(mission.user_id),
      eventType: 'mission.subtask.execute.requested',
      dedupeKey: `mission:${subtask.mission_id}:subtask:${subtask.id}:stalled-recover`,
      requeueExistingDedupeKey: true,
      payload: {
        phase: 'execute',
        subtask_id: String(subtask.id),
        requested_by: 'stalled_subtask_watchdog',
      },
    })

    ctx.logger.log(`Re-enqueued stalled subtask ${subtask.id} (session inactive: ${sessionKey})`)
  }
}

async function findOrphanedCandidatesViaSupabase(
  supabase: ReturnType<DatabaseService['getClient']>,
): Promise<Array<{ mission_id: string; user_id: string; priority: string | null }>> {
  const { data: pendingSubtasks } = await supabase
    .from('mission_subtasks')
    .select('mission_id')
    .eq('status', 'pending')
    .limit(50)
  if (!pendingSubtasks?.length) return []

  const missionIds = [...new Set(pendingSubtasks.map((s) => String(s.mission_id)))]
  const { data: missions } = await supabase
    .from('missions')
    .select('id, user_id, priority')
    .in('id', missionIds)
    .in('status', ['in_progress', 'todo'])
  if (!missions?.length) return []

  return missions.map((m) => ({
    mission_id: String(m.id),
    user_id: String(m.user_id),
    priority: (m.priority as string | null) ?? null,
  }))
}

async function hasExistingOutboxEventViaSupabase(
  supabase: ReturnType<DatabaseService['getClient']>,
  missionId: string,
  subtaskId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('mission_outbox')
    .select('id, payload')
    .eq('mission_id', missionId)
    .eq('event_type', 'mission.subtask.execute.requested')
    .in('status', ['pending', 'processing'])
    .limit(50)
  return (data || []).some((e) => (e.payload as Record<string, unknown>)?.subtask_id === subtaskId)
}

export async function detectOrphanedPendingSubtasks(ctx: MissionsSchedulerRecoveryCtx) {
  const supabase = ctx.databaseService.getClient()

  type CandidateRow = { mission_id: string; user_id: string; priority: string | null }
  let candidateMissions: CandidateRow[]

  if (ctx.databaseService.hasPgPool()) {
    try {
      candidateMissions = (
        await ctx.databaseService.pgQuery<CandidateRow>(
          `SELECT DISTINCT ms.mission_id, m.user_id, m.priority FROM mission_subtasks ms JOIN missions m ON m.id = ms.mission_id WHERE ms.status = 'pending' AND m.status IN ('in_progress', 'todo') LIMIT 100`,
          [],
        )
      ).rows
    } catch (err) {
      ctx.logger.warn(
        `detectOrphanedPendingSubtasks PG failed, using Supabase: ${(err as Error).message}`,
      )
      candidateMissions = await findOrphanedCandidatesViaSupabase(supabase)
    }
  } else {
    candidateMissions = await findOrphanedCandidatesViaSupabase(supabase)
  }
  if (!candidateMissions?.length) return

  for (const { mission_id, user_id, priority } of candidateMissions) {
    type SubtaskRow = {
      id: string
      status: string
      depends_on: string[] | null
      updated_at: string | null
      execution_state: Record<string, unknown> | null
    }
    let subtasks: SubtaskRow[]
    if (ctx.databaseService.hasPgPool()) {
      try {
        subtasks = (
          await ctx.databaseService.pgQuery<SubtaskRow>(
            `SELECT id, status, depends_on, updated_at, execution_state FROM mission_subtasks WHERE mission_id = $1::uuid ORDER BY sort_order ASC`,
            [mission_id],
          )
        ).rows
      } catch {
        const { data } = await supabase
          .from('mission_subtasks')
          .select('id, status, depends_on, updated_at, execution_state')
          .eq('mission_id', mission_id)
          .order('sort_order', { ascending: true })
        subtasks = (data || []) as SubtaskRow[]
      }
    } else {
      const { data } = await supabase
        .from('mission_subtasks')
        .select('id, status, depends_on, updated_at, execution_state')
        .eq('mission_id', mission_id)
        .order('sort_order', { ascending: true })
      subtasks = (data || []) as SubtaskRow[]
    }

    const statusById = new Map(subtasks.map((st) => [String(st.id), String(st.status)]))

    const depSatisfied = (depId: string) => {
      const st = statusById.get(String(depId))
      return st === 'done' || st === 'cancelled'
    }

    for (const subtask of subtasks) {
      if (subtask.status !== 'pending') continue
      const executionStatus =
        subtask.execution_state && typeof subtask.execution_state.execution_status === 'string'
          ? subtask.execution_state.execution_status
          : null
      if (!ctx.isPastMissionExecutionLease(subtask.updated_at, executionStatus)) continue
      const deps = Array.isArray(subtask.depends_on) ? subtask.depends_on : []
      if (!deps.every(depSatisfied)) continue

      let hasExistingEvent = false
      if (ctx.databaseService.hasPgPool()) {
        try {
          const { rows } = await ctx.databaseService.pgQuery<{ id: string }>(
            `SELECT id FROM mission_outbox WHERE mission_id = $1::uuid AND event_type = 'mission.subtask.execute.requested' AND payload->>'subtask_id' = $2::text AND status IN ('pending', 'processing') LIMIT 1`,
            [mission_id, subtask.id],
          )
          hasExistingEvent = rows.length > 0
        } catch {
          hasExistingEvent = await hasExistingOutboxEventViaSupabase(
            supabase,
            mission_id,
            subtask.id,
          )
        }
      } else {
        hasExistingEvent = await hasExistingOutboxEventViaSupabase(supabase, mission_id, subtask.id)
      }
      if (hasExistingEvent) continue

      await ctx.enqueueOutboxEvent({
        missionId: mission_id,
        userId: user_id,
        eventType: 'mission.subtask.execute.requested',
        dedupeKey: `mission:${mission_id}:subtask:${subtask.id}:orphaned-recover`,
        requeueExistingDedupeKey: true,
        payload: {
          phase: 'execute',
          subtask_id: subtask.id,
          requested_by: 'orphaned_pending_watchdog',
        },
      })

      ctx.logger.log(`Re-enqueued orphaned pending subtask ${subtask.id} for mission ${mission_id}`)
    }
  }
}

export async function detectStalledLegacyMissions(ctx: MissionsSchedulerRecoveryCtx) {
  const supabase = ctx.databaseService.getClient()

  type MissionRow = {
    id: string
    user_id: string
    org_id: string | null
    campaign_id: string | null
    space_id: string | null
    assigned_agent_key: string | null
    plan_id: string | null
    priority: string | null
    updated_at: string | null
  }
  let stalledMissions: MissionRow[]
  if (ctx.databaseService.hasPgPool()) {
    try {
      stalledMissions = (
        await ctx.databaseService.pgQuery<MissionRow>(
          `SELECT id, user_id, org_id, campaign_id, space_id, assigned_agent_key, plan_id, priority, updated_at FROM missions WHERE status = 'in_progress' LIMIT 100`,
          [],
        )
      ).rows
    } catch (err) {
      ctx.logger.warn(
        `detectStalledLegacyMissions PG failed, using Supabase: ${(err as Error).message}`,
      )
      const { data } = await supabase
        .from('missions')
        .select(
          'id, user_id, org_id, campaign_id, space_id, assigned_agent_key, plan_id, priority, updated_at',
        )
        .eq('status', 'in_progress')
        .limit(100)
      stalledMissions = (data || []) as MissionRow[]
    }
  } else {
    const { data } = await supabase
      .from('missions')
      .select(
        'id, user_id, org_id, campaign_id, space_id, assigned_agent_key, plan_id, priority, updated_at',
      )
      .eq('status', 'in_progress')
      .limit(100)
    stalledMissions = (data || []) as MissionRow[]
  }
  if (!stalledMissions?.length) return

  for (const mission of stalledMissions) {
    if (mission.plan_id) continue
    if (!ctx.isPastPriorityStaleThreshold(mission.updated_at, mission.priority)) continue

    let subtaskCount = 0
    if (ctx.databaseService.hasPgPool()) {
      try {
        const result = await ctx.databaseService.pgQuery<{ id: string }>(
          `SELECT id FROM mission_subtasks WHERE mission_id = $1 LIMIT 1`,
          [mission.id],
        )
        subtaskCount = result.rowCount || 0
      } catch {
        const { data } = await supabase
          .from('mission_subtasks')
          .select('id')
          .eq('mission_id', mission.id)
          .limit(1)
        subtaskCount = data?.length || 0
      }
    } else {
      const { data } = await supabase
        .from('mission_subtasks')
        .select('id')
        .eq('mission_id', mission.id)
        .limit(1)
      subtaskCount = data?.length || 0
    }
    if (subtaskCount > 0) continue

    const agentKey = String(mission.assigned_agent_key || 'vibey')
    const runtime = await ctx.resolveRuntimeAgent(
      String(mission.user_id),
      agentKey,
      mission.org_id ?? null,
    )
    const sessionKey = ctx.agentRuntime.buildMissionSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey,
      userId: String(mission.user_id),
      missionId: String(mission.id),
      campaignId: mission.campaign_id ?? null,
      spaceId: mission.space_id ?? null,
      orgId: mission.org_id ?? null,
    })
    const isActive = await ctx.openclawGateway.probeSessionActiveForUser(
      sessionKey,
      String(mission.user_id),
    )
    if (isActive) continue

    if (ctx.databaseService.hasPgPool()) {
      try {
        await ctx.databaseService.pgQuery(
          `UPDATE missions SET status = 'todo', updated_at = NOW() WHERE id = $1 AND status = 'in_progress'`,
          [mission.id],
        )
      } catch {
        await supabase
          .from('missions')
          .update({ status: 'todo', updated_at: new Date().toISOString() })
          .eq('id', mission.id)
          .eq('status', 'in_progress')
      }
    } else {
      await supabase
        .from('missions')
        .update({ status: 'todo', updated_at: new Date().toISOString() })
        .eq('id', mission.id)
        .eq('status', 'in_progress')
    }

    await ctx.enqueueOutboxEvent({
      missionId: String(mission.id),
      userId: String(mission.user_id),
      eventType: 'mission.execute.requested',
      dedupeKey: `mission:${mission.id}:execute:stalled-recover`,
      requeueExistingDedupeKey: true,
      payload: {
        phase: 'execute',
        requested_by: 'stalled_legacy_watchdog',
      },
    })

    ctx.logger.log(`Re-enqueued stalled mission ${mission.id} (session inactive: ${sessionKey})`)
  }
}
