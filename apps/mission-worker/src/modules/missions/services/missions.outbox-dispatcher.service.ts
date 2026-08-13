import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Queue } from 'bullmq'
import type { PoolClient } from 'pg'
import { DatabaseService } from '../../../lib/services/database.service'
import { WorkerLoggerService } from '../../logger'
import { MISSIONS_QUEUE } from '../types'
import { AgentSignalService } from './agent-signal.service'
import { HumanSubtaskNotifierService } from './human-subtask-notifier.service'
import {
  allowedStatusesForOutboxEvent,
  mapOutboxEventToJob,
  type OutboxEventRow,
} from './missions.outbox-dispatcher.mapping'

@Injectable()
export class MissionsOutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MissionsOutboxDispatcherService.name)
  private listenerClient: PoolClient | null = null
  private reconcileTimer: NodeJS.Timeout | null = null
  private dispatchInFlight = false
  private consecutiveDispatchFailures = 0
  private circuitOpenUntil = 0

  constructor(
    @InjectQueue(MISSIONS_QUEUE) private readonly missionsQueue: Queue,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly agentSignalService: AgentSignalService,
    private readonly humanSubtaskNotifier: HumanSubtaskNotifierService,
    @Optional() private readonly workerLogger?: WorkerLoggerService,
  ) {}

  async onModuleInit() {
    await this.setupOutboxNotifyListener()
    this.startReconcileSweep()
    await this.dispatchDueEvents()
  }

  async onModuleDestroy() {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer)
      this.reconcileTimer = null
    }

    if (this.listenerClient) {
      try {
        await this.listenerClient.query('UNLISTEN mission_outbox_new')
      } catch (error) {
        this.logger.warn(`Failed to unlisten mission_outbox_new: ${(error as Error).message}`)
      }
      this.listenerClient.release()
      this.listenerClient = null
    }
  }

  async dispatchDueEvents() {
    if (this.dispatchInFlight) return
    if (Date.now() < this.circuitOpenUntil) return

    this.dispatchInFlight = true
    const batchSize = Number(this.configService.get<number>('missions.batchSize') || 20)
    try {
      const rows = await this.claimPendingRows(batchSize)
      if (!rows.length) {
        this.consecutiveDispatchFailures = 0
        return
      }

      for (const row of rows) {
        try {
          const dispatched = await this.publishToQueue(row)
          if (dispatched) {
            await this.markProcessed(row.id)
          }
        } catch (error) {
          await this.markRetry(
            row,
            error instanceof Error ? error.message : 'Unknown dispatch error',
          )
        }
      }
      this.consecutiveDispatchFailures = 0
    } catch (error) {
      let recoveredByFallback = false
      if (this.isDbTransportError(error)) {
        await this.dispatchViaSupabaseFallback(batchSize)
        recoveredByFallback = true
        this.consecutiveDispatchFailures = 0
        return
      }
      this.consecutiveDispatchFailures += 1
      const threshold = Number(
        this.configService.get<number>('missions.outboxCircuitBreakerFailures') || 5,
      )
      const openMs = Number(
        this.configService.get<number>('missions.outboxCircuitBreakerMs') || 30000,
      )
      if (this.consecutiveDispatchFailures >= threshold) {
        this.circuitOpenUntil = Date.now() + openMs
        this.logger.error(
          `Outbox circuit opened for ${openMs}ms after ${this.consecutiveDispatchFailures} failures`,
        )
      }
      if (!recoveredByFallback) {
        this.reportOutboxError(
          'MISSIONS_OUTBOX_DISPATCH_LOOP_FAILED',
          'Outbox dispatch loop failed',
          error,
        )
      }
    } finally {
      this.dispatchInFlight = false
    }
  }

  private isDbTransportError(error: unknown): boolean {
    const message = String((error as Error)?.message || '')
    return /self-signed certificate|password authentication failed|ECONNREFUSED|connection timeout|Connection terminated/i.test(
      message,
    )
  }

  private getScopedMissionId(): string | null {
    const scopedMissionId = process.env.MISSIONS_OUTBOX_MISSION_ID?.trim()
    return scopedMissionId ? scopedMissionId : null
  }

  private async dispatchViaSupabaseFallback(batchSize: number) {
    const rows = await this.claimPendingRowsViaSupabase(batchSize)
    if (!rows.length) return
    for (const row of rows) {
      try {
        const dispatched = await this.publishToQueue(row)
        if (dispatched) {
          await this.markProcessed(row.id)
        }
      } catch (error) {
        await this.markRetry(row, error instanceof Error ? error.message : 'Unknown dispatch error')
      }
    }
  }

  private async setupOutboxNotifyListener() {
    if (!this.databaseService.hasPgPool()) {
      this.logger.warn('Outbox LISTEN/NOTIFY disabled: SUPABASE_DIRECT_DB_URL is not configured')
      return
    }

    try {
      this.listenerClient = await this.databaseService.getPgPool().connect()
      await this.listenerClient.query('LISTEN mission_outbox_new')
      this.listenerClient.on('notification', (message) => {
        if (message.channel !== 'mission_outbox_new') return
        this.dispatchDueEvents().catch((error) => {
          this.reportOutboxError(
            'MISSIONS_OUTBOX_NOTIFY_DISPATCH_FAILED',
            'Outbox notify dispatch failed',
            error,
          )
        })
      })
      this.listenerClient.on('error', (error) => {
        this.reportOutboxError(
          'MISSIONS_OUTBOX_LISTENER_CLIENT_ERROR',
          'Outbox listener client error',
          error,
        )
      })
      this.logger.log('Outbox listener armed (channel=mission_outbox_new)')
    } catch (error) {
      if (this.isDbTransportError(error)) {
        this.logger.warn(
          `Outbox LISTEN/NOTIFY unavailable, using reconcile fallback: ${(error as Error).message}`,
        )
      } else {
        this.reportOutboxError(
          'MISSIONS_OUTBOX_LISTENER_START_FAILED',
          'Failed to start outbox LISTEN/NOTIFY',
          error,
        )
      }
      if (this.listenerClient) {
        this.listenerClient.release()
        this.listenerClient = null
      }
    }
  }

  private startReconcileSweep() {
    const reconcileMs = Number(
      this.configService.get<number>('missions.outboxReconcileMs') || 60000,
    )
    this.reconcileTimer = setInterval(() => {
      this.dispatchDueEvents().catch((error) => {
        this.reportOutboxError(
          'MISSIONS_OUTBOX_RECONCILE_SWEEP_FAILED',
          'Outbox reconcile sweep failed',
          error,
        )
      })
    }, reconcileMs)
    this.logger.log(`Outbox reconcile sweep started (interval=${reconcileMs}ms)`)
  }

  private async claimPendingRows(batchSize: number): Promise<OutboxEventRow[]> {
    if (!this.databaseService.hasPgPool()) {
      return this.claimPendingRowsViaSupabase(batchSize)
    }

    const scopedMissionId = this.getScopedMissionId()
    const scopedMissionSql = scopedMissionId ? 'AND mission_id = $2::uuid' : ''
    const params: Array<string | number> = scopedMissionId
      ? [batchSize, scopedMissionId]
      : [batchSize]

    const { rows } = await this.databaseService.pgQuery<OutboxEventRow>(
      `
        WITH candidates AS (
          SELECT id
          FROM mission_outbox
          WHERE status = 'pending'
            AND next_attempt_at <= NOW()
            ${scopedMissionSql}
          ORDER BY priority_rank ASC, created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE mission_outbox mo
        SET status = 'processing',
            locked_at = NOW(),
            attempts = mo.attempts + 1,
            error = NULL
        FROM candidates c
        WHERE mo.id = c.id
        RETURNING mo.id, mo.event_type, mo.mission_id, mo.user_id, mo.org_id, mo.dedupe_key, mo.payload, mo.attempts, mo.max_attempts, mo.priority_rank
      `,
      params,
    )
    return rows
  }

  private async claimPendingRowsViaSupabase(batchSize: number): Promise<OutboxEventRow[]> {
    const supabase = this.databaseService.getClient()
    const nowIso = new Date().toISOString()
    const scopedMissionId = this.getScopedMissionId()
    let candidatesQuery = supabase
      .from('mission_outbox')
      .select(
        'id, event_type, mission_id, user_id, org_id, dedupe_key, payload, attempts, max_attempts, priority_rank',
      )
      .eq('status', 'pending')
      .lte('next_attempt_at', nowIso)
      .order('priority_rank', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (scopedMissionId) candidatesQuery = candidatesQuery.eq('mission_id', scopedMissionId)

    const { data: candidates, error } = await candidatesQuery

    if (error || !candidates?.length) return []

    const claimed: OutboxEventRow[] = []
    for (const candidate of candidates as OutboxEventRow[]) {
      const { data: row, error: claimError } = await supabase
        .from('mission_outbox')
        .update({
          status: 'processing',
          locked_at: nowIso,
          attempts: Number(candidate.attempts || 0) + 1,
          error: null,
        })
        .eq('id', candidate.id)
        .eq('status', 'pending')
        .select(
          'id, event_type, mission_id, user_id, org_id, dedupe_key, payload, attempts, max_attempts, priority_rank',
        )
        .maybeSingle()
      if (!claimError && row) claimed.push(row as OutboxEventRow)
    }

    return claimed
  }

  private async publishToQueue(row: OutboxEventRow): Promise<boolean> {
    // Notification-only events don't go through the missions queue — they're handled
    // in-process and marked succeeded immediately so they don't consume worker slots.
    if (row.event_type === 'mission.subtask.awaiting_human.requested') {
      const payload = row.payload || {}
      const subtaskId = typeof payload.subtask_id === 'string' ? payload.subtask_id : ''
      const assignedUserId =
        typeof payload.assigned_user_id === 'string' ? payload.assigned_user_id : null
      if (!subtaskId) {
        throw new Error(`awaiting_human outbox event ${row.id} missing subtask_id`)
      }
      await this.humanSubtaskNotifier.notifyAwaitingHuman({
        missionId: row.mission_id,
        subtaskId,
        assignedUserId,
        orgId: row.org_id ?? null,
      })
      return true
    }

    const missionStatus = await this.loadMissionStatus(row)
    const allowedStatuses = allowedStatusesForOutboxEvent(row.event_type)
    if (!allowedStatuses.has(missionStatus)) {
      await this.markRetry(row, `Mission status ${missionStatus || 'unknown'} is not dispatchable`)
      return false
    }

    if (await this.missionsQueue.isPaused()) {
      this.logger.warn('Mission queue was paused; resuming before outbox publish')
      await this.missionsQueue.resume()
    }

    const mapped = mapOutboxEventToJob(row)
    if (!mapped) {
      throw new Error(`Unsupported mission outbox event_type "${row.event_type}"`)
    }
    const existing = await this.missionsQueue.getJob(mapped.jobId)
    if (existing) {
      const state = await existing.getState()
      if (state === 'active') {
        const stalledMinutes = Number(
          this.configService.get<number>('missions.stalledMinutes') || 10,
        )
        const maxAgeMs = stalledMinutes * 60_000
        const ts = typeof existing.timestamp === 'number' ? existing.timestamp : 0
        if (ts > 0 && Date.now() - ts > maxAgeMs) {
          this.logger.warn(
            `Removing stale active BullMQ job ${mapped.jobId} (>${stalledMinutes}m) for outbox ${row.id}`,
          )
          await existing
            .remove()
            .catch((err) =>
              this.logger.warn(
                `Failed to remove stale job ${mapped.jobId}: ${(err as Error).message}`,
              ),
            )
        } else {
          return true
        }
      } else if (state === 'completed' || state === 'failed') {
        await existing.remove()
      } else {
        return true
      }
    }

    const queuedJob = await this.missionsQueue.add(MISSIONS_QUEUE, mapped.data, {
      jobId: mapped.jobId,
      priority: mapped.priorityRank,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 5000,
    })

    const [jobState, workers, globalConcurrency, counts] = await Promise.all([
      queuedJob.getState(),
      this.missionsQueue.getWorkersCount(),
      this.missionsQueue.getGlobalConcurrency(),
      this.missionsQueue.getJobCounts('waiting', 'active', 'prioritized'),
    ])
    this.logger.log(
      `Mission queue publish job=${mapped.jobId} state=${jobState} workers=${workers} global_concurrency=${globalConcurrency ?? 'unset'} waiting=${counts.waiting ?? 0} prioritized=${counts.prioritized ?? 0} active=${counts.active ?? 0}`,
    )

    const mappedSignal = this.agentSignalService.mapOutboxEventToSignal(row.event_type)
    if (mappedSignal && !((row.payload as any)?.source === 'autonomous_ceo')) {
      await this.agentSignalService
        .emitSignal(
          row.user_id,
          mappedSignal.signalType,
          mappedSignal.weight,
          { outbox_id: row.id },
          row.mission_id,
          row.org_id ?? null,
        )
        .catch(() => {})
    }
    return true
  }

  private async loadMissionStatus(row: OutboxEventRow): Promise<string> {
    if (this.databaseService.hasPgPool()) {
      try {
        const { rows } = await this.databaseService.pgQuery<{ status: string }>(
          `
            SELECT status
            FROM missions
            WHERE id = $1::uuid
              AND user_id = $2::uuid
              AND org_id IS NOT DISTINCT FROM $3::uuid
            LIMIT 1
          `,
          [row.mission_id, row.user_id, row.org_id ?? null],
        )
        return String(rows[0]?.status ?? '')
      } catch (error) {
        if (this.databaseService.hasPgPool()) throw error
        this.logger.warn(
          `Direct Postgres unavailable while checking mission ${row.mission_id}; using Supabase fallback`,
        )
      }
    }

    const supabase = this.databaseService.getClient()
    const { data: missionRow, error: missionErr } = await supabase
      .from('missions')
      .select('status')
      .eq('id', row.mission_id)
      .eq('user_id', row.user_id)
      [row.org_id ? 'eq' : 'is']('org_id', row.org_id ?? null)
      .maybeSingle()
    if (missionErr) throw new Error(missionErr.message)
    return String(missionRow?.status ?? '')
  }

  private async markProcessed(outboxId: string) {
    if (!this.databaseService.hasPgPool()) {
      const supabase = this.databaseService.getClient()
      const { error } = await supabase
        .from('mission_outbox')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          locked_at: null,
          error: null,
        })
        .eq('id', outboxId)
      if (error) throw new Error(error.message)
      return
    }

    await this.databaseService.pgQuery(
      `
        UPDATE mission_outbox
        SET status = 'processed',
            processed_at = NOW(),
            locked_at = NULL,
            error = NULL
        WHERE id = $1
      `,
      [outboxId],
    )
  }

  private async markRetry(row: OutboxEventRow, errorMessage: string) {
    const attempts = Number(row.attempts || 0)
    const maxAttempts = Number(row.max_attempts || 8)
    const isDeadLetter = attempts >= maxAttempts
    const retryDelaySeconds = Math.floor(this.getRetryDelayMs(attempts) / 1000)

    try {
      if (!this.databaseService.hasPgPool()) {
        const supabase = this.databaseService.getClient()
        const nextAttemptIso = isDeadLetter
          ? new Date().toISOString()
          : new Date(Date.now() + retryDelaySeconds * 1000).toISOString()
        const { error } = await supabase
          .from('mission_outbox')
          .update({
            status: isDeadLetter ? 'dead_letter' : 'pending',
            locked_at: null,
            error: errorMessage.slice(0, 1200),
            next_attempt_at: nextAttemptIso,
          })
          .eq('id', row.id)
        if (error) throw new Error(error.message)
        this.logger.warn(
          `Outbox dispatch failed for ${row.id} (${row.event_type}) attempt=${attempts}/${maxAttempts}: ${errorMessage}`,
        )
        if (isDeadLetter) {
          this.logger.error(
            `outbox_dead_letter id=${row.id} event_type=${row.event_type} attempts=${attempts}`,
          )
        }
        return
      }

      await this.databaseService.pgQuery(
        `
          UPDATE mission_outbox
          SET status = $2::text,
              locked_at = NULL,
              error = $3::text,
              next_attempt_at = CASE
                WHEN $2::text = 'dead_letter' THEN NOW()
                ELSE NOW() + ($4::int * INTERVAL '1 second')
              END
          WHERE id = $1
        `,
        [
          row.id,
          isDeadLetter ? 'dead_letter' : 'pending',
          errorMessage.slice(0, 1200),
          retryDelaySeconds,
        ],
      )
    } catch (error) {
      this.reportOutboxError(
        'MISSIONS_OUTBOX_RETRY_UPDATE_FAILED',
        `Failed retry update for outbox row ${row.id}`,
        error,
        { outbox_id: row.id, event_type: row.event_type },
      )
      return
    }

    this.logger.warn(
      `Outbox dispatch failed for ${row.id} (${row.event_type}) attempt=${attempts}/${maxAttempts}: ${errorMessage}`,
    )
    if (isDeadLetter) {
      this.logger.error(
        `outbox_dead_letter id=${row.id} event_type=${row.event_type} attempts=${attempts}`,
      )
    }
  }

  private getRetryDelayMs(attempts: number): number {
    const base = 2000
    const max = 60000
    return Math.min(max, base * Math.pow(2, Math.max(0, attempts - 1)))
  }

  private reportOutboxError(
    errorCode: string,
    label: string,
    error: unknown,
    context: Record<string, unknown> = {},
  ): void {
    const message = formatOutboxError(error)
    this.logger.error(`${label}: ${message}`)
    void this.workerLogger?.logError({
      app: 'mission-worker',
      severity: 'error',
      feature: 'missions_outbox',
      error_code: errorCode,
      message: `${label}: ${message}`,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    })
  }
}

function formatOutboxError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
