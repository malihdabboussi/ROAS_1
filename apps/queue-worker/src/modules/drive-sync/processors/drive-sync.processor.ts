import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { QueueLoggerService } from '../../logger'
import { DriveSyncService } from '../services/drive-sync.service'
import {
  DRIVE_SYNC_QUEUE,
  type DriveSyncJobData,
  type DriveSyncJobResult,
} from '../types/drive-sync.types'

@Processor(DRIVE_SYNC_QUEUE, { concurrency: 5 })
export class DriveSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(DriveSyncProcessor.name)

  constructor(
    private readonly driveSyncService: DriveSyncService,
    private readonly queueLoggerService: QueueLoggerService,
  ) {
    super()
  }

  async process(job: Job<DriveSyncJobData, DriveSyncJobResult>): Promise<DriveSyncJobResult> {
    try {
      const result = await this.driveSyncService.runSyncJob(job.data)
      if (!result.success) {
        await this.queueLoggerService.logError({
          app: 'queue-worker',
          severity: 'error',
          feature: 'drive-sync/processor',
          error_code: 'DRIVE_SYNC_FAILED',
          message: `Drive sync failed for mapping=${job.data.mappingId}`,
          context: {
            jobId: job.id,
            mappingId: job.data.mappingId,
            reason: job.data.reason,
            attemptsMade: job.attemptsMade,
            queue: DRIVE_SYNC_QUEUE,
          },
        })
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.queueLoggerService.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'drive-sync/processor',
        error_code: 'DRIVE_SYNC_JOB_PROCESSING_FAILED',
        message,
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          jobId: job.id,
          mappingId: job.data.mappingId,
          reason: job.data.reason,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          queue: DRIVE_SYNC_QUEUE,
        },
      })
      throw error
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<DriveSyncJobData, DriveSyncJobResult>) {
    this.logger.debug(`Drive sync job completed: ${job.id}`)
  }
}
