import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { QueueLoggerService } from '../../logger'
import { CrmSyncService } from '../services/crm-sync.service'
import { CRM_SYNC_QUEUE, type CrmSyncJobData, type CrmSyncJobResult } from '../types/crm-sync.types'

@Processor(CRM_SYNC_QUEUE, { concurrency: 2 })
export class CrmSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CrmSyncProcessor.name)

  constructor(
    private readonly crmSyncService: CrmSyncService,
    private readonly queueLoggerService: QueueLoggerService,
  ) {
    super()
  }

  async process(job: Job<CrmSyncJobData, CrmSyncJobResult>): Promise<CrmSyncJobResult> {
    try {
      const result = await this.crmSyncService.processJob(job.data.crmSyncJobId)
      if (!result.success && result.error) {
        await this.queueLoggerService.logError({
          app: 'queue-worker',
          severity: 'error',
          feature: 'crm-sync/processor',
          error_code: 'CRM_SYNC_FAILED',
          message: `CRM sync job ${job.id}: ${result.error}`,
          context: {
            jobId: job.id,
            jobName: job.name,
            crmSyncJobId: job.data.crmSyncJobId,
            attemptsMade: job.attemptsMade,
            queue: CRM_SYNC_QUEUE,
          },
        })
      }
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.queueLoggerService.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'crm-sync/processor',
        error_code: 'JOB_PROCESSING_FAILED',
        message: `CRM sync job ${job.id} failed: ${errorMessage}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          jobId: job.id,
          jobName: job.name,
          crmSyncJobId: job.data.crmSyncJobId,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          queue: CRM_SYNC_QUEUE,
        },
      })
      throw error
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<CrmSyncJobData, CrmSyncJobResult>) {
    this.logger.debug(`CRM sync job ${job.id} completed`)
  }
}
