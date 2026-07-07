import { MissionsSchedulerRecoveryCtx } from './missions.scheduler-recovery.types'

export async function runAutoRetryFailed(ctx: MissionsSchedulerRecoveryCtx): Promise<void> {
  const maxAutoRetries = 2
  const supabase = ctx.databaseService.getClient()

  let failedMissions: Array<{
    id: string
    user_id: string
    priority: string | null
    updated_at: string | null
    input: Record<string, unknown> | null
  }>
  if (ctx.databaseService.hasPgPool()) {
    try {
      const result = await ctx.databaseService.pgQuery<{
        id: string
        user_id: string
        priority: string | null
        updated_at: string | null
        input: Record<string, unknown> | null
      }>(
        `SELECT id, user_id, priority, updated_at, input FROM missions WHERE status IN ('failed', 'error') LIMIT 20`,
        [],
      )
      failedMissions = result.rows
    } catch (err) {
      ctx.logger.warn(
        `autoRetryFailed PG query failed, falling back to Supabase: ${(err as Error).message}`,
      )
      const { data } = await supabase
        .from('missions')
        .select('id, user_id, priority, updated_at, input')
        .in('status', ['failed', 'error'])
        .limit(20)
      failedMissions = (data || []) as typeof failedMissions
    }
  } else {
    const { data } = await supabase
      .from('missions')
      .select('id, user_id, priority, updated_at, input')
      .in('status', ['failed', 'error'])
      .limit(20)
    failedMissions = (data || []) as typeof failedMissions
  }

  if (!failedMissions?.length) return

  for (const mission of failedMissions) {
    if (!ctx.isPastPriorityStaleThreshold(mission.updated_at, mission.priority)) continue

    const input = mission.input && typeof mission.input === 'object' ? mission.input : {}
    const autoRetries = ((input as any)?._auto_retries as number) || 0
    if (autoRetries >= maxAutoRetries) continue

    if (ctx.databaseService.hasPgPool()) {
      try {
        await ctx.databaseService.pgQuery(
          `UPDATE mission_subtasks SET status = 'cancelled', updated_at = NOW() WHERE mission_id = $1::uuid AND status IN ('pending', 'blocked')`,
          [mission.id],
        )
      } catch (e) {
        ctx.logger.warn(`autoRetryFailed: subtask cleanup PG failed: ${(e as Error).message}`)
      }
    } else {
      await supabase
        .from('mission_subtasks')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('mission_id', mission.id)
        .in('status', ['pending', 'blocked'])
    }

    const newInput = { ...(input || {}), _auto_retries: autoRetries + 1 }
    let didUpdate = false
    if (ctx.databaseService.hasPgPool()) {
      try {
        const updateResult = await ctx.databaseService.pgQuery(
          `UPDATE missions SET status = 'inbox', retry_count = 0, error = NULL, input = $2::jsonb, updated_at = NOW() WHERE id = $1 AND status IN ('failed', 'error')`,
          [mission.id, JSON.stringify(newInput)],
        )
        didUpdate = (updateResult.rowCount || 0) > 0
      } catch {
        const { data } = await supabase
          .from('missions')
          .update({
            status: 'inbox',
            retry_count: 0,
            error: null,
            input: newInput,
            updated_at: new Date().toISOString(),
          })
          .eq('id', mission.id)
          .in('status', ['failed', 'error'])
          .select('id')
        didUpdate = (data?.length || 0) > 0
      }
    } else {
      const { data } = await supabase
        .from('missions')
        .update({
          status: 'inbox',
          retry_count: 0,
          error: null,
          input: newInput,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mission.id)
        .in('status', ['failed', 'error'])
        .select('id')
      didUpdate = (data?.length || 0) > 0
    }

    if (didUpdate) {
      await ctx.enqueueOutboxEvent({
        missionId: String(mission.id),
        userId: String(mission.user_id),
        eventType: 'mission.plan.requested',
        dedupeKey: `mission:${mission.id}:plan:auto-retry:${autoRetries + 1}`,
        requeueExistingDedupeKey: true,
        payload: { requested_by: 'auto_retry', auto_retry: autoRetries + 1 },
      })
      ctx.logger.log(
        `Auto-retried failed/error mission ${mission.id} (auto-retry ${autoRetries + 1}/${maxAutoRetries})`,
      )
    }
  }
}
