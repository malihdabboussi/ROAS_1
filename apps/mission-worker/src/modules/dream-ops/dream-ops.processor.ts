import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { CompanyDailyDreamRunnerService } from '../brain-ops/company-daily-dream-runner.service'
import { AgentLearningDreamRunnerService } from './agent-learning-dream-runner.service'
import { DreamOpsRepository } from './dream-ops.repository'
import { DREAM_OPS_BULL_QUEUE, type DreamOpsJobData, type DreamOpsJobResult } from './types'

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const DREAM_OPS_CONCURRENCY = readPositiveInt(process.env.DREAM_OPS_CONCURRENCY, 2)

@Processor(DREAM_OPS_BULL_QUEUE, {
  concurrency: DREAM_OPS_CONCURRENCY,
  lockDuration: 5_000_000,
  stalledInterval: 120_000,
})
export class DreamOpsProcessor extends WorkerHost {
  private readonly logger = new Logger(DreamOpsProcessor.name)

  constructor(
    private readonly repository: DreamOpsRepository,
    private readonly companyDailyDreamRunner: CompanyDailyDreamRunnerService,
    private readonly agentLearningDreamRunner: AgentLearningDreamRunnerService,
  ) {
    super()
  }

  async process(job: Job<DreamOpsJobData>): Promise<DreamOpsJobResult> {
    const data = job.data
    try {
      const output = await this.route(data)
      if (output.skipped !== true) {
        await this.repository.markSettingSuccessful({
          operationType: data.operationType,
          orgId: data.orgId,
          subjectKey: data.subjectKey,
          completedAt: new Date().toISOString(),
        })
      }
      await this.repository.markOutboxDone(data.outboxId)
      return {
        success: true,
        operationType: data.operationType,
        subjectKey: data.subjectKey,
        processedAt: new Date().toISOString(),
        output,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(
        `Dream Ops job failed: ${data.operationType} subject=${data.subjectKey}: ${message}`,
      )
      await this.repository.markOutboxFailed(data.outboxId, message)
      return {
        success: false,
        operationType: data.operationType,
        subjectKey: data.subjectKey,
        processedAt: new Date().toISOString(),
        error: message,
      }
    }
  }

  private async route(data: DreamOpsJobData): Promise<Record<string, unknown>> {
    if (data.operationType === 'company_daily_dream') {
      const run = await this.repository.createRun({
        org_id: data.orgId,
        user_id: data.userId,
        operation_type: 'company_daily_dream',
        subject_kind: 'company_brain',
        subject_key: data.subjectKey,
        target_id: data.targetId ?? data.subjectKey,
        dedupe_key:
          data.dedupeKey ||
          `company_daily_dream:${data.orgId}:${this.stringPayload(data, 'local_date')}`,
        local_date: this.stringPayload(data, 'local_date'),
        window_start: this.stringPayload(data, 'window_start'),
        window_end: this.stringPayload(data, 'window_end'),
        status: 'running',
      })
      const result = await this.companyDailyDreamRunner.runDailyDream({
        orgId: data.orgId,
        brainId: data.targetId ?? data.subjectKey,
        userId: data.userId ?? '',
        localDate: this.stringPayload(data, 'local_date'),
        windowStart: this.stringPayload(data, 'window_start'),
        windowEnd: this.stringPayload(data, 'window_end'),
        manual: data.payload.manual === true,
      })
      await this.repository.completeRun(run.id, {
        status: result.skipped ? 'skipped' : 'completed',
        skipped_reason: result.skipped ? 'deduped' : null,
        source_counts: result.sourceCounts ?? {},
        chunks_processed: result.chunksProcessed ?? 0,
        output: {
          company_cortex_dream_run_id: result.runId,
          signals_created: result.signalsCreated ?? 0,
        },
      })
      return result as unknown as Record<string, unknown>
    }

    if (data.operationType === 'agent_learning_dream') {
      const result = await this.agentLearningDreamRunner.runAgentDream({
        orgId: data.orgId,
        userId: data.userId ?? '',
        agentKey: data.subjectKey,
        localDate: this.stringPayload(data, 'local_date'),
        windowStart: this.stringPayload(data, 'window_start'),
        windowEnd: this.stringPayload(data, 'window_end'),
        manual: data.payload.manual === true,
      })
      return result as unknown as Record<string, unknown>
    }

    throw new Error(`Unknown Dream Ops operation: ${data.operationType}`)
  }

  private stringPayload(data: DreamOpsJobData, key: string): string {
    const value = data.payload[key]
    return typeof value === 'string' ? value : ''
  }
}
