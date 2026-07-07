import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import type { Queue } from 'bullmq'
import { DatabaseService } from '../../../lib/services/database.service'
import { QueueLoggerService } from '../../logger'
import { SINGLE_EMAILS_QUEUE } from '../types'

@Injectable()
export class SingleEmailScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SingleEmailScheduler.name)
  private interval: NodeJS.Timeout | null = null

  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue(SINGLE_EMAILS_QUEUE) private readonly queue: Queue,
    @Optional() private readonly queueLogger?: QueueLoggerService,
  ) {}

  onModuleInit() {
    // Poll for new schedules and enqueue them into BullMQ.
    this.interval = setInterval(() => void this.enqueueDueSchedules(), 15_000)
    void this.enqueueDueSchedules()
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval)
  }

  private async enqueueDueSchedules(): Promise<void> {
    const supabase = this.databaseService.getClient()

    const { data: schedules, error } = await supabase
      .from('email_single_schedules')
      .select('id, scheduled_at, status, job_id')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(500)

    if (error) {
      this.logger.error(`Failed to fetch single schedules: ${error.message}`)
      void this.queueLogger?.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'single_email_scheduler',
        error_code: 'SINGLE_EMAIL_SCHEDULE_FETCH_FAILED',
        message: `Failed to fetch single schedules: ${error.message}`,
        context: { table: 'email_single_schedules' },
      })
      return
    }

    for (const s of schedules || []) {
      const scheduledAt = new Date(s.scheduled_at as string).getTime()
      const delayMs = Math.max(0, scheduledAt - Date.now())
      const scheduleId = s.id as string
      const existingJobId =
        typeof s.job_id === 'string' && (s.job_id as string).length > 0
          ? (s.job_id as string)
          : scheduleId
      const existingJob = await this.queue.getJob(existingJobId)
      if (existingJob) {
        const existingState = await existingJob.getState()
        if (
          existingState === 'waiting' ||
          existingState === 'delayed' ||
          existingState === 'active'
        ) {
          continue
        }
        await existingJob.remove()
      }

      await this.queue.add(
        'send-single-email',
        { scheduleId },
        { jobId: scheduleId, delay: delayMs },
      )

      await supabase
        .from('email_single_schedules')
        .update({ job_id: s.id as string, updated_at: new Date().toISOString() })
        .eq('id', s.id as string)
    }

    if (schedules?.length) this.logger.log(`Enqueued ${schedules.length} single email schedules`)
  }
}
