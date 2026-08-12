import { Injectable } from '@nestjs/common'
import { ArtifactMissionDeliverablesRepository } from '../repositories/artifact-mission-deliverables.repository'
import { ArtifactLegacyMediaJobsService } from './artifact-legacy-media-jobs.service'
import { ArtifactLegacyMediaUploadService } from './artifact-legacy-media-upload.service'

/** How long a completion claim is honored before a crashed worker's claim may be retaken. */
export const COMPLETION_CLAIM_TIMEOUT_MINUTES = 10

function buildSucceededVideoStatus(
  job: Record<string, unknown>,
  url: string,
  mediaAssetId?: string | null,
  spaceId?: string | null,
) {
  return {
    success: true,
    job_id: job.id,
    status: 'succeeded',
    url,
    ...(mediaAssetId ? { media_asset_id: mediaAssetId } : {}),
    prompt: String(job.prompt ?? ''),
    ...(spaceId ? { space_id: spaceId } : {}),
  }
}

@Injectable()
export class ArtifactLegacyMediaStatusService {
  constructor(
    private readonly jobsService: ArtifactLegacyMediaJobsService = new ArtifactLegacyMediaJobsService(),
    private readonly uploadService: ArtifactLegacyMediaUploadService = new ArtifactLegacyMediaUploadService(),
    private readonly missionDeliverablesRepository: ArtifactMissionDeliverablesRepository = new ArtifactMissionDeliverablesRepository(),
  ) {}

  private readonly GOOGLE_VIDEO_MODEL_ID = 'veo-3.1-fast-generate-preview'

