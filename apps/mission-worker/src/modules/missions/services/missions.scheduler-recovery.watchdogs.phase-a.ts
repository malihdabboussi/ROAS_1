import { priorityToRank } from '../types'
import { MissionsSchedulerRecoveryCtx } from './missions.scheduler-recovery.types'

export async function resetStaleOutboxProcessingRows(ctx: MissionsSchedulerRecoveryCtx) {
  const supabase = ctx.databaseService.getClient()
  if (ctx.databaseService.hasPgPool()) {
    try {
      await ctx.databaseService.pgQuery(
        `UPDATE mission_outbox
           SET status = 'pending', updated_at = NOW()
           WHERE status = 'processing'
             AND (
               (priority_rank <= 1 AND updated_at < NOW() - INTERVAL '2 minutes')
               OR (priority_rank = 2 AND updated_at < NOW() - INTERVAL '5 minutes')
               OR (priority_rank = 3 AND updated_at < NOW() - INTERVAL '10 minutes')
               OR (priority_rank >= 4 AND updated_at < NOW() - INTERVAL '15 minutes')
             )`,
        [],
      )
    } catch (e) {
      ctx.logger.warn(`resetStaleOutboxProcessingRows PG failed: ${(e as Error).message}`)
    }
    return
  }
  const { data: processingRows } = await supabase
    .from('mission_outbox')
    .select('id, priority_rank, updated_at')
    .eq('status', 'processing')
    .limit(200)
  for (const row of processingRows || []) {
    const rankRaw = Number((row as { priority_rank?: number }).priority_rank ?? 3)
    const staleMinutes = rankRaw <= 1 ? 2 : rankRaw === 2 ? 5 : rankRaw === 3 ? 10 : 15
    const updatedAt = String((row as { updated_at?: string }).updated_at || '')
    const updatedAtMs = new Date(updatedAt).getTime()
    if (!Number.isFinite(updatedAtMs)) continue
    if (Date.now() - updatedAtMs < staleMinutes * 60_000) continue
    await supabase
      .from('mission_outbox')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', String((row as { id: string }).id))
      .eq('status', 'processing')
  }
}

/**
 * Finds pending subtasks whose scheduled_at is due (or within the next poll window)
 * and whose dependencies are satisfied, then ensures outbox events exist.
 * Catches the edge case where deps were met before the scheduled time arrived.
 */
export async function enqueueApproachingScheduledSubtasks(ctx: MissionsSchedulerRecoveryCtx) {
  const supabase = ctx.databaseService.getClient()
  const pollMs = Number(process.env.MISSIONS_WATCHDOG_MS || 900000)
  const windowEnd = new Date(Date.now() + pollMs).toISOString()

  type ScheduledRow = {
    id: string
    mission_id: string
    user_id: string
    org_id: string | null
    depends_on: string[] | null
    scheduled_at: string
  }

  let rows: ScheduledRow[] = []

  if (ctx.databaseService.hasPgPool()) {
    try {
      const result = await ctx.databaseService.pgQuery<ScheduledRow>(
        `
          SELECT s.id, s.mission_id, s.user_id, s.org_id, s.depends_on, s.scheduled_at
          FROM mission_subtasks s
          JOIN missions m ON m.id = s.mission_id
          WHERE s.status = 'pending'
            AND s.scheduled_at IS NOT NULL
            AND s.scheduled_at <= $1::timestamptz
            AND m.status IN ('todo', 'in_progress')
            AND NOT EXISTS (
              SELECT 1 FROM mission_outbox o
              WHERE o.mission_id = s.mission_id
                AND o.event_type = 'mission.subtask.execute.requested'
                AND o.dedupe_key LIKE '%:subtask:' || s.id::text || ':%'
                AND o.status IN ('pending', 'processing')
            )
          LIMIT 20
          `,
        [windowEnd],
      )
      rows = result.rows
    } catch {
      return
    }
  } else {
    const { data } = await supabase
      .from('mission_subtasks')
      .select('id, mission_id, user_id, org_id, depends_on, scheduled_at')
      .eq('status', 'pending')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', windowEnd)
      .limit(20)
    rows = (data || []) as ScheduledRow[]
  }

  for (const row of rows) {
    const deps = Array.isArray(row.depends_on) ? row.depends_on : []
    if (deps.length > 0) {
      const { data: depRows } = await supabase
        .from('mission_subtasks')
        .select('id, status')
        .in('id', deps)
      const allSatisfied = (depRows || []).every(
        (d: { status: string }) => d.status === 'done' || d.status === 'cancelled',
      )
      if (!allSatisfied) continue
    }

    const { data: missionRow } = await supabase
      .from('missions')
      .select('priority, status')
      .eq('id', row.mission_id)
      .maybeSingle()

    if (!missionRow || !['todo', 'in_progress'].includes(String(missionRow.status))) continue

    const rank = missionRow?.priority ? priorityToRank(missionRow.priority) : 3
    const { error: outboxError } = await supabase.from('mission_outbox').upsert(
      {
        mission_id: row.mission_id,
        user_id: row.user_id,
        org_id: row.org_id,
        event_type: 'mission.subtask.execute.requested',
        dedupe_key: `mission:${row.mission_id}:subtask:${row.id}:execute:scheduled`,
        payload: {
          phase: 'execute',
          subtask_id: row.id,
          requested_by: 'scheduler_scheduled_sweep',
        },
        priority_rank: rank,
        status: 'pending',
        next_attempt_at: row.scheduled_at,
      },
      { onConflict: 'dedupe_key', ignoreDuplicates: true },
    )
    if (outboxError) {
      ctx.logger.error(`Failed to enqueue scheduled subtask ${row.id}: ${outboxError.message}`)
      continue
    }

    ctx.logger.log(
      `Enqueued scheduled subtask ${row.id} for mission ${row.mission_id} (scheduled_at=${row.scheduled_at})`,
    )

    if (deps.length === 0) {
      const { data: missionInfo } = await supabase
        .from('missions')
        .select('title, scheduled_at')
        .eq('id', row.mission_id)
        .maybeSingle()
      if (missionInfo?.scheduled_at) {
        await supabase
          .from('user_notifications')
          .insert({
            user_id: row.user_id,
            org_id: row.org_id,
            type: 'mission_completed',
            title: `Scheduled mission starting: ${missionInfo.title || 'Untitled'}`,
            body: `Your scheduled mission is kicking off now.`,
            mission_id: row.mission_id,
            action_url: '/mission-control',
          })
          .then(null, () => {})
      }
    }
  }
}

