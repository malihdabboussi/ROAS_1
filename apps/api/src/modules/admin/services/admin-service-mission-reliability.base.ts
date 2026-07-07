import { classifyMissionSubtaskFeedback, emptyMissionFeedbackCounts } from '@vibey/api-shared'
import { AdminErrorsTracesBase } from './admin-service-errors-traces.base'

export abstract class AdminMissionReliabilityBase extends AdminErrorsTracesBase {
  async getMissionReliability() {
    const windowDays = 14
    const staleMissionHours = 48
    const stuckOutboxMinutes = 15
    const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()
    const staleBeforeIso = new Date(Date.now() - staleMissionHours * 60 * 60 * 1000).toISOString()
    const stuckLockedBeforeIso = new Date(Date.now() - stuckOutboxMinutes * 60 * 1000).toISOString()

    const [subtasks, missions] = await Promise.all([
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('mission_subtasks')
          .select(
            'id, mission_id, user_id, org_id, status, feedback, updated_at, assigned_agent_key, created_at',
          )
          .gte('updated_at', sinceIso)
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('missions')
          .select('id, status, updated_at, org_id, assigned_agent_key')
          .gte('updated_at', sinceIso)
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
    ])

    const feedbackBuckets = emptyMissionFeedbackCounts()
    let blockedRows = 0
    let subtasksWithNonEmptyFeedback = 0
    const feedbackCountByAgent = new Map<string | null, number>()
    const subtasksByStatus: Record<string, number> = {}

    for (const row of subtasks ?? []) {
      const st = String((row as { status?: string }).status || '')
      subtasksByStatus[st || 'unknown'] = (subtasksByStatus[st || 'unknown'] ?? 0) + 1
      if (st === 'blocked') blockedRows += 1
      const f = String((row as { feedback?: string }).feedback || '')
      if (!f.trim()) continue
      subtasksWithNonEmptyFeedback += 1
      const bucket = classifyMissionSubtaskFeedback(f)
      feedbackBuckets[bucket] += 1
      const ak = (row as { assigned_agent_key?: string | null }).assigned_agent_key ?? null
      feedbackCountByAgent.set(ak, (feedbackCountByAgent.get(ak) ?? 0) + 1)
    }

    const missionsByStatus: Record<string, number> = {}
    for (const m of missions ?? []) {
      const s = String((m as { status?: string }).status || 'unknown')
      missionsByStatus[s] = (missionsByStatus[s] ?? 0) + 1
    }

    const doneMissions = missionsByStatus['done'] ?? 0
    const failedMissions =
      (missionsByStatus['error'] ?? 0) +
      (missionsByStatus['failed'] ?? 0) +
      (missionsByStatus['dead_letter'] ?? 0)
    const missionOutcomeDenominator = doneMissions + failedMissions
    const missionDoneRate =
      missionOutcomeDenominator > 0 ? doneMissions / missionOutcomeDenominator : null

    const [
      { count: staleMissionsCount, error: staleErr },
      outboxPending,
      outboxProcessing,
      outboxProcessed,
      outboxDead,
      stuckProcessing,
    ] = await Promise.all([
      this.repository
        .serviceTable('missions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['in_progress', 'review', 'planning', 'todo', 'pending_approval', 'backlog'])
        .lt('updated_at', staleBeforeIso),
      this.repository
        .serviceTable('mission_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      this.repository
        .serviceTable('mission_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing'),
      this.repository
        .serviceTable('mission_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processed'),
      this.repository
        .serviceTable('mission_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'dead_letter'),
      this.repository
        .serviceTable('mission_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing')
        .not('locked_at', 'is', null)
        .lt('locked_at', stuckLockedBeforeIso),
    ])
    if (staleErr) throw staleErr
    if (outboxPending.error) throw outboxPending.error
    if (outboxProcessing.error) throw outboxProcessing.error
    if (outboxProcessed.error) throw outboxProcessed.error
    if (outboxDead.error) throw outboxDead.error
    if (stuckProcessing.error) throw stuckProcessing.error

    const outboxByStatus = {
      pending: outboxPending.count ?? 0,
      processing: outboxProcessing.count ?? 0,
      processed: outboxProcessed.count ?? 0,
      dead_letter: outboxDead.count ?? 0,
    }

    let outboxNearMaxAttempts = 0
    let missionsLogsTotal = 0
    let missionsLogsByEventType: Record<string, number> = {}
    let missionsLogTopTransitions: { from: string | null; to: string | null; count: number }[] = []
    let subtaskTouchesByDay: { day: string; count: number }[] = []

    if (this.postgresDirect.hasConnectionString()) {
      const nearAttempts = await this.postgresDirect.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM mission_outbox
         WHERE status IN ('pending', 'processing')
         AND max_attempts > 0
         AND attempts >= GREATEST(1, max_attempts - 1)`,
      )
      outboxNearMaxAttempts = Number(nearAttempts.rows[0]?.n ?? 0)

      const logTotal = await this.postgresDirect.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM missions_logs WHERE created_at >= $1`,
        [sinceIso],
      )
      missionsLogsTotal = Number(logTotal.rows[0]?.n ?? 0)

      const logByEvent = await this.postgresDirect.query<{ event_type: string; n: string }>(
        `SELECT event_type, COUNT(*)::text AS n FROM missions_logs WHERE created_at >= $1
         GROUP BY event_type ORDER BY COUNT(*) DESC`,
        [sinceIso],
      )
      missionsLogsByEventType = Object.fromEntries(
        logByEvent.rows.map((r) => [r.event_type || 'unknown', Number(r.n)]),
      )

      const logTransitions = await this.postgresDirect.query<{
        fs: string
        ts: string
        n: string
      }>(
        `SELECT COALESCE(from_status, '') AS fs, COALESCE(to_status, '') AS ts, COUNT(*)::text AS n
         FROM missions_logs WHERE created_at >= $1
         GROUP BY 1, 2 ORDER BY COUNT(*) DESC NULLS LAST LIMIT 25`,
        [sinceIso],
      )
      missionsLogTopTransitions = logTransitions.rows.map((r) => ({
        from: r.fs.length ? r.fs : null,
        to: r.ts.length ? r.ts : null,
        count: Number(r.n),
      }))

      const touchesByDay = await this.postgresDirect.query<{ day: string; n: string }>(
        `SELECT to_char(date_trunc('day', updated_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                COUNT(*)::text AS n FROM mission_subtasks
         WHERE updated_at >= $1
         GROUP BY 1 ORDER BY 1 DESC`,
        [sinceIso],
      )
      subtaskTouchesByDay = touchesByDay.rows.map((r) => ({ day: r.day, count: Number(r.n) }))
    }

    const classifiedNonUnclassified =
      subtasksWithNonEmptyFeedback - feedbackBuckets.unclassified_feedback

    const topAgentsWithFeedback = [...feedbackCountByAgent.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([agentKey, count]) => ({ agentKey, count }))

    return {
      windowDays,
      since: sinceIso,
      subtasksTouchedInWindow: subtasks?.length ?? 0,
      sampledSubtasks: subtasks?.length ?? 0,
      missionsTouchedInWindow: missions?.length ?? 0,
      subtasksByStatus,
      missionsByStatus,
      missionCompletion: {
        done: doneMissions,
        terminalFailed: failedMissions,
        denominator: missionOutcomeDenominator,
        doneRate: missionDoneRate,
      },
      staleMissions: {
        count: staleMissionsCount ?? 0,
        thresholdHours: staleMissionHours,
        statusesObserved: [
          'in_progress',
          'review',
          'planning',
          'todo',
          'pending_approval',
          'backlog',
        ],
      },
      feedbackBuckets: { ...feedbackBuckets, blocked_rows: blockedRows } as Record<string, number>,
      feedbackSummary: {
        subtasksWithNonEmptyFeedback,
        classifiedCount: classifiedNonUnclassified,
        unclassifiedCount: feedbackBuckets.unclassified_feedback,
      },
      outbox: {
        byStatus: outboxByStatus,
        processingNow: outboxByStatus.processing,
        stuckProcessingCount: stuckProcessing.count ?? 0,
        staleLockedAfterMinutes: stuckOutboxMinutes,
        nearMaxAttempts: outboxNearMaxAttempts,
        deadLetter: outboxByStatus.dead_letter,
      },
      outboxProcessingCount: outboxByStatus.processing,
      missionsLogs: {
        totalEvents: missionsLogsTotal,
        byEventType: missionsLogsByEventType,
        topTransitions: missionsLogTopTransitions,
        aggregatesRequireDirectDb: !this.postgresDirect.hasConnectionString(),
      },
      subtaskTouchesByDay,
      topAgentsByFeedbackVolume: topAgentsWithFeedback,
    }
  }


}
