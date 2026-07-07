import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { QueueLoggerService } from '../../logger'
import { SingleEmailService } from '../services/single-email.service'
import { SINGLE_EMAILS_QUEUE, type SingleEmailJobData, type SingleEmailJobResult } from '../types'

@Processor(SINGLE_EMAILS_QUEUE, {
  concurrency: 10,
  settings: {
    backoffStrategy: (attemptsMade: number) => Math.min(2 ** attemptsMade * 1000, 60_000),
  },
})
export class SingleEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(SingleEmailProcessor.name)

  constructor(
    private readonly singleEmailService: SingleEmailService,
    private readonly queueLoggerService: QueueLoggerService,
  ) {
    super()
  }

  async process(job: Job<SingleEmailJobData, SingleEmailJobResult>): Promise<SingleEmailJobResult> {
    try {
      return await this.singleEmailService.processSchedule(job.data.scheduleId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.queueLoggerService.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'single-emails/processor',
        error_code: 'JOB_PROCESSING_FAILED',
        message: `Single email job ${job.id} failed: ${errorMessage}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          jobId: job.id,
          jobName: job.name,
          scheduleId: job.data.scheduleId,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          queue: SINGLE_EMAILS_QUEUE,
        },
      })
      throw error
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<SingleEmailJobData, SingleEmailJobResult>) {
    this.logger.debug(`Single email job ${job.id} completed`)
  }
}
