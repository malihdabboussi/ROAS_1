import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Queue } from 'bullmq'
import type { PoolClient } from 'pg'
import { DatabaseService } from '../../lib/services/database.service'
import { WorkerLoggerService } from '../logger'
import { BRAIN_OPS_QUEUE, type BrainOpsJobData, type OutboxRow } from './types'

@Injectable()
export class BrainOpsOutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrainOpsOutboxDispatcherService.name)
  private listenerClient: PoolClient | null = null
  private reconcileTimer: NodeJS.Timeout | null = null
  private dispatchInFlight = false

  constructor(
    @InjectQueue(BRAIN_OPS_QUEUE) private readonly brainOpsQueue: Queue,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    @Optional() private readonly workerLogger?: WorkerLoggerService,
  ) {}

  async onModuleInit() {
    await this.setupNotifyListener()
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
        await this.listenerClient.query('UNLISTEN brain_ops_outbox_new')
      } catch {
        // best-effort
      }
      this.listenerClient.release()
      this.listenerClient = null
    }
  }

  async dispatchDueEvents() {
    if (this.dispatchInFlight) return
    this.dispatchInFlight = true

    try {
      const rows = await this.claimPendingRows(10)
      if (!rows.length) return

      for (const row of rows) {
        try {
          await this.publishToQueue(row)
        } catch (error) {
          await this.markRetry(
            row,
            error instanceof Error ? error.message : 'Unknown dispatch error',
          )
        }
      }
    } catch (error) {
      this.reportOutboxError(
        'BRAIN_OPS_OUTBOX_DISPATCH_FAILED',
        'Brain ops outbox dispatch failed',
        error,
      )
    } finally {
      this.dispatchInFlight = false
    }
  }

  private async setupNotifyListener() {
    if (!this.databaseService.hasPgPool()) {
      this.logger.warn('Brain ops LISTEN/NOTIFY disabled: no direct PG connection')
      return
    }

    try {
      this.listenerClient = await this.databaseService.getPgPool().connect()
      await this.listenerClient.query('LISTEN brain_ops_outbox_new')
      this.listenerClient.on('notification', (message) => {
        if (message.channel !== 'brain_ops_outbox_new') return
        this.dispatchDueEvents().catch((err) => {
          this.reportOutboxError(
            'BRAIN_OPS_OUTBOX_NOTIFY_DISPATCH_FAILED',
            'Brain ops notify dispatch failed',
            err,
          )
        })
      })
      this.listenerClient.on('error', (err) => {
        this.reportOutboxError('BRAIN_OPS_OUTBOX_LISTENER_ERROR', 'Brain ops listener error', err)
      })
      this.logger.log('Brain ops outbox listener armed (channel=brain_ops_outbox_new)')
    } catch (error) {
      this.logger.warn(`Brain ops LISTEN/NOTIFY unavailable: ${(error as Error).message}`)
      if (this.listenerClient) {
        this.listenerClient.release()
        this.listenerClient = null
      }
    }
  }

  private startReconcileSweep() {
    const reconcileMs = Number(
      this.configService.get<number>('brainOps.outboxReconcileMs') || 60000,
    )
    this.reconcileTimer = setInterval(() => {
      this.dispatchDueEvents().catch((err) => {
        this.reportOutboxError(
          'BRAIN_OPS_OUTBOX_RECONCILE_FAILED',
          'Brain ops reconcile sweep failed',
          err,
        )
      })
    }, reconcileMs)
    this.logger.log(`Brain ops reconcile sweep started (interval=${reconcileMs}ms)`)
  }

  private async claimPendingRows(batchSize: number): Promise<OutboxRow[]> {
    if (this.databaseService.hasPgPool()) {
      const { rows } = await this.databaseService.pgQuery<OutboxRow>(
        `
          WITH candidates AS (
            SELECT id
            FROM brain_ops_outbox
            WHERE status = 'pending'
              AND next_attempt_at <= NOW()
            ORDER BY created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
          )
          UPDATE brain_ops_outbox bo
          SET status = 'processing',
              attempts = bo.attempts + 1,
              error = NULL
          FROM candidates c
          WHERE bo.id = c.id
          RETURNING bo.id, bo.brain_id, bo.user_id, bo.org_id, bo.event_type,
                    bo.dedupe_key, bo.payload, bo.attempts, bo.max_attempts
        `,
        [batchSize],
      )
      return rows
    }

    const supabase = this.databaseService.getClient()
    const nowIso = new Date().toISOString()
    const { data: candidates } = await supabase
      .from('brain_ops_outbox')
      .select(
        'id, brain_id, user_id, org_id, event_type, dedupe_key, payload, attempts, max_attempts',
      )
      .eq('status', 'pending')
      .lte('next_attempt_at', nowIso)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (!candidates?.length) return []

    const claimed: OutboxRow[] = []
    for (const c of candidates as OutboxRow[]) {
      const { data: row } = await supabase
        .from('brain_ops_outbox')
        .update({ status: 'processing', attempts: (c.attempts || 0) + 1, error: null })
        .eq('id', c.id)
        .eq('status', 'pending')
        .select(
          'id, brain_id, user_id, org_id, event_type, dedupe_key, payload, attempts, max_attempts',
        )
        .maybeSingle()
      if (row) claimed.push(row as OutboxRow)
    }
    return claimed
  }

  private async publishToQueue(row: OutboxRow): Promise<void> {
    const jobData: BrainOpsJobData = {
      outboxId: row.id,
      brainId: row.brain_id,
      userId: row.user_id,
      orgId: row.org_id ?? null,
      eventType: row.event_type as BrainOpsJobData['eventType'],
      payload: row.payload || {},
    }

    await this.brainOpsQueue.add(BRAIN_OPS_QUEUE, jobData, {
      jobId: `brain-ops-${row.id}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: 5000,
    })
  }

  private async markRetry(row: OutboxRow, errorMessage: string) {
    const attempts = row.attempts || 0
    const maxAttempts = row.max_attempts || 3
    const isDeadLetter = attempts >= maxAttempts
    const retryDelaySec = Math.min(60, 2 * Math.pow(2, Math.max(0, attempts - 1)))

    const newStatus = isDeadLetter ? 'failed' : 'pending'
    const nextAttempt = isDeadLetter
      ? new Date().toISOString()
      : new Date(Date.now() + retryDelaySec * 1000).toISOString()

    if (this.databaseService.hasPgPool()) {
      await this.databaseService.pgQuery(
        `UPDATE brain_ops_outbox SET status = $2, error = $3, next_attempt_at = $4 WHERE id = $1`,
        [row.id, newStatus, errorMessage.slice(0, 1200), nextAttempt],
      )
    } else {
      await this.databaseService
        .getClient()
        .from('brain_ops_outbox')
        .update({
          status: newStatus,
          error: errorMessage.slice(0, 1200),
          next_attempt_at: nextAttempt,
        })
        .eq('id', row.id)
    }

    this.logger.warn(
      `Brain ops dispatch failed for ${row.id} (${row.event_type}) attempt=${attempts}/${maxAttempts}: ${errorMessage}`,
    )
    if (isDeadLetter) {
      this.logger.error(`brain_ops_dead_letter id=${row.id} event_type=${row.event_type}`)
    }
  }

  private reportOutboxError(errorCode: string, label: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.logger.error(`${label}: ${message}`)
    void this.workerLogger?.logError({
      app: 'mission-worker',
      severity: 'error',
      feature: 'brain_ops_outbox',
      error_code: errorCode,
      message: `${label}: ${message}`,
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