  async getVideoStatus(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const jobId = input.job_id as string
    if (!jobId) return { success: false, error: 'job_id is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const job = await this.jobsService.findMediaJobForUser(supabase, { jobId, userId })
    if (!job) return { success: false, error: 'job not found' }
    const isMissionSession = target.isMissionSessionKey(sessionKey ?? '')
    const missionContext = isMissionSession
      ? await target.resolveMissionContext(sessionKey ?? '', userId)
      : null
    const missionAgentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '') ?? 'unknown'

    const conversationIdForSpace = sessionKey
      ? target.parseConversationId(sessionKey as string)
      : null
    const rcSpace =
      conversationIdForSpace && target.requestContext?.get
        ? target.requestContext.get(conversationIdForSpace)
        : null
    const spaceIdFromCtx = (rcSpace?.spaceId as string | null | undefined) ?? null
    const jobSpaceId =
      typeof job.space_id === 'string' && job.space_id.trim().length > 0 ? job.space_id : null
    const effectiveSpaceId = jobSpaceId ?? spaceIdFromCtx

    if (job.status === 'succeeded' && job.media_asset_id) {
      if (missionContext) {
        await this.syncMissionVideoDeliverableForJob(target, {
          missionId: missionContext.missionId,
          userId,
          campaignId: (job.campaign_id as string | null) ?? missionContext.campaignId ?? null,
          agentKey: missionAgentKey,
          mediaJobId: String(job.id),
          provider: String(job.provider ?? ''),
          providerJobId: String(job.provider_job_id ?? ''),
          model: String(job.model ?? ''),
          prompt: String(job.prompt ?? ''),
          durationSeconds: Number(job.duration_seconds ?? 0),
          status: String(job.status ?? 'succeeded'),
          fileUrl: (job.result_url as string | null) ?? null,
          mediaAssetId: String(job.media_asset_id ?? ''),
        })
      }
      return buildSucceededVideoStatus(
        job,
        (job.result_url as string) ?? '',
        String(job.media_asset_id),
        effectiveSpaceId,
      )
    }

    const provider = String(job.provider ?? '')

    if (provider === 'replicate') {
      if (!target.replicateApiToken)
        return { success: false, error: 'Replicate API not configured' }

      const res = await fetch(`https://api.replicate.com/v1/predictions/${job.provider_job_id}`, {
        headers: { Authorization: `Token ${target.replicateApiToken}` },
      })
      if (!res.ok) {
        target.logger.error(`[Video] Poll error ${res.status} job_id=${job.id}`)
        return { success: false, job_id: job.id, error: `Poll error: ${res.status}` }
      }

      const prediction = (await res.json()) as {
        id: string
        status: string
        output?: unknown
        error?: string
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        const claimed = await this.claimCompletion(supabase, target, jobId, sessionKey)
        if (!claimed) {
          return this.resolveConcurrentCompletion(supabase, { jobId, userId, effectiveSpaceId })
        }
        await this.jobsService.updateMediaJob(supabase, job.id as string, {
          status: prediction.status === 'canceled' ? 'canceled' : 'failed',
          error: prediction.error ?? 'Video generation failed',
        })
        if (missionContext) {
          await this.syncMissionVideoDeliverableForJob(target, {
            missionId: missionContext.missionId,
            userId,
            campaignId: (job.campaign_id as string | null) ?? missionContext.campaignId ?? null,
            agentKey: missionAgentKey,
            mediaJobId: String(job.id),
            provider: 'replicate',
            providerJobId: String(job.provider_job_id ?? ''),
            model: String(job.model ?? ''),
            prompt: String(job.prompt ?? ''),
            durationSeconds: Number(job.duration_seconds ?? 0),
            status: prediction.status === 'canceled' ? 'canceled' : 'failed',
          })
        }
        return {
          success: false,
          job_id: job.id,
          status: prediction.status,
          error: prediction.error ?? '',
        }
      }

      if (prediction.status !== 'succeeded') {
        await this.jobsService.updateMediaJob(supabase, job.id as string, { status: 'processing' })
        if (missionContext) {
          await this.syncMissionVideoDeliverableForJob(target, {
            missionId: missionContext.missionId,
            userId,
            campaignId: (job.campaign_id as string | null) ?? missionContext.campaignId ?? null,
            agentKey: missionAgentKey,
            mediaJobId: String(job.id),
            provider: 'replicate',
            providerJobId: String(job.provider_job_id ?? ''),
            model: String(job.model ?? ''),
            prompt: String(job.prompt ?? ''),
            durationSeconds: Number(job.duration_seconds ?? 0),
            status: 'processing',
          })
        }
        return { success: true, job_id: job.id, status: prediction.status }
      }

      // Terminal provider success: from here on, every completion side effect
      // (upload, poster, billing, job update) must run exactly once across
      // concurrent agent polls and sweeper passes.
      const claimed = await this.claimCompletion(supabase, target, jobId, sessionKey)
      if (!claimed) {
        return this.resolveConcurrentCompletion(supabase, { jobId, userId, effectiveSpaceId })
      }

      const outputUrl = Array.isArray(prediction.output)
        ? (prediction.output[0] as string)
        : (prediction.output as string)
      if (!outputUrl) {
        await this.jobsService.updateMediaJob(supabase, job.id as string, {
          status: 'failed',
          error: 'No output from Replicate',
        })
        return {
          success: false,
          job_id: job.id,
          status: 'failed',
          error: 'No output from Replicate',
        }
      }

      const statusOrgIdForUpload = target.resolveOrgId?.(sessionKey) as string | null | undefined
      const upload = await this.uploadService.uploadMediaFromUrl(
        target,
        outputUrl,
        'video',
        userId,
        (job.campaign_id as string | null) ?? null,
        (job.prompt as string) ?? '',
        (job.model as string) ?? '',
        statusOrgIdForUpload,
        effectiveSpaceId,
        conversationIdForSpace,
        Number(job.duration_seconds ?? 0) || null,
      )

      if (!upload.success) {
        await this.jobsService.updateMediaJob(supabase, job.id as string, {
          status: 'failed',
          error: upload.error ?? 'Upload failed',
        })
        return { success: false, job_id: job.id, status: 'failed', error: upload.error ?? '' }
      }

      const assetId =
        upload.asset && typeof upload.asset === 'object' && 'id' in (upload.asset as any)
          ? String((upload.asset as any).id)
          : null

      await this.recordVideoBillingOnce(supabase, target, job, {
        provider: 'replicate',
        userId,
        sessionKey,
      })

      await this.jobsService.updateMediaJob(supabase, job.id as string, {
        status: 'succeeded',
        error: null,
        result_url: upload.url ?? null,
        media_asset_id: assetId,
      })
      if (missionContext) {
        await this.syncMissionVideoDeliverableForJob(target, {
          missionId: missionContext.missionId,
          userId,
          campaignId: (job.campaign_id as string | null) ?? missionContext.campaignId ?? null,
          agentKey: missionAgentKey,
          mediaJobId: String(job.id),
          provider: 'replicate',
          providerJobId: String(job.provider_job_id ?? ''),
          model: String(job.model ?? ''),
          prompt: String(job.prompt ?? ''),
          durationSeconds: Number(job.duration_seconds ?? 0),
          status: 'succeeded',
          fileUrl: upload.url ?? null,
          mediaAssetId: assetId,
        })
      }

      return buildSucceededVideoStatus(job, upload.url ?? '', assetId, effectiveSpaceId)
    }

    if (provider === 'google') {
      const ai = target.getGoogleClient()
      if (!ai) return { success: false, error: 'Google Gemini API not configured' }

      const opName = String(job.provider_job_id ?? '')
      if (!opName) return { success: false, error: 'Missing provider_job_id for google job' }

      const operation = await ai.operations.getVideosOperation({
        operation: { name: opName } as any,
      })

      if (operation.error) {
        const claimed = await this.claimCompletion(supabase, target, jobId, sessionKey)
        if (!claimed) {
          return this.resolveConcurrentCompletion(supabase, { jobId, userId, effectiveSpaceId })
        }
        await this.jobsService.updateMediaJob(supabase, job.id as string, {
          status: 'failed',
          error: JSON.stringify(operation.error).slice(0, 500),
        })
        if (missionContext) {
          await this.syncMissionVideoDeliverableForJob(target, {
            missionId: missionContext.missionId,
            userId,
            campaignId: (job.campaign_id as string | null) ?? missionContext.campaignId ?? null,
            agentKey: missionAgentKey,
            mediaJobId: String(job.id),
            provider: 'google',
            providerJobId: String(job.provider_job_id ?? ''),
            model: String(job.model ?? ''),
            prompt: String(job.prompt ?? ''),
            durationSeconds: Number(job.duration_seconds ?? 0),
            status: 'failed',
          })
        }
        return {
          success: false,
          job_id: job.id,
          status: 'failed',
          error: 'Video generation failed',
        }
      }

      if (!operation.done) {
        await this.jobsService.updateMediaJob(supabase, job.id as string, { status: 'processing' })
        if (missionContext) {
          await this.syncMissionVideoDeliverableForJob(target, {
            missionId: missionContext.missionId,
            userId,
            campaignId: (job.campaign_id as string | null) ?? missionContext.campaignId ?? null,
            agentKey: missionAgentKey,
            mediaJobId: String(job.id),
            provider: 'google',
            providerJobId: String(job.provider_job_id ?? ''),
            model: String(job.model ?? ''),
            prompt: String(job.prompt ?? ''),
            durationSeconds: Number(job.duration_seconds ?? 0),
            status: 'processing',
          })
        }
        return { success: true, job_id: job.id, status: 'processing' }
      }

      // Terminal provider success — same exactly-once ownership as replicate.
      const claimed = await this.claimCompletion(supabase, target, jobId, sessionKey)
      if (!claimed) {
        return this.resolveConcurrentCompletion(supabase, { jobId, userId, effectiveSpaceId })
      }

      const v = operation.response?.generatedVideos?.[0]?.video
      const videoBytesB64 = v?.videoBytes ?? ''
      const uri = v?.uri ?? ''
      const mimeType = v?.mimeType ?? 'video/mp4'

      let upload: { success: boolean; url?: string; asset?: unknown; error?: string }
      const googleOrgIdForUpload = target.resolveOrgId?.(sessionKey) as string | null | undefined

      if (videoBytesB64) {
        upload = await this.uploadService.uploadMediaFromBytes(
          target,
          Buffer.from(videoBytesB64, 'base64'),
          mimeType,
          'video',
          userId,
          (job.campaign_id as string | null) ?? null,
          (job.prompt as string) ?? '',
          (job.model as string) ?? '',
          googleOrgIdForUpload,
          effectiveSpaceId,
          conversationIdForSpace,
          undefined,
          undefined,
          Number(job.duration_seconds ?? 0) || null,
        )
      } else if (uri) {
        upload = await this.uploadService.uploadMediaFromUrl(
          target,
          uri,
          'video',
          userId,
          (job.campaign_id as string | null) ?? null,
          (job.prompt as string) ?? '',
          (job.model as string) ?? '',
          googleOrgIdForUpload,
          effectiveSpaceId,
          conversationIdForSpace,
          Number(job.duration_seconds ?? 0) || null,
        )
      } else {
        upload = { success: false, error: 'No output from Google video generation' }
      }

      if (!upload.success) {
        await this.jobsService.updateMediaJob(supabase, job.id as string, {
          status: 'failed',
          error: upload.error ?? 'Upload failed',
        })
        return { success: false, job_id: job.id, status: 'failed', error: upload.error ?? '' }
      }

      const assetId =
        upload.asset && typeof upload.asset === 'object' && 'id' in (upload.asset as any)
          ? String((upload.asset as any).id)
          : null

      await this.recordVideoBillingOnce(supabase, target, job, {
        provider: 'google',
        userId,
        sessionKey,
      })

      await this.jobsService.updateMediaJob(supabase, job.id as string, {
        status: 'succeeded',
        error: null,
        result_url: upload.url ?? null,
        media_asset_id: assetId,
      })
      if (missionContext) {
        await this.syncMissionVideoDeliverableForJob(target, {
          missionId: missionContext.missionId,
          userId,
          campaignId: (job.campaign_id as string | null) ?? missionContext.campaignId ?? null,
          agentKey: missionAgentKey,
          mediaJobId: String(job.id),
          provider: 'google',
          providerJobId: String(job.provider_job_id ?? ''),
          model: String(job.model ?? ''),
          prompt: String(job.prompt ?? ''),
          durationSeconds: Number(job.duration_seconds ?? 0),
          status: 'succeeded',
          fileUrl: upload.url ?? null,
          mediaAssetId: assetId,
        })
      }

      return buildSucceededVideoStatus(job, upload.url ?? '', assetId, effectiveSpaceId)
    }

    return { success: false, error: 'Unsupported provider' }
  }

