import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import type { Queue } from 'bullmq'
import { DatabaseService } from '../../../lib/services/database.service'
import { QueueLoggerService } from '../../logger'
import { CRM_SYNC_QUEUE } from '../types/crm-sync.types'

@Injectable()
export class CrmSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrmSyncScheduler.name)
  private interval: NodeJS.Timeout | null = null

  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue(CRM_SYNC_QUEUE) private readonly queue: Queue,
    @Optional() private readonly queueLogger?: QueueLoggerService,
  ) {}

  onModuleInit() {
    this.interval = setInterval(() => void this.enqueueQueuedJobs(), 15_000)
    void this.enqueueQueuedJobs()
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval)
  }

  private async enqueueQueuedJobs(): Promise<void> {
    const supabase = this.databaseService.getClient()

    const { data: jobs, error } = await supabase
      .from('crm_sync_jobs')
      .select('id')
      .eq('status', 'queued')
      .is('job_id', null)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      this.logger.error(`Failed to fetch crm_sync_jobs: ${error.message}`)
      void this.queueLogger?.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'crm_sync_scheduler',
        error_code: 'CRM_SYNC_JOB_FETCH_FAILED',
        message: `Failed to fetch crm_sync_jobs: ${error.message}`,
        context: { table: 'crm_sync_jobs' },
      })
      return
    }

    for (const j of jobs || []) {
      const id = j.id as string
      const bullJobId = `crm-sync-${id}`

      try {
        await this.queue.add('run-crm-sync', { crmSyncJobId: id }, { jobId: bullJobId })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        this.logger.warn(`CRM sync enqueue ${id}: ${msg}`)
        continue
      }

      await supabase
        .from('crm_sync_jobs')
        .update({ job_id: bullJobId, updated_at: new Date().toISOString() })
        .eq('id', id)
    }

    if (jobs?.length) this.logger.log(`Enqueued ${jobs.length} CRM sync job(s)`)
  }
}
