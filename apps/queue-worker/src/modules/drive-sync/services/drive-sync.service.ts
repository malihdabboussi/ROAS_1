import { Injectable, Logger, Optional } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'
import { QueueLoggerService } from '../../logger'
import { DriveSyncQueue } from '../drive-sync.queue'
import type { DriveSyncJobData, DriveSyncJobResult } from '../types/drive-sync.types'

@Injectable()
export class DriveSyncService {
  private readonly logger = new Logger(DriveSyncService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly driveSyncQueue: DriveSyncQueue,
    @Optional() private readonly queueLogger?: QueueLoggerService,
  ) {}

  async enqueueDueMappings(): Promise<number> {
    const supabase = this.databaseService.getClient()
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from('space_drive_folder_mappings')
      .select('id, user_id')
      .eq('enabled', true)
      .eq('sync_status', 'idle')
      .lte('next_sync_at', nowIso)
      .order('next_sync_at', { ascending: true })
      .limit(200)

    if (error) {
      this.logger.error(`Failed to fetch due drive mappings: ${error.message}`)
      void this.queueLogger?.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'drive_sync_service',
        error_code: 'DRIVE_SYNC_DUE_MAPPING_FETCH_FAILED',
        message: `Failed to fetch due drive mappings: ${error.message}`,
        context: { table: 'space_drive_folder_mappings' },
      })
      return 0
    }

    let enqueued = 0
    for (const row of data ?? []) {
      const mappingId = String(row.id ?? '')
      const userId = String(row.user_id ?? '')
      if (!mappingId || !userId) continue
      try {
        await this.driveSyncQueue.enqueue(
          { mappingId, userId, reason: 'cron' },
          { jobId: `drive-sync-${mappingId}` },
        )
        enqueued += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`Drive sync enqueue skipped for mapping=${mappingId}: ${message}`)
      }
    }

    return enqueued
  }

  async enqueueManual(payload: DriveSyncJobData): Promise<void> {
    const nonce = Date.now().toString(36)
    await this.driveSyncQueue.enqueue(payload, {
      jobId: `drive-sync-${payload.reason}-${payload.mappingId}-${nonce}`,
    })
  }

  async renewDuePushChannels(): Promise<number> {
    const apiUrl = (
      process.env.API_URL ||
      process.env.API_BASE_URL ||
      'http://localhost:3001'
    ).replace(/\/+$/, '')
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) {
      this.logger.warn('Skipping Drive push renewal: INTERNAL_API_TOKEN is missing')
      return 0
    }

    let res: Response
    try {
      res = await fetch(`${apiUrl}/api/internal/integrations/google-drive/push/renew-due`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken,
        },
        signal: AbortSignal.timeout(30_000),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Drive push renewal skipped: API unreachable (${message})`)
      return 0
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      this.logger.warn(`Drive push renewal failed status=${res.status} body=${body.slice(0, 300)}`)
      return 0
    }

    const payload = (await res.json()) as { renewed?: number }
    return Number(payload.renewed ?? 0)
  }

  async runSyncJob(payload: DriveSyncJobData): Promise<DriveSyncJobResult> {
    const apiUrl = (
      process.env.API_URL ||
      process.env.API_BASE_URL ||
      'http://localhost:3001'
    ).replace(/\/+$/, '')
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''

    if (!internalToken) {
      throw new Error('INTERNAL_API_TOKEN is required for drive sync worker')
    }

    const res = await fetch(
      `${apiUrl}/api/internal/integrations/google-drive/drive-mappings/${payload.mappingId}/run-sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken,
        },
        body: JSON.stringify({
          reason: payload.reason,
          userId: payload.userId,
        }),
        signal: AbortSignal.timeout(120_000),
      },
    )

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      throw new Error(
        `Drive sync API failed for mapping=${payload.mappingId} status=${res.status} body=${errorBody.slice(0, 500)}`,
      )
    }

    const body = (await res.json()) as {
      success?: boolean
      mappingId?: string
      skipped?: boolean
      reason?: string
      inserted?: number
      updated?: number
      deleted?: number
      total?: number
    }

    return {
      success: body.success === true,
      mappingId: body.mappingId ?? payload.mappingId,
      skipped: body.skipped,
      reason: body.reason,
      inserted: body.inserted,
      updated: body.updated,
      deleted: body.deleted,
      total: body.total,
    }
  }
}