  /**
   * Acquires exclusive completion ownership for a job whose provider reported
   * a terminal state. Exactly one concurrent caller (agent poll or sweeper)
   * wins; a claim older than COMPLETION_CLAIM_TIMEOUT_MINUTES is treated as
   * abandoned (worker crash) and may be retaken.
   */
  private async claimCompletion(
    supabase: Record<string, any>,
    target: Record<string, any>,
    jobId: string,
    sessionKey?: string,
  ): Promise<boolean> {
    const claimedBy = target.parseAgentIdFromSessionKey(sessionKey ?? '') ?? 'agent-poll'
    const staleBeforeIso = new Date(
      Date.now() - COMPLETION_CLAIM_TIMEOUT_MINUTES * 60_000,
    ).toISOString()
    return this.jobsService.claimMediaJobCompletion(supabase as never, {
      jobId,
      claimedBy: String(claimedBy),
      staleBeforeIso,
    })
  }

  /**
   * Result for a caller that lost the completion claim: the canonical terminal
   * state if the winner already recorded it, otherwise "processing" while the
   * winner finishes.
   */
  private async resolveConcurrentCompletion(
    supabase: Record<string, any>,
    input: { jobId: string; userId: string; effectiveSpaceId: string | null },
  ) {
    const reloaded = await this.jobsService.findMediaJobForUser(supabase as never, {
      jobId: input.jobId,
      userId: input.userId,
    })
    if (reloaded?.status === 'succeeded' && reloaded.media_asset_id) {
      return buildSucceededVideoStatus(
        reloaded,
        (reloaded.result_url as string) ?? '',
        String(reloaded.media_asset_id),
        input.effectiveSpaceId,
      )
    }
    if (reloaded?.status === 'failed' || reloaded?.status === 'canceled') {
      return {
        success: false,
        job_id: input.jobId,
        status: String(reloaded.status),
        error: String(reloaded.error ?? ''),
      }
    }
    return { success: true, job_id: input.jobId, status: 'processing' }
  }

