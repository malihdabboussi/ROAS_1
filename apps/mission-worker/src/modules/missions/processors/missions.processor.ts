import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { WorkerLoggerService } from '../../logger'
import { MissionsService } from '../services/missions.service'
import { MISSIONS_QUEUE, type MissionJobData, type MissionJobResult } from '../types'

const WORKER_LOCK_MS = Number(process.env.MISSIONS_BULL_LOCK_DURATION_MS || 6_000_000)
const WORKER_STALLED_MS = Number(process.env.MISSIONS_BULL_STALLED_INTERVAL_MS || 120_000)
const MISSION_CONCURRENCY = readPositiveInt(
  process.env.AGENT_RUNTIME_MISSION_CONCURRENCY || process.env.MISSIONS_CONCURRENCY,
  3,
)

@Processor(MISSIONS_QUEUE, {
  concurrency: MISSION_CONCURRENCY,
  lockDuration: WORKER_LOCK_MS,
  stalledInterval: WORKER_STALLED_MS,
})
export class MissionsProcessor extends WorkerHost {
  private readonly logger = new Logger(MissionsProcessor.name)

  constructor(
    private readonly missionsService: MissionsService,
    private readonly workerLogger: WorkerLoggerService,
  ) {
    super()
  }

  async process(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const missionId = job.data?.missionId || 'unknown'
    const phase = job.data?.phase || 'unknown'

    try {
      return await this.missionsService.processMission(job)
    } catch (error) {
      await this.workerLogger.logError({
        app: 'mission-worker',
        severity: 'error',
        feature: 'missions.processor',
        error_code: 'MISSION_PROCESS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown mission processor failure',
        stack: error instanceof Error ? error.stack : undefined,
        user_id: job.data?.userId,
        context: {
          missionId,
          phase,
          subtaskId: job.data?.subtaskId,
          correlationId: job.data?.correlationId,
          orgId: job.data?.orgId,
          jobId: job.id,
          jobName: job.name,
          queue: MISSIONS_QUEUE,
          attemptsMade: job.attemptsMade,
          commentId: job.data?.commentId,
          fromStatus: job.data?.fromStatus,
        },
      })
      this.logger.error(`Mission job failed for missionId=${missionId}`)
      throw error
    }
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
