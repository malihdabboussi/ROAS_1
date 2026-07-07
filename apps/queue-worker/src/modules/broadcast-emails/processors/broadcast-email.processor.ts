import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { QueueLoggerService } from '../../logger'
import { BroadcastEmailService } from '../services/broadcast-email.service'
import {
  BROADCAST_EMAILS_QUEUE,
  type BroadcastEmailJobData,
  type BroadcastEmailJobResult,
} from '../types'

@Processor(BROADCAST_EMAILS_QUEUE, {
  concurrency: 3,
  settings: {
    backoffStrategy: (attemptsMade: number) => Math.min(2 ** attemptsMade * 1000, 60_000),
  },
})
export class BroadcastEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastEmailProcessor.name)

  constructor(
    private readonly broadcastEmailService: BroadcastEmailService,
    private readonly queueLoggerService: QueueLoggerService,
  ) {
    super()
  }

  async process(
    job: Job<BroadcastEmailJobData, BroadcastEmailJobResult>,
  ): Promise<BroadcastEmailJobResult> {
    try {
      return await this.broadcastEmailService.processSchedule(job.data.broadcastScheduleId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.queueLoggerService.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'broadcast-emails/processor',
        error_code: 'JOB_PROCESSING_FAILED',
        message: `Broadcast job ${job.id} failed: ${errorMessage}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          jobId: job.id,
          jobName: job.name,
          broadcastScheduleId: job.data.broadcastScheduleId,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          queue: BROADCAST_EMAILS_QUEUE,
        },
      })
      throw error
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<BroadcastEmailJobData, BroadcastEmailJobResult>) {
    this.logger.debug(`Broadcast job ${job.id} completed`)
  }
}
