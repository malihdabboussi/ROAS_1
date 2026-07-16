import { Injectable } from '@nestjs/common'
import { BrainImportJobStatusRepository } from '../repositories/brain-import-job-status.repository'

type BrainImportJobStatus = 'queued' | 'processing' | 'retry' | 'succeeded' | 'failed'

type BrainQueueRow = {
  id: string
  job_type: string
  queue_kind: 'import' | 'brain_ops'
  title: string
  status: BrainImportJobStatus
  brain_id?: string | null
  result?: Record<string, unknown> | null
  last_error?: string | null
  created_at: string
  updated_at?: string | null
  completed_at?: string | null
}

function readBrainIdFromPayload(payload: Record<string, unknown>): string | null {
  const brainId = payload.brainId ?? payload.brain_id
  return typeof brainId === 'string' && brainId.trim() ? brainId.trim() : null
}

function mapImportQueueRow(row: Record<string, unknown>): BrainQueueRow {
  const payload = (row.payload ?? {}) as Record<string, unknown>
  return {
    id: String(row.id),
    job_type: String(row.job_type),
    queue_kind: 'import',
    title: String(row.title),
    status: row.status as BrainImportJobStatus,
    brain_id: readBrainIdFromPayload(payload),
    result: (row.result as Record<string, unknown> | null | undefined) ?? null,
    last_error: typeof row.last_error === 'string' ? row.last_error : null,
    created_at: String(row.created_at),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
    completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
  }
}

@Injectable()
export class BrainImportJobStatusService {
  constructor(private readonly repository: BrainImportJobStatusRepository) {}

  async getJobStatus(userId: string, jobId: string) {
    return this.repository.getJobStatus(userId, jobId)
  }

  async listPendingNotifications(userId: string) {
    return this.repository.listPendingNotifications(userId)
  }

  async listActiveJobs(
    userId: string,
    scope?: { brainId?: string; campaignId?: string; targetBrain?: 'user'; limit?: number },
  ) {
    const limit = Math.min(100, Math.max(1, scope?.limit ?? 20))
    const completedAfterMs =
      scope?.brainId || scope?.campaignId ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000
    const completedAfter = new Date(Date.now() - completedAfterMs).toISOString()
    const importRows = (
      await this.repository.listActiveImportJobs(userId, completedAfter, scope, limit)
    ).map((row) => mapImportQueueRow(row as Record<string, unknown>))
    // Campaign Knowledge / campaign scopes pass campaignId without brainId. Cortex
    // ops (pattern analysis, library sync, timeline) are brain-scoped — including
    // them without a brain filter flooded the campaign UI with unrelated
    // account-wide "Crystallize beliefs…" jobs.
    const brainOpsRows =
      scope?.targetBrain === 'user' || (scope?.campaignId && !scope?.brainId)
        ? []
        : await this.listActiveBrainOpsJobs(userId, completedAfter, scope, limit)
    return [...importRows, ...brainOpsRows]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, limit)
  }

  async cancelJob(userId: string, jobId: string): Promise<boolean> {
    return this.repository.cancelJob(userId, jobId)
  }

  async retryJob(userId: string, jobId: string): Promise<boolean> {
    return this.repository.retryJob(userId, jobId)
  }

  async dismissJob(userId: string, jobId: string): Promise<boolean> {
    return this.repository.dismissJob(userId, jobId)
  }

  async acknowledgeNotifications(userId: string, jobIds: string[]) {
    await this.repository.acknowledgeNotifications(userId, jobIds)
  }

  private async listActiveBrainOpsJobs(
    userId: string,
    completedAfter: string,
    scope?: { brainId?: string; campaignId?: string; limit?: number },
    limit = 20,
  ): Promise<BrainQueueRow[]> {
    const data = await this.repository.listActiveBrainOpsJobs(userId, completedAfter, scope, limit)
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const eventType = String(row.event_type ?? '')
      const payload = (row.payload ?? {}) as Record<string, unknown>
      const brainIdFromRow =
        typeof row.brain_id === 'string' && row.brain_id.trim() ? row.brain_id.trim() : null
      return {
        id: String(row.id),
        job_type: eventType,
        queue_kind: 'brain_ops',
        title:
          eventType === 'brain_pattern_analysis'
            ? 'Crystallize beliefs and perspectives'
            : eventType === 'brain_timeline_synthesis'
              ? 'Synthesize Cortex timeline'
              : `Crystallize Cortex docs${payload.brain_label ? ` for ${String(payload.brain_label)}` : ''}`,
        status: this.mapBrainOpsStatus(row.status),
        brain_id: brainIdFromRow ?? readBrainIdFromPayload(payload),
        result: { event_type: eventType },
        last_error: typeof row.error === 'string' ? row.error : null,
        created_at: String(row.created_at),
        updated_at: null,
        completed_at: typeof row.processed_at === 'string' ? row.processed_at : null,
      }
    })
  }

  private mapBrainOpsStatus(status: unknown): BrainImportJobStatus {
    if (status === 'pending') return 'queued'
    if (status === 'processing' || status === 'processed') return 'processing'
    if (status === 'failed') return 'failed'
    if (status === 'done') return 'succeeded'
    return 'queued'
  }
}