/**
 * Recovers missions stuck at 'inbox' where the outbox already dispatched
 * (BullMQ job lost due to Redis restart/eviction). Re-inserts outbox event.
 */
export async function recoverStuckInboxMissions(ctx: MissionsSchedulerRecoveryCtx) {
  const supabase = ctx.databaseService.getClient()

  type StuckRow = {
    id: string
    user_id: string
    priority: string | null
    updated_at: string | null
  }
  let stuck: StuckRow[]

  const query = `
      SELECT m.id, m.user_id, m.priority, m.updated_at
      FROM missions m
      WHERE m.status = 'inbox'
        AND EXISTS (
          SELECT 1 FROM mission_outbox o
          WHERE o.mission_id = m.id
            AND o.event_type = 'mission.plan.requested'
            AND o.status = 'processed'
        )
      LIMIT 10
    `

  if (ctx.databaseService.hasPgPool()) {
    try {
      stuck = (await ctx.databaseService.pgQuery<StuckRow>(query, [])).rows
    } catch (err) {
      ctx.logger.warn(`recoverStuckInboxMissions PG failed: ${(err as Error).message}`)
      const { data } = await supabase
        .from('missions')
        .select('id, user_id, priority, updated_at')
        .eq('status', 'inbox')
        .limit(10)
      stuck = (data || []) as StuckRow[]
    }
  } else {
    const { data } = await supabase
      .from('missions')
      .select('id, user_id, priority, updated_at')
      .eq('status', 'inbox')
      .limit(10)
    stuck = (data || []) as StuckRow[]
  }

  if (!stuck?.length) return

  for (const mission of stuck) {
    if (!ctx.isPastPriorityStaleThreshold(mission.updated_at, mission.priority)) continue

    await ctx.enqueueOutboxEvent({
      missionId: String(mission.id),
      userId: String(mission.user_id),
      eventType: 'mission.plan.requested',
      dedupeKey: `mission:${mission.id}:plan:inbox-recovery`,
      requeueExistingDedupeKey: true,
      payload: { phase: 'plan', requested_by: 'inbox_stuck_recovery' },
    })
    ctx.logger.log(
      `Re-dispatched stuck inbox mission ${mission.id} (outbox was processed but mission never picked up)`,
    )
  }
}

/**
 * Missions stuck in `review` with all active subtasks done but review job/outbox lost.
 */
