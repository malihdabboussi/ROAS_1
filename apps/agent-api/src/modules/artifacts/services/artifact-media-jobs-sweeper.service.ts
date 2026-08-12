import type { GoogleGenAI } from '@google/genai'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { ArtifactMediaJobsRepository } from '../repositories/artifact-media-jobs.repository'
import {
  ArtifactLegacyMediaStatusService,
  COMPLETION_CLAIM_TIMEOUT_MINUTES,
} from './artifact-legacy-media-status.service'

/** Jobs younger than this are still the polling agent's responsibility. */
const STALE_AFTER_MINUTES = 10
/** A job claimed for a sweep is left alone for this long before re-sweeping. */
const RESWEEP_AFTER_MINUTES = 10
/** Non-terminal jobs older than this are marked failed instead of re-polled. */
const FAIL_AFTER_HOURS = 24
const SWEEP_BATCH_SIZE = 10

/**
 * Resolves video generation jobs abandoned by their polling agent. generate_video
 * is async: the agent that started a job is expected to poll get_video_status, and
 * when it stops (session ended, error, context loss) the job stays 'starting' or
 * 'processing' forever and the finished provider output never becomes a media
 * asset. This sweeper re-drives such jobs through the exact same completion path
 * (ArtifactLegacyMediaStatusService.getVideoStatus) using a service-role target,
 * so upload, billing idempotency (hasProviderUsageEvent), and job updates behave
 * identically to an agent poll.
 */
@Injectable()
export class ArtifactMediaJobsSweeperService {
  private readonly logger = new Logger(ArtifactMediaJobsSweeperService.name)
  private readonly replicateApiToken: string
  private readonly geminiApiKey: string
  private readonly repository = new ArtifactMediaJobsRepository()
  private readonly statusService = new ArtifactLegacyMediaStatusService()
  private sweeping = false

