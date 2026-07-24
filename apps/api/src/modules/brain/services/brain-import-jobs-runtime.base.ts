import type { SupabaseClient } from '@supabase/supabase-js'
import { reportAppError } from '@vibey/api-shared'
import { BrainImportJobsBase } from './brain-import-jobs.base'
import type {
  BrainImportJobRecord,
  BrainImportJobStatus,
  BrainImportJobType,
  BrainImportRuntimeClaimResult,
  BrainImportRuntimeExecutionPayload,
} from './brain-import-jobs.types'
import { readPositiveInt } from './brain-import-jobs.types'

export abstract class BrainImportJobsRuntimeBase extends BrainImportJobsBase {
  protected abstract buildAtlasExecutionPlan(
    job: BrainImportJobRecord,
  ): Promise<BrainImportRuntimeExecutionPayload>

  protected abstract executeViaAtlas(job: BrainImportJobRecord): Promise<Record<string, unknown>>

  onModuleInit() {
    if (process.env.DISABLE_BRAIN_IMPORT_POLLER !== '1') {
      void this.installRuntimeSweep()
      this.startHealthMonitor()
      void this.enqueueDueJobs()
    }
  }

  onModuleDestroy() {
    this.stopHealthMonitor()
  }

  // ── Job Processing (Mission Dispatch) ───────────────────────────────────

  private readonly maxConcurrentJobs = readPositiveInt(
    process.env.AGENT_RUNTIME_BRAIN_IMPORT_CONCURRENCY,
    3,
  )
  private readonly maxConcurrentPerUser = readPositiveInt(
    process.env.AGENT_RUNTIME_BRAIN_IMPORT_PER_USER_CONCURRENCY,
    1,
  )

  async processDueJobs() {
    await this.enqueueDueJobs()
  }

