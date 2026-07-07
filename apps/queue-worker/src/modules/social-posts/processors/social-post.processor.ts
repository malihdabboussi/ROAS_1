import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { QueueLoggerService } from '../../logger'
import { SocialPostService } from '../services/social-post.service'
import { SOCIAL_POSTS_QUEUE, type SocialPostJobData, type SocialPostJobResult } from '../types'

@Processor(SOCIAL_POSTS_QUEUE, { concurrency: 5 })
export class SocialPostProcessor extends WorkerHost {
  private readonly logger = new Logger(SocialPostProcessor.name)

  constructor(
    private readonly socialPostService: SocialPostService,
    private readonly queueLoggerService: QueueLoggerService,
  ) {
    super()
  }

  async process(job: Job<SocialPostJobData, SocialPostJobResult>): Promise<SocialPostJobResult> {
    try {
      const maxAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 3
      return await this.socialPostService.processSchedule(
        job.data.scheduleId,
        job.attemptsMade,
        maxAttempts,
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.queueLoggerService.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'social-posts/processor',
        error_code: 'JOB_PROCESSING_FAILED',
        message: `Social post job ${job.id} failed: ${errorMessage}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          jobId: job.id,
          jobName: job.name,
          scheduleId: job.data.scheduleId,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          queue: SOCIAL_POSTS_QUEUE,
        },
      })
      throw error
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<SocialPostJobData, SocialPostJobResult>) {
    this.logger.debug(`Social post job ${job.id} completed`)
  }
}