export async function detectStuckReviewMissions(ctx: MissionsSchedulerRecoveryCtx) {
  const supabase = ctx.databaseService.getClient()

  type StuckReviewRow = {
    id: string
    user_id: string
    priority: string | null
    updated_at: string | null
  }
  let stuck: StuckReviewRow[]

  const query = `
      SELECT m.id, m.user_id, m.priority, m.updated_at
      FROM missions m
      WHERE m.status = 'review'
        AND EXISTS (SELECT 1 FROM mission_subtasks s WHERE s.mission_id = m.id)
        AND NOT EXISTS (
          SELECT 1 FROM mission_subtasks s
          WHERE s.mission_id = m.id
            AND s.status NOT IN ('done', 'cancelled')
        )
      LIMIT 10
    `

  if (ctx.databaseService.hasPgPool()) {
    try {
      stuck = (await ctx.databaseService.pgQuery<StuckReviewRow>(query, [])).rows
    } catch (err) {
      ctx.logger.warn(`detectStuckReviewMissions PG failed: ${(err as Error).message}`)
      stuck = []
    }
  } else {
    const { data } = await supabase
      .from('missions')
      .select('id, user_id, priority, updated_at')
      .eq('status', 'review')
      .limit(20)
    const candidates = (data || []) as StuckReviewRow[]
    stuck = []
    for (const m of candidates) {
      if (!ctx.isPastPriorityStaleThreshold(m.updated_at, m.priority)) continue
      const { data: subs } = await supabase
        .from('mission_subtasks')
        .select('status')
        .eq('mission_id', m.id)
      const rows = subs || []
      if (rows.length === 0) continue
      const allDoneOrCancelled = rows.every(
        (r) => String(r.status) === 'done' || String(r.status) === 'cancelled',
      )
      if (allDoneOrCancelled) stuck.push(m)
      if (stuck.length >= 10) break
    }
  }

  if (!stuck?.length) return

  for (const mission of stuck) {
    if (!ctx.isPastPriorityStaleThreshold(mission.updated_at, mission.priority)) continue
    await ctx.enqueueOutboxEvent({
      missionId: String(mission.id),
      userId: String(mission.user_id),
      eventType: 'mission.review.requested',
      dedupeKey: `mission:${mission.id}:review:stuck-recover`,
      requeueExistingDedupeKey: true,
      payload: {
        phase: 'review',
        requested_by: 'stuck_review_watchdog',
      },
    })
    ctx.logger.warn(
      `Re-enqueued review for stuck review mission ${mission.id} (watchdog: stale updated_at, all subtasks done)`,
    )
  }
}

/**
 * Finds human subtasks past their SLA escalate time and notifies the org owner.
 * Does NOT auto-reassign — owner decides. Idempotent via sla_escalated_at.
 */
export async function escalateOverdueHumanSubtasks(ctx: MissionsSchedulerRecoveryCtx) {
  const supabase = ctx.databaseService.getClient()

  type Row = {
    id: string
    title: string | null
    mission_id: string
    user_id: string
    org_id: string | null
    assigned_user_id: string | null
    awaiting_human_since: string | null
    sla_escalate_at: string | null
  }

  const { data: rows } = await supabase
    .from('mission_subtasks')
    .select(
      'id, title, mission_id, user_id, org_id, assigned_user_id, awaiting_human_since, sla_escalate_at',
    )
    .eq('status', 'awaiting_human')
    .is('sla_escalated_at', null)
    .lt('sla_escalate_at', new Date().toISOString())
    .limit(50)

  const overdue = (rows as Row[] | null) || []
  if (overdue.length === 0) return

  for (const sub of overdue) {
    const { data: mission } = await supabase
      .from('missions')
      .select('id, title, user_id, org_id')
      .eq('id', sub.mission_id)
      .maybeSingle()
    if (!mission) continue
    const ownerUserId = (mission.user_id as string | null) ?? sub.user_id

    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', sub.assigned_user_id ?? '')
      .maybeSingle()
    const assigneeName =
      (assigneeProfile?.full_name as string | null) ??
      (assigneeProfile?.email as string | null) ??
      'a teammate'

    await supabase.from('user_notifications').insert({
      user_id: ownerUserId,
      org_id: mission.org_id ?? null,
      type: 'human_subtask_sla_escalated',
      title: `Still waiting on ${assigneeName}`,
      body: `"${sub.title || 'A subtask'}" has been open for over 48h on "${
        mission.title || 'a mission'
      }". Want to nudge them or hand it to someone else?`,
      mission_id: sub.mission_id,
      action_url: `/mission-control?mission=${sub.mission_id}`,
    })

    await supabase
      .from('mission_subtasks')
      .update({ sla_escalated_at: new Date().toISOString() })
      .eq('id', sub.id)

    ctx.logger.warn(
      `SLA-escalated human subtask ${sub.id} on mission ${sub.mission_id} (assignee=${sub.assigned_user_id ?? 'unknown'})`,
    )
    ctx.logger.log(
      `metric=human_subtask_sla_escalated mission=${sub.mission_id} subtask=${sub.id} user=${sub.assigned_user_id ?? 'unknown'}`,
    )
  }
}
