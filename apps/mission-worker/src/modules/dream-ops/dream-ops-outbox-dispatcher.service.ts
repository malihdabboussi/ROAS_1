import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Queue } from 'bullmq'
import type { PoolClient } from 'pg'
import { DatabaseService } from '../../lib/services/database.service'
import { WorkerLoggerService } from '../logger'
import { DreamOpsRepository } from './dream-ops.repository'
import {
  DREAM_OPS_BULL_QUEUE,
  DREAM_OPS_QUEUE,
  type DreamOpsJobData,
  type DreamOpsOutboxRow,
} from './types'

@Injectable()
export class DreamOpsOutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DreamOpsOutboxDispatcherService.name)
  private readonly repository: DreamOpsRepository
  private listenerClient: PoolClient | null = null
  private reconcileTimer: NodeJS.Timeout | null = null
  private dispatchInFlight = false

  constructor(
    @InjectQueue(DREAM_OPS_BULL_QUEUE) private readonly dreamOpsQueue: Queue,
    private readonly configService: ConfigService,
    databaseService: DatabaseService,
    repository?: DreamOpsRepository,
    @Optional() private readonly workerLogger?: WorkerLoggerService,
  ) {
    this.repository = repository ?? new DreamOpsRepository(databaseService)
    this.databaseService = databaseService
  }

  private readonly databaseService: DatabaseService

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
        await this.listenerClient.query('UNLISTEN dream_ops_outbox_new')
      } catch {
        // best-effort
      }
      this.listenerClient.release()
      this.listenerClient = null
    }
  }

  async dispatchDueEvents(): Promise<void> {
    if (this.dispatchInFlight) return
    this.dispatchInFlight = true
    try {
      const rows = await this.repository.claimPendingRows(10)
      for (const row of rows) {
        try {
          await this.publishToQueue(row)
        } catch (error) {
          await this.repository.markRetry(
            row,
            error instanceof Error ? error.message : 'Unknown dispatch error',
          )
        }
      }
    } catch (error) {
      this.reportOutboxError(
        'DREAM_OPS_OUTBOX_DISPATCH_FAILED',
        'Dream Ops outbox dispatch failed',
        error,
      )
    } finally {
      this.dispatchInFlight = false
    }
  }

  private async setupNotifyListener(): Promise<void> {
    if (!this.databaseService.hasPgPool()) {
      this.logger.warn('Dream Ops LISTEN/NOTIFY disabled: no direct PG connection')
      return
    }
    try {
      this.listenerClient = await this.databaseService.getPgPool().connect()
      await this.listenerClient.query('LISTEN dream_ops_outbox_new')
      this.listenerClient.on('notification', (message) => {
        if (message.channel !== 'dream_ops_outbox_new') return
        this.dispatchDueEvents().catch((err) => {
          this.reportOutboxError(
            'DREAM_OPS_OUTBOX_NOTIFY_DISPATCH_FAILED',
            'Dream Ops notify dispatch failed',
            err,
          )
        })
      })
      this.listenerClient.on('error', (err) => {
        this.reportOutboxError('DREAM_OPS_OUTBOX_LISTENER_ERROR', 'Dream Ops listener error', err)
      })
      this.logger.log('Dream Ops outbox listener armed (channel=dream_ops_outbox_new)')
    } catch (error) {
      this.logger.warn(`Dream Ops LISTEN/NOTIFY unavailable: ${(error as Error).message}`)
      if (this.listenerClient) {
        this.listenerClient.release()
        this.listenerClient = null
      }
    }
  }

  private startReconcileSweep(): void {
    const reconcileMs = Number(
      this.configService.get<number>('dreamOps.outboxReconcileMs') ||
        this.configService.get<number>('brainOps.outboxReconcileMs') ||
        60000,
    )
    this.reconcileTimer = setInterval(() => {
      this.dispatchDueEvents().catch((err) => {
        this.reportOutboxError(
          'DREAM_OPS_OUTBOX_RECONCILE_FAILED',
          'Dream Ops reconcile sweep failed',
          err,
        )
      })
    }, reconcileMs)
    this.logger.log(`Dream Ops reconcile sweep started (interval=${reconcileMs}ms)`)
  }

  private async publishToQueue(row: DreamOpsOutboxRow): Promise<void> {
    const jobData: DreamOpsJobData = {
      outboxId: row.id,
      orgId: row.org_id,
      userId: row.user_id ?? null,
      operationType: row.operation_type,
      subjectKind: row.subject_kind,
      subjectKey: row.subject_key,
      targetId: row.target_id ?? null,
      dedupeKey: row.dedupe_key,
      payload: row.payload || {},
    }
    await this.dreamOpsQueue.add(DREAM_OPS_QUEUE, jobData, {
      jobId: `dream-ops-${row.id}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: 5000,
    })
  }

  private reportOutboxError(errorCode: string, label: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.logger.error(`${label}: ${message}`)
    void this.workerLogger?.logError({
      app: 'mission-worker',
      severity: 'error',
      feature: 'dream_ops_outbox',
      error_code: errorCode,
      message: `${label}: ${message}`,
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