  constructor(
    private readonly config: ConfigService,
    private readonly credits: CreditsService,
    private readonly svc: SupabaseServiceClient,
  ) {
    this.replicateApiToken = this.config.get<string>('REPLICATE_API_TOKEN', '')
    this.geminiApiKey =
      this.config.get<string>('GEMINI_API_KEY', '') || this.config.get<string>('GOOGLE_API_KEY', '')
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepStaleVideoJobs(): Promise<{ checked: number; resolved: number; failed: number }> {
    const summary = { checked: 0, resolved: 0, failed: 0 }
    if (process.env.MEDIA_JOBS_SWEEPER_DISABLED === '1') return summary
    if (this.sweeping) return summary
    this.sweeping = true
    try {
      const now = Date.now()
      const staleCutoffIso = new Date(now - STALE_AFTER_MINUTES * 60_000).toISOString()
      const { data: jobs, error } = await this.repository.findStaleMediaJobs(this.svc.client, {
        assetType: 'video',
        createdBeforeIso: staleCutoffIso,
        limit: SWEEP_BATCH_SIZE,
      })
      if (error) {
        this.logger.error(`[MediaSweep] Stale job query failed: ${error.message}`)
        return summary
      }
      for (const job of jobs ?? []) {
        const outcome = await this.sweepJob(job, now)
        summary.checked += 1
        if (outcome === 'resolved') summary.resolved += 1
        if (outcome === 'failed') summary.failed += 1
      }
      if (summary.checked > 0) {
        this.logger.log(
          `[MediaSweep] checked=${summary.checked} resolved=${summary.resolved} failed=${summary.failed}`,
        )
      }
      return summary
    } finally {
      this.sweeping = false
    }
  }

  private async sweepJob(
    job: Record<string, unknown>,
    nowMs: number,
  ): Promise<'resolved' | 'failed' | 'skipped'> {
    const jobId = String(job.id ?? '')
    if (!jobId) return 'skipped'

    const resweepBeforeIso = new Date(nowMs - RESWEEP_AFTER_MINUTES * 60_000).toISOString()
    const { data: claimed, error: claimError } = await this.repository.claimMediaJobForSweep(
      this.svc.client,
      { jobId, nowIso: new Date(nowMs).toISOString(), resweepBeforeIso },
    )
    if (claimError) {
      this.logger.error(`[MediaSweep] Claim failed for job ${jobId}: ${claimError.message}`)
      return 'skipped'
    }
    if (!claimed?.length) return 'skipped'

    const createdAtMs = Date.parse(String(job.created_at ?? '')) || nowMs
    const expired = nowMs - createdAtMs > FAIL_AFTER_HOURS * 60 * 60_000

    try {
      const target = await this.buildSweepTarget(job)
      const result = (await this.statusService.getVideoStatus(target, { job_id: jobId })) as {
        success?: boolean
        status?: string
      }
      if (result?.success && result.status === 'succeeded') return 'resolved'
      // success:false with a status means the provider reported a terminal
      // failure and the status service already marked the job; without a
      // status it was a transient poll/transport error — leave the job alone
      // unless it has exceeded the fail-after window.
      if (result?.success === false && result.status) return 'failed'
      if (expired) {
        return (await this.failExpiredJob(jobId)) ? 'failed' : 'skipped'
      }
      return 'skipped'
    } catch (err) {
      this.logger.error(
        `[MediaSweep] Sweep failed for job ${jobId}: ${err instanceof Error ? err.message : err}`,
      )
      if (expired) {
        return (await this.failExpiredJob(jobId)) ? 'failed' : 'skipped'
      }
      return 'skipped'
    }
  }

  /**
   * Expires a job that never produced a provider result. Marking a job failed
   * is a terminal completion side effect, so it goes through the same atomic
   * completion claim as getVideoStatus — a poll that is mid-completion holds
   * the claim and the expiry backs off.
   */
  private async failExpiredJob(jobId: string): Promise<boolean> {
    const nowMs = Date.now()
    const { data: claimed, error: claimError } = await this.repository.claimMediaJobCompletion(
      this.svc.client,
      {
        jobId,
        claimedBy: 'media-sweeper-expiry',
        nowIso: new Date(nowMs).toISOString(),
        staleBeforeIso: new Date(nowMs - COMPLETION_CLAIM_TIMEOUT_MINUTES * 60_000).toISOString(),
      },
    )
    if (claimError) {
      this.logger.error(`[MediaSweep] Expiry claim failed for job ${jobId}: ${claimError.message}`)
      return false
    }
    if (!claimed?.length) return false

    const { error } = await this.repository.updateMediaJob(this.svc.client, {
      jobId,
      updates: {
        status: 'failed',
        error: `Timed out: no provider result after ${FAIL_AFTER_HOURS}h (sweeper)`,
      },
    })
    if (error) {
      this.logger.error(`[MediaSweep] Failed to expire job ${jobId}: ${error.message}`)
      return false
    }
    return true
  }

  /**
   * Minimal stand-in for the legacy artifacts runtime "target". The status
   * service resolves the user from the session key; a sweep has no session, so
   * identity comes from the job row and all data access uses the service-role
   * client (the same client the runtime hands to the upload repository).
   */
  private async buildSweepTarget(job: Record<string, unknown>): Promise<Record<string, unknown>> {
    const orgId = await this.resolveJobOrgId(job)
    return {
      serviceClient: this.svc.client,
      logger: this.logger,
      replicateApiToken: this.replicateApiToken,
      credits: this.credits,
      getGoogleClient: (): GoogleGenAI | null => this.getGoogleClient(),
      resolveUserId: () => String(job.user_id ?? ''),
      getUserClient: async () => this.svc.client,
      resolveOrgId: () => orgId,
      isMissionSessionKey: () => false,
      parseAgentIdFromSessionKey: () => 'media-sweeper',
      parseConversationId: () => null,
      requestContext: undefined,
    }
  }

  private async resolveJobOrgId(job: Record<string, unknown>): Promise<string | null> {
    const campaignId = typeof job.campaign_id === 'string' ? job.campaign_id : null
    if (!campaignId) return null
    const { data } = await this.svc.client
      .from('campaigns')
      .select('org_id')
      .eq('id', campaignId)
      .maybeSingle()
    return typeof data?.org_id === 'string' ? data.org_id : null
  }

  private getGoogleClient(): GoogleGenAI | null {
    if (!this.geminiApiKey) return null
    const { GoogleGenAI: GenAI } = require('@google/genai')
    return new GenAI({ apiKey: this.geminiApiKey })
  }
}