  /**
   * Debits video credits at most once per job. The atomic billing flip on the
   * job row is the authoritative gate (safe under concurrency and stale-claim
   * retries); the usage-event lookup only covers jobs billed before the flip
   * column existed. Everything that can throw runs before the flip, so a
   * crash after it loses the debit rather than ever charging twice.
   */
  private async recordVideoBillingOnce(
    supabase: Record<string, any>,
    target: Record<string, any>,
    job: Record<string, unknown>,
    input: { provider: 'replicate' | 'google'; userId: string; sessionKey?: string },
  ): Promise<void> {
    const providerJobId = String(job.provider_job_id ?? '')
    const legacyCharged = await this.jobsService.hasProviderUsageEvent(
      supabase as never,
      input.userId,
      input.provider,
      providerJobId,
    )
    if (legacyCharged) return

    const seconds = Number(job.duration_seconds ?? 0)
    if (!Number.isFinite(seconds) || seconds <= 0) {
      throw new Error(`Invalid duration_seconds for video billing: ${String(job.duration_seconds)}`)
    }
    const rate = await this.resolveVideoRate(target, job, input.provider)

    const won = await this.jobsService.claimMediaJobBilling(supabase as never, {
      jobId: String(job.id),
    })
    if (!won) return

    const conversationId = input.sessionKey ? target.parseConversationId(input.sessionKey) : null
    const orgId = target.resolveOrgId?.(input.sessionKey) as string | null | undefined
    await target.credits.processFixedCostUsage({
      userId: input.userId,
      campaignId: ((job.campaign_id as string | null) ?? undefined) as string | undefined,
      conversationId: conversationId ?? undefined,
      orgId: orgId ?? undefined,
      feature: 'media',
      action: 'generate_video',
      provider: input.provider,
      modelName: rate.model,
      serviceType: 'video',
      apiCostUsd: seconds * rate.unitCost,
      costSource: 'db_pricing',
      metadata: {
        provider: input.provider,
        provider_job_id: providerJobId,
        unit: 'second',
        quantity: seconds,
        unit_cost_usd: rate.unitCost,
      },
    })
  }

