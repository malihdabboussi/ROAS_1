import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import type { Queue } from 'bullmq'
import { DatabaseService } from '../../../lib/services/database.service'
import { QueueLoggerService } from '../../logger'
import { BROADCAST_EMAILS_QUEUE } from '../types'

@Injectable()
export class BroadcastEmailScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BroadcastEmailScheduler.name)
  private interval: NodeJS.Timeout | null = null

  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue(BROADCAST_EMAILS_QUEUE) private readonly queue: Queue,
    @Optional() private readonly queueLogger?: QueueLoggerService,
  ) {}

  onModuleInit() {
    this.interval = setInterval(() => void this.enqueueDueSchedules(), 30_000)
    void this.enqueueDueSchedules()
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval)
  }

  private async enqueueDueSchedules(): Promise<void> {
    const supabase = this.databaseService.getClient()

    const { data: schedules, error } = await supabase
      .from('email_broadcast_schedules')
      .select('id, scheduled_at, status, job_id')
      .eq('status', 'scheduled')
      .is('job_id', null)
      .order('scheduled_at', { ascending: true })
      .limit(200)

    if (error) {
      this.logger.error(`Failed to fetch broadcast schedules: ${error.message}`)
      void this.queueLogger?.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'broadcast_email_scheduler',
        error_code: 'BROADCAST_EMAIL_SCHEDULE_FETCH_FAILED',
        message: `Failed to fetch broadcast schedules: ${error.message}`,
        context: { table: 'email_broadcast_schedules' },
      })
      return
    }

    for (const s of schedules || []) {
      const scheduledAt = new Date(s.scheduled_at as string).getTime()
      const delayMs = Math.max(0, scheduledAt - Date.now())

      await this.queue.add(
        'send-broadcast',
        { broadcastScheduleId: s.id as string },
        { jobId: s.id as string, delay: delayMs },
      )

      await supabase
        .from('email_broadcast_schedules')
        .update({ job_id: s.id as string, updated_at: new Date().toISOString() })
        .eq('id', s.id as string)
    }

    if (schedules?.length) this.logger.log(`Enqueued ${schedules.length} broadcast schedules`)
  }
}
