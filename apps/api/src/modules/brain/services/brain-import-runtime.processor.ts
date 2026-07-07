import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { AGENT_RUNTIME_BRAIN_IMPORT_QUEUE } from '../../agent-runtime/agent-runtime-queues'
import { BrainImportJobsService } from './brain-import-jobs.service'

const BRAIN_IMPORT_CONCURRENCY = readPositiveInt(
  process.env.AGENT_RUNTIME_BRAIN_IMPORT_CONCURRENCY,
  3,
)

type BrainImportRuntimeJobData = { jobId?: string }

@Processor(AGENT_RUNTIME_BRAIN_IMPORT_QUEUE, {
  concurrency: BRAIN_IMPORT_CONCURRENCY,
  lockDuration: 5_000_000,
  stalledInterval: 120_000,
})
export class BrainImportRuntimeProcessor extends WorkerHost {
  private readonly logger = new Logger(BrainImportRuntimeProcessor.name)

  constructor(private readonly brainImportJobs: BrainImportJobsService) {
    super()
  }

  async process(job: Job<BrainImportRuntimeJobData>): Promise<void> {
    if (job.name === 'brain-import-sweep') {
      await this.brainImportJobs.enqueueDueJobs()
      return
    }

    const jobId = String(job.data?.jobId ?? '').trim()
    if (!jobId) {
      this.logger.warn(`Skipping runtime job ${job.id}: missing brain import job id`)
      return
    }
    await this.brainImportJobs.processRuntimeJob(jobId)
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