  private async resolveVideoRate(
    target: Record<string, any>,
    job: Record<string, unknown>,
    provider: 'replicate' | 'google',
  ): Promise<{ model: string; unitCost: number }> {
    if (provider === 'replicate') {
      const model = String(job.model ?? '')
      const rate = await target.credits.getUnitCost(model, 'video_seconds')
      if (rate === null) {
        throw new Error(`No pricing in DB for video model: ${model}`)
      }
      return { model, unitCost: rate }
    }
    const googleModelKey = String(job.model ?? this.GOOGLE_VIDEO_MODEL_ID)
    const googleRate =
      (await target.credits.getUnitCost(
        googleModelKey.replace(/-generate-preview$/, '-no-audio'),
        'video_seconds',
      )) ??
      (await target.credits.getUnitCost('veo-3.1-fast-no-audio', 'video_seconds')) ??
      0.1
    return { model: googleModelKey, unitCost: googleRate }
  }

  async syncMissionVideoDeliverableForJob(
    target: Record<string, any>,
    input: {
      missionId: string
      userId: string
      campaignId: string | null
      orgId?: string | null
      agentKey: string
      mediaJobId: string
      provider: string
      providerJobId: string
      model: string
      prompt: string
      durationSeconds: number
      status: string
      fileUrl?: string | null
      mediaAssetId?: string | null
    },
  ): Promise<void> {
    const { data: existing, error } =
      await this.missionDeliverablesRepository.findLatestVideoDeliverableByMediaJob(
        target.serviceClient,
        { missionId: input.missionId, mediaJobId: input.mediaJobId },
      )
    if (error) throw error

    await target.persistMissionDeliverable({
      missionId: input.missionId,
      userId: input.userId,
      campaignId: input.campaignId,
      orgId: input.orgId ?? null,
      agentKey: input.agentKey,
      type: 'video',
      title: 'Generated video',
      sourceAction: 'generate_video',
      content: input.prompt,
      fileUrl: input.fileUrl ?? null,
      metadata: {
        provider: input.provider,
        provider_job_id: input.providerJobId,
        media_job_id: input.mediaJobId,
        model: input.model,
        duration_seconds: input.durationSeconds,
        media_generation_status: input.status,
        media_asset_id: input.mediaAssetId ?? null,
      },
      updateId: existing?.id ? String(existing.id) : null,
    })
  }
}
