import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import type { Queue } from 'bullmq'
import { DatabaseService } from '../../../lib/services/database.service'
import { QueueLoggerService } from '../../logger'
import { SOCIAL_POSTS_QUEUE } from '../types'

@Injectable()
export class SocialPostScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialPostScheduler.name)
  private interval: NodeJS.Timeout | null = null

  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue(SOCIAL_POSTS_QUEUE) private readonly queue: Queue,
    @Optional() private readonly queueLogger?: QueueLoggerService,
  ) {}

  onModuleInit() {
    this.interval = setInterval(() => void this.enqueueDueSchedules(), 15_000)
    void this.enqueueDueSchedules()
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval)
  }

  private async enqueueDueSchedules(): Promise<void> {
    const supabase = this.databaseService.getClient()

    const { data: schedules, error } = await supabase
      .from('social_post_schedules')
      .select('id, scheduled_at, status, job_id')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(200)

    if (error) {
      this.logger.error(`Failed to fetch social schedules: ${error.message}`)
      void this.queueLogger?.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'social_post_scheduler',
        error_code: 'SOCIAL_POST_SCHEDULE_FETCH_FAILED',
        message: `Failed to fetch social schedules: ${error.message}`,
        context: { table: 'social_post_schedules' },
      })
      return
    }

    for (const s of schedules ?? []) {
      const scheduleId = String(s.id)
      const scheduledAt = new Date(String(s.scheduled_at)).getTime()
      const delayMs = Math.max(0, scheduledAt - Date.now())

      const existingJobId =
        typeof s.job_id === 'string' && s.job_id.length > 0 ? s.job_id : scheduleId
      const existingJob = await this.queue.getJob(existingJobId)
      if (existingJob) {
        const state = await existingJob.getState()
        if (state === 'waiting' || state === 'delayed' || state === 'active') {
          continue
        }
        await existingJob.remove()
      }

      const job = await this.queue.add(
        'publish-social-post',
        { scheduleId },
        {
          jobId: scheduleId,
          delay: delayMs,
          attempts: 4,
          backoff: { type: 'exponential', delay: 2_000 },
        },
      )

      await supabase
        .from('social_post_schedules')
        .update({ job_id: scheduleId, updated_at: new Date().toISOString() })
        .eq('id', scheduleId)
    }

    if (schedules?.length) this.logger.log(`Enqueued ${schedules.length} social post schedules`)
  }
}