  async enqueueDueJobs() {
    try {
      const admin = this.getAdminClient()
      const nowIso = new Date().toISOString()

      await this.recoverStaleJobs(admin)

      if (!this.agentApiHealthy) return

      const candidates = await this.runtimeRepository.findDueJobIds(
        admin,
        nowIso,
        this.processingBatchSize * this.maxConcurrentJobs,
      )
      if (!candidates?.length) return

      for (const raw of candidates) {
        await this.enqueueRuntimeJob(String(raw.id))
      }
    } catch (error) {
      const message = (error as Error).message
      this.logger.error(`Brain import queue cycle failed: ${message}`)
      reportAppError(this.errorReporter, {
        app: process.env.APP_NAME ?? 'api',
        category: 'worker',
        feature: 'brain/import_jobs',
        error_code: 'queue_cycle_failed',
        message,
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  async processRuntimeJob(jobId: string): Promise<void> {
    if (!this.agentApiHealthy) {
      await this.enqueueRuntimeJob(jobId, 30_000)
      return
    }
    const claimed = await this.claimReadyRuntimeJob(jobId)
    if (!claimed) return
    await this.executeClaimedJob(claimed)
  }

  async claimRuntimeJobForExternalExecution(jobId: string): Promise<BrainImportRuntimeClaimResult> {
    const claimed = await this.claimReadyRuntimeJob(jobId)
    if (!claimed) return { claimed: false, reason: 'not_claimed' }
    try {
      const execution = await this.buildAtlasExecutionPlan(claimed)
      return {
        claimed: true,
        job_id: claimed.id,
        attempts: claimed.attempts,
        execution,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.markJobFailed(claimed, message)
      throw error
    }
  }

  async markRuntimeJobProgress(
    jobId: string,
    input: { attempts: number; chunksCompleted?: number; chunksTotal?: number },
  ): Promise<{ success: boolean; job_id: string }> {
    const update: Record<string, unknown> = {}
    if (typeof input.chunksCompleted === 'number' && Number.isFinite(input.chunksCompleted)) {
      update.chunks_completed = input.chunksCompleted
    }
    if (typeof input.chunksTotal === 'number' && Number.isFinite(input.chunksTotal)) {
      update.chunks_total = input.chunksTotal
    }
    if (Object.keys(update).length === 0) return { success: true, job_id: jobId }
    const admin = this.getAdminClient()
    await this.runtimeRepository.updateJobProgress(admin, jobId, input.attempts, update)
    return { success: true, job_id: jobId }
  }

  async succeedRuntimeJob(
    jobId: string,
    input: { attempts: number; result?: Record<string, unknown> | null },
  ): Promise<{ success: boolean; job_id: string; reason?: string }> {
    const job = await this.loadRuntimeJobForAttempt(jobId, input.attempts)
    if (!job) return { success: false, job_id: jobId, reason: 'job_not_found_for_attempt' }
    await this.markJobSucceeded(job, input.result ?? { status: 'completed' })
    return { success: true, job_id: jobId }
  }

  async failRuntimeJob(
    jobId: string,
    input: { attempts: number; message?: string | null },
  ): Promise<{ success: boolean; job_id: string; reason?: string }> {
    const job = await this.loadRuntimeJobForAttempt(jobId, input.attempts)
    if (!job) return { success: false, job_id: jobId, reason: 'job_not_found_for_attempt' }
    await this.markJobFailed(job, input.message?.trim() || 'External runtime failed')
    return { success: true, job_id: jobId }
  }

  private async claimReadyRuntimeJob(jobId: string): Promise<BrainImportJobRecord | null> {
    const admin = this.getAdminClient()
    const job = await this.runtimeRepository.loadJobById(admin, jobId)
    if (!job || (job.status !== 'queued' && job.status !== 'retry')) return null

    const nextAttemptAt = Date.parse(job.next_attempt_at)
    if (Number.isFinite(nextAttemptAt) && nextAttemptAt > Date.now()) {
      await this.enqueueRuntimeJob(job.id, nextAttemptAt - Date.now())
      return null
    }

    const count = await this.runtimeRepository.countProcessingJobsForUser(admin, job.user_id)
    if (count >= this.maxConcurrentPerUser) {
      await this.enqueueRuntimeJob(job.id, 30_000)
      return null
    }

    const claimed = await this.claimJob(job)
    return claimed
  }

  private async installRuntimeSweep(): Promise<void> {
    if (!this.brainImportQueue) return
    await this.brainImportQueue.add(
      'brain-import-sweep',
      {},
      {
        jobId: 'brain-import-sweep',
        repeat: { every: this.pollIntervalMs },
        removeOnComplete: true,
        removeOnFail: true,
      },
    )
  }

  private async enqueueRuntimeJob(jobId: string, delayMs = 0): Promise<void> {
    if (!this.brainImportQueue) {
      const admin = this.getAdminClient()
      const data = await this.runtimeRepository.loadJobById(admin, jobId)
      if (data) {
        const claimed = await this.claimJob(data)
        if (claimed) await this.executeClaimedJob(claimed)
      }
      return
    }

    const delay = Math.max(0, delayMs)
    await this.brainImportQueue.add(
      'brain-import-job',
      { jobId },
      {
        delay,
        jobId: `brain-import-${jobId}`,
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 1,
      },
    )
  }

  // ── Private: Job Infrastructure ─────────────────────────────────────────

  private async recoverStaleJobs(admin: SupabaseClient) {
    const staleThreshold = new Date(
      Date.now() - BrainImportJobsBase.STALE_PROCESSING_MS,
    ).toISOString()
    const stale = await this.runtimeRepository.findStaleJobs(admin, staleThreshold)
    if (!stale?.length) return

    for (const job of stale) {
      const maxAttempts = Number(job.max_attempts) || this.maxAttempts
      const nextStatus = Number(job.attempts) >= maxAttempts ? 'failed' : 'retry'
      const update: Record<string, unknown> = {
        status: nextStatus,
        last_error: `Recovered: stuck in processing beyond ${Math.floor(BrainImportJobsBase.STALE_PROCESSING_MS / 60000)}-minute timeout`,
      }
      if (nextStatus === 'failed') {
        update.completed_at = new Date().toISOString()
      } else {
        update.next_attempt_at = new Date().toISOString()
      }
      await this.runtimeRepository.updateJob(admin, job.id, update)
      this.logger.warn(`Recovered stale job ${job.id} → ${nextStatus}`)
    }
  }

  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const serialized = JSON.stringify(payload)
    if (serialized.length <= BrainImportJobsBase.MAX_PAYLOAD_BYTES) return payload
    const cleaned = { ...payload }
    delete cleaned.mediaBase64
    this.logger.warn(
      `Stripped mediaBase64 from job payload (${serialized.length} bytes → ${JSON.stringify(cleaned).length} bytes)`,
    )
    return cleaned
  }

  protected async enqueueJob(
    userId: string,
    jobType: BrainImportJobType,
    title: string,
    dedupeKey: string,
    payload: Record<string, unknown>,
    orgId?: string | null,
  ) {
    const safePayload = this.sanitizePayload(payload)
    const admin = this.getAdminClient()
    const existing = await this.runtimeRepository.findExistingActiveJob(admin, userId, dedupeKey)
    if (existing?.id) {
      return {
        jobId: existing.id as string,
        status: existing.status as BrainImportJobStatus,
        deduped: true,
      }
    }

    const { data, error } = await this.runtimeRepository.insertJob(admin, {
      user_id: userId,
      org_id: orgId ?? null,
      job_type: jobType,
      title,
      dedupe_key: dedupeKey,
      payload: safePayload,
      status: 'queued',
      attempts: 0,
      max_attempts: this.maxAttempts,
      next_attempt_at: new Date().toISOString(),
    })

    if (error?.message?.includes('uq_brain_import_jobs_active_dedupe')) {
      let raced: { id: string; status: BrainImportJobStatus } | null = null
      let racedError: Error | null = null
      try {
        raced = await this.runtimeRepository.findExistingActiveJob(admin, userId, dedupeKey)
      } catch (error) {
        racedError = error as Error
      }
      if (racedError || !raced)
        throw new Error(
          `DB error: ${racedError?.message ?? 'Dedupe conflict but could not find existing job'}`,
        )
      return {
        jobId: raced.id as string,
        status: raced.status as BrainImportJobStatus,
        deduped: true,
      }
    }

    if (error || !data) throw new Error(`DB error: ${error?.message ?? 'Failed to enqueue job'}`)

    void this.processDueJobs()
    return { jobId: data.id as string, status: data.status as BrainImportJobStatus, deduped: false }
  }

  private async claimJob(job: BrainImportJobRecord): Promise<BrainImportJobRecord | null> {
    const admin = this.getAdminClient()
    const attempts = Number(job.attempts || 0) + 1
    return this.runtimeRepository.claimJob(admin, job.id, attempts)
  }

  private async loadRuntimeJobForAttempt(
    jobId: string,
    attempts: number,
  ): Promise<BrainImportJobRecord | null> {
    const admin = this.getAdminClient()
    return this.runtimeRepository.loadJobForAttempt(admin, jobId, attempts)
  }

  private async executeClaimedJob(job: BrainImportJobRecord) {
    try {
      const result = await this.executeViaAtlas(job)
      await this.markJobSucceeded(job, result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown job error'
      await this.markJobFailed(job, message)
    }
  }

  private async markJobSucceeded(
    job: BrainImportJobRecord,
    result: Record<string, unknown>,
  ): Promise<void> {
    const admin = this.getAdminClient()
    const { error } = await this.runtimeRepository.updateJobForAttempt(
      admin,
      job.id,
      job.attempts,
      {
        status: 'succeeded',
        result: result as Record<string, unknown>,
        completed_at: new Date().toISOString(),
      },
    )
    if (error) throw new Error(`DB error: ${error.message}`)

    if (job.job_type === 'slack_period_import' || job.job_type === 'campaign_slack_import') {
      await this.markSlackMappingSynced(job).catch((err) =>
        this.logger.warn(`Failed to update Slack brain mapping cursor: ${(err as Error).message}`),
      )
    }

    void this.emitJobNotification(job, 'succeeded').catch(() => {})

    const payload = job.payload as Record<string, unknown>
    if (
      (job.job_type === 'fathom_meeting_import' ||
        job.job_type === 'fireflies_transcript_import') &&
      !payload.targetBrainOverride
    ) {
      void this.triggerCrossPollination(job).catch((err) =>
        this.logger.warn(`Cross-pollination analysis failed: ${(err as Error).message}`),
      )
    }
  }

  private async markJobFailed(job: BrainImportJobRecord, message: string): Promise<void> {
    const creditsExhausted = this.isCreditsExhaustedError(message)
    const rateLimited = this.isRateLimitError(message)
    const displayMessage = this.formatJobFailureMessage(message)
    const nextStatus =
      creditsExhausted || job.attempts >= (job.max_attempts || this.maxAttempts)
        ? 'failed'
        : 'retry'
    const retryDelayMs = this.getBackoffMs(job.attempts, message)
    const update: Record<string, unknown> = {
      status: nextStatus,
      last_error: displayMessage.slice(0, 1200),
      completed_at: nextStatus === 'failed' ? new Date().toISOString() : null,
    }
    if (nextStatus === 'retry') {
      update.next_attempt_at = new Date(Date.now() + retryDelayMs).toISOString()
    }
    const admin = this.getAdminClient()
    const { error: updateError } = await this.runtimeRepository.updateJobForAttempt(
      admin,
      job.id,
      job.attempts,
      update,
    )
    if (updateError) {
      this.logger.error(`Failed to update job ${job.id} failure state: ${updateError.message}`)
      reportAppError(this.errorReporter, {
        app: process.env.APP_NAME ?? 'api',
        category: 'worker',
        feature: 'brain/import_jobs',
        error_code: 'failure_state_update_failed',
        message: updateError.message,
        user_id: job.user_id,
        context: { jobId: job.id, attempts: job.attempts },
      })
    }
    if (nextStatus === 'failed') {
      void this.emitJobNotification(
        job,
        'failed',
        displayMessage,
        creditsExhausted ? 'credits_exhausted' : rateLimited ? 'rate_limited' : undefined,
      ).catch(() => {})
    } else {
      await this.enqueueRuntimeJob(job.id, retryDelayMs).catch((err) =>
        this.logger.warn(`Failed to schedule retry for brain import job ${job.id}: ${err}`),
      )
    }
    this.logger.warn(`Brain import job ${job.id} failed (${nextStatus}): ${displayMessage}`)
  }

  private async emitJobNotification(
    job: BrainImportJobRecord,
    outcome: 'succeeded' | 'failed',
    errorMessage?: string,
    failureReason?: 'credits_exhausted' | 'rate_limited',
  ) {
    try {
      const admin = this.getAdminClient()
      const orgId = await this.runtimeRepository.findJobOrgId(admin, job.id)

      const type = outcome === 'succeeded' ? 'brain_import_succeeded' : 'brain_import_failed'
      const title =
        outcome === 'succeeded'
          ? `Brain import complete: ${job.title}`
          : `Brain import failed: ${job.title}`
      const body = outcome === 'failed' && errorMessage ? errorMessage.slice(0, 500) : null

      const { error: notificationError } = await this.runtimeRepository.insertNotification(admin, {
        user_id: job.user_id,
        org_id: orgId,
        type,
        title,
        body,
        action_url: '/brain',
        metadata:
          outcome === 'failed'
            ? {
                brain_import_job_id: job.id,
                retry_action: 'brain_import_job_retry',
                ...(failureReason ? { failure_reason: failureReason } : {}),
              }
            : null,
      })
      if (notificationError) {
        this.logger.warn(`Failed to emit brain job notification: ${notificationError.message}`)
      }
    } catch (err) {
      this.logger.warn(`Failed to emit brain job notification: ${(err as Error).message}`)
    }
  }
}
