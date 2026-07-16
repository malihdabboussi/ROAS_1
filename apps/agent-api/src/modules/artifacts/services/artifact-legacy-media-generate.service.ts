import { Injectable } from '@nestjs/common'
import { ArtifactLegacyMediaGenerateRepository } from '../repositories/artifact-legacy-media-generate.repository'
import { ArtifactLegacyMediaJobsService } from './artifact-legacy-media-jobs.service'
import { ArtifactLegacyMediaProviderService } from './artifact-legacy-media-provider.service'
import { ArtifactLegacyMediaUploadService } from './artifact-legacy-media-upload.service'

@Injectable()
export class ArtifactLegacyMediaGenerateService {
  constructor(
    private readonly repository = new ArtifactLegacyMediaGenerateRepository(),
    private readonly mediaProvider = new ArtifactLegacyMediaProviderService(),
  ) {}

  private readonly jobsService = new ArtifactLegacyMediaJobsService()
  private readonly uploadService = new ArtifactLegacyMediaUploadService()

  async generateGoogleImageViaRest(
    target: Record<string, any>,
    model: string,
    prompt: string,
    aspectRatio: string,
    inputImages?: Array<{ base64: string; mimeType: string }>,
  ): Promise<{ imageBytesB64: string; mimeType: string }> {
    return this.mediaProvider.generateGoogleImageViaRest(
      target,
      model,
      prompt,
      aspectRatio,
      inputImages,
    )
  }

  async generateImage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const prompt = input.prompt as string
    if (!prompt) return { success: false, error: 'prompt is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    let campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId && input.ad_id && typeof input.ad_id === 'string') {
      const resolved = await this.repository.findCampaignIdFromAd(supabase, {
        adId: input.ad_id,
        userId,
      })
      if (resolved.campaignId) {
        campaignId = resolved.campaignId
        target.logger.debug(
          resolved.source === 'ad'
            ? `[Image] Resolved campaign_id ${campaignId} from ad_id for campaign media`
            : `[Image] Resolved campaign_id ${campaignId} from ad_id -> ad_set -> ad_campaign`,
        )
      }
    }
    const avatarId = typeof input.avatar_id === 'string' ? input.avatar_id.trim() : ''
    if (input.avatar_id !== undefined && !avatarId)
      return { success: false, error: 'avatar_id must be a non-empty string when provided' }
    const avatarImage = avatarId
      ? await this.repository.resolveAvatarImageContext(supabase, { avatarId, userId, campaignId })
      : null
    if (avatarImage?.error) throw avatarImage.error
    if (avatarImage?.failure) return { success: false, error: avatarImage.failure }
    if (avatarImage?.data?.campaignId) campaignId = avatarImage.data.campaignId
    if (campaignId) {
      const enabled = await target.isMediaGenerationEnabled(supabase, campaignId)
      if (!enabled)
        return { success: false, error: 'Media generation is disabled for this campaign' }
    }
    const aspectRatio = (input.aspect_ratio as string) ?? '1:1'
    const isMissionSession = target.isMissionSessionKey(sessionKey ?? '')
    const missionContext = isMissionSession
      ? await target.resolveMissionContext(sessionKey ?? '', userId)
      : null
    const missionAgentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '') ?? 'unknown'
    let finalPrompt = prompt
    if (campaignId) {
      try {
        const { data: campaign } = await this.repository.findCampaignConfig(supabase, campaignId)
        const themeId = (campaign?.config as Record<string, any>)?.agent_settings?.theme_id as
          | string
          | undefined
        if (themeId) {
          const { data: theme } = await this.repository.findBrandingThemeStylePrompt(
            supabase,
            themeId,
          )
          const stylePrompt =
            typeof theme?.image_style_prompt === 'string' ? theme.image_style_prompt.trim() : ''
          if (stylePrompt) {
            finalPrompt = `${prompt}\n\nBrand image style: ${stylePrompt}`
            target.logger.debug(`[Image] Injected image_style_prompt from theme ${themeId}`)
          }
        }
      } catch {
        // Non-critical — proceed with original prompt if theme lookup fails
      }
    }

    const requestedModel = typeof input.model === 'string' ? input.model.trim() : ''
    const aliasResolved =
      this.mediaProvider.MODEL_ALIASES[requestedModel.toLowerCase()] ?? requestedModel
    const resolvedModelKey = aliasResolved || this.mediaProvider.DEFAULT_IMAGE_MODEL
    const modelEntry = this.mediaProvider.IMAGE_MODELS[resolvedModelKey]
    const openRouterModel =
      modelEntry?.openRouterModel ??
      (resolvedModelKey.startsWith('openai/') || resolvedModelKey.startsWith('google/')
        ? resolvedModelKey
        : undefined)
    const useOpenRouter = Boolean(openRouterModel)
    const googleAspectRatio = this.mediaProvider.normalizeGoogleImageAspectRatio(aspectRatio)

    let imageBytesB64 = ''
    let mimeType = 'image/png'
    let billingProvider: 'google' | 'openai' = 'google'
    let billingModel = this.mediaProvider.GOOGLE_IMAGE_MODEL_ID
    let tokenUsage: { input: number; output: number } | undefined
    const inputImages = await this.mediaProvider.fetchInputImagesFromInput(target, input)
    const isEditMode = inputImages.length > 0
    if (isEditMode) {
      target.logger.log(`[Image] Edit mode: ${inputImages.length} input image(s) provided`)
    }
    const mediaOrgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const conversationId = sessionKey ? target.parseConversationId(sessionKey as string) : null

    if (useOpenRouter) {
      const orModel = openRouterModel ?? this.mediaProvider.OPENAI_IMAGE_MODEL
      if (!target.openRouterApiKey) {
        return {
          success: false,
          error: 'OpenRouter API key not configured for image generation',
        }
      }
      target.logger.log(`[Image] Generating via OpenRouter model=${orModel}`)
      try {
        const orResult = await this.mediaProvider.generateImageViaOpenRouter(
          target,
          finalPrompt,
          aspectRatio,
          orModel,
          isEditMode ? inputImages : undefined,
          {
            userId,
            orgId: mediaOrgId ?? null,
            campaignId: campaignId ?? null,
            conversationId: conversationId ?? null,
          },
        )
        imageBytesB64 = orResult.imageBytesB64
        mimeType = orResult.mimeType
        tokenUsage = orResult.usage
        const isOpenAiModel = modelEntry?.provider === 'openai' || orModel.startsWith('openai/')
        billingProvider = isOpenAiModel ? 'openai' : 'google'
        billingModel =
          modelEntry?.billingModel ??
          (isOpenAiModel ? orModel.replace(/^openai\//, '') : orModel.replace(/^google\//, ''))
      } catch (orErr) {
        return {
          success: false,
          error: orErr instanceof Error ? orErr.message : 'OpenRouter image generation failed',
        }
      }
    } else {
      if (!target.geminiApiKey) {
        return {
          success: false,
          error: 'Google Gemini API not configured',
        }
      }
      const selectedGoogleModel =
        modelEntry?.googleModel ?? this.mediaProvider.GOOGLE_IMAGE_MODEL_ID
      billingModel = selectedGoogleModel
      try {
        target.logger.log(
          `[Image] ${isEditMode ? 'Editing' : 'Generating'} via Google model=${selectedGoogleModel}`,
        )
        const primary = await this.generateGoogleImageViaRest(
          target,
          selectedGoogleModel,
          finalPrompt,
          googleAspectRatio ?? aspectRatio,
          isEditMode ? inputImages : undefined,
        )
        imageBytesB64 = primary.imageBytesB64
        mimeType = primary.mimeType
        if (!imageBytesB64) {
          throw new Error('No output from Google image generation')
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown'
        target.logger.error(`[Image] Google failed: ${errMsg}`)

        if (this.mediaProvider.isImageRateLimitError(errMsg) && target.openRouterApiKey) {
          target.logger.warn(
            `[Image] Google rate-limited, routing to OpenRouter (${target.OPENROUTER_IMAGE_MODEL})`,
          )
          try {
            const orResult = await this.mediaProvider.generateImageViaOpenRouter(
              target,
              finalPrompt,
              googleAspectRatio ?? aspectRatio,
              undefined,
              isEditMode ? inputImages : undefined,
              {
                userId,
                orgId: mediaOrgId ?? null,
                campaignId: campaignId ?? null,
                conversationId: conversationId ?? null,
              },
            )
            imageBytesB64 = orResult.imageBytesB64
            mimeType = orResult.mimeType
          } catch (orErr) {
            return {
              success: false,
              error: orErr instanceof Error ? orErr.message : 'OpenRouter image generation failed',
            }
          }
        } else {
          return {
            success: false,
            error: errMsg || 'Image generation failed',
          }
        }
      }
    }
    const rcSpace =
      conversationId && target.requestContext?.get
        ? target.requestContext.get(conversationId)
        : null
    const spaceIdFromCtx = (rcSpace?.spaceId as string | null | undefined) ?? null
    const spaceIdFromInput =
      typeof input.space_id === 'string' && input.space_id.trim().length > 0
        ? input.space_id.trim()
        : null
    const upload = await this.uploadService.uploadMediaFromBytes(
      target,
      Buffer.from(imageBytesB64, 'base64'),
      mimeType,
      'image',
      userId,
      campaignId,
      prompt,
      billingModel,
      mediaOrgId,
      spaceIdFromInput ?? spaceIdFromCtx,
      conversationId,
    )
    if (!upload.success) return upload

    if (billingProvider === 'openai' && tokenUsage) {
      await target.credits
        .calculateTextCredits(
          { input: tokenUsage.input, output: tokenUsage.output, cacheRead: 0, cacheWrite: 0 },
          `openai/${billingModel}`,
        )
        .then(async (calc: { apiCost: number; credits: number }) => {
          await target.credits.processFixedCostUsage({
            userId,
            campaignId: campaignId ?? undefined,
            conversationId: conversationId ?? undefined,
            orgId: mediaOrgId ?? undefined,
            feature: 'media',
            action: 'generate_image',
            provider: 'openai',
            modelName: billingModel,
            serviceType: 'image' as const,
            apiCostUsd: calc.apiCost,
            costSource: 'token_pricing',
            metadata: {
              provider: 'openai',
              provider_job_id: '',
              unit: 'tokens',
              input_tokens: tokenUsage!.input,
              output_tokens: tokenUsage!.output,
            },
          })
        })
    } else {
      const imageCost = (await target.credits.getUnitCost(billingModel, 'images_1')) ?? 0.067
      await target.credits.processFixedCostUsage({
        userId,
        campaignId: campaignId ?? undefined,
        conversationId: conversationId ?? undefined,
        orgId: mediaOrgId ?? undefined,
        feature: 'media',
        action: 'generate_image',
        provider: billingProvider,
        modelName: billingModel,
        serviceType: 'image' as const,
        apiCostUsd: imageCost,
        costSource: 'db_pricing',
        metadata: {
          provider: billingProvider,
          provider_job_id: '',
          unit: 'image',
          quantity: 1,
          unit_cost_usd: imageCost,
        },
      })
    }
    const assetObj =
      upload.asset && typeof upload.asset === 'object'
        ? (upload.asset as Record<string, unknown>)
        : null
    const imageUrl = upload.url ?? ''
    const imageAssetId = (assetObj?.id as string) ?? null
    const avatarUpdate = avatarImage?.data
      ? await this.repository.attachAvatarImage(supabase, {
          avatarId: avatarImage.data.avatarId,
          userId,
          personaData: avatarImage.data.personaData,
          imageUrl,
        })
      : null
    if (avatarUpdate?.error) throw avatarUpdate.error
    if (avatarUpdate && !avatarUpdate.data)
      return { success: false, error: 'avatar not found or access denied' }
    if (missionContext) {
      const uploadAsset = assetObj
      return target.persistMissionDeliverable({
        missionId: missionContext.missionId,
        userId,
        campaignId: campaignId ?? missionContext.campaignId,
        orgId: missionContext.orgId ?? null,
        agentKey: missionAgentKey,
        type: 'image',
        title:
          typeof input.title === 'string' && input.title.trim().length > 0
            ? input.title.trim()
            : 'Generated image',
        sourceAction: 'generate_image',
        content: prompt,
        fileUrl: upload.url ?? null,
        fileName: (uploadAsset?.original_filename as string | undefined) ?? null,
        fileSize:
          typeof uploadAsset?.file_size === 'number' ? (uploadAsset.file_size as number) : null,
        mimeType: (uploadAsset?.mime_type as string | undefined) ?? null,
        metadata: {
          provider: billingProvider,
          provider_job_id: '',
          model: billingModel,
          aspect_ratio: googleAspectRatio ?? aspectRatio,
          media_asset_id: (uploadAsset?.id as string | undefined) ?? null,
          media_generation_status: 'succeeded',
          ...(avatarUpdate?.data ? { avatar_id: avatarId, avatar_image_url: imageUrl } : {}),
        },
      })
    }

    const canvasNodeId = typeof input.canvas_node_id === 'string' ? input.canvas_node_id : undefined
    if (canvasNodeId) {
      const { ArtifactCanvasService } = await import('./artifact-canvas.service')
      const canvasSvc = new ArtifactCanvasService()
      await canvasSvc.patchCanvasNodeFromImage(
        supabase,
        userId,
        canvasNodeId,
        {
          url: imageUrl,
          image_url: imageUrl,
          image_asset_id: imageAssetId,
          asset: upload.asset,
        },
        prompt,
        input.model,
      )
    }

    const savedSpaceId = spaceIdFromInput ?? spaceIdFromCtx
    return {
      success: true,
      url: imageUrl,
      asset: upload.asset,
      asset_ref: upload.asset_ref,
      image_url: imageUrl,
      image_asset_id: imageAssetId,
      space_id: savedSpaceId,
      campaign_id: campaignId ?? null,
      media_library:
        imageAssetId && savedSpaceId
          ? 'registered_in_space_media'
          : imageAssetId
            ? 'registered_in_user_media'
            : 'url_only_no_asset_row',
      ...(avatarUpdate?.data ? { avatar_id: avatarId, avatar_image_url: imageUrl } : {}),
    }
  }

  async generateVideo(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const model = (input.model as string) ?? 'veo-3.1-fast'
    const prompt = input.prompt as string
    const isFabric = model === 'fabric-1.0'
    const isSeedance = model === 'seedance-2'

    if (!isFabric && !prompt) return { success: false, error: 'prompt is required' }
    if (isFabric && (!input.image_url || !input.audio_url))
      return { success: false, error: 'image_url and audio_url are required for fabric-1.0' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (campaignId) {
      const enabled = await target.isMediaGenerationEnabled(supabase, campaignId)
      if (!enabled)
        return { success: false, error: 'Media generation is disabled for this campaign' }
    }
    const aspectRatio = (input.aspect_ratio as string) ?? '16:9'
    const rawDuration = input.duration ?? (isFabric ? 0 : isSeedance ? 5 : 8)
    const duration =
      typeof rawDuration === 'string' ? parseInt(rawDuration, 10) : Number(rawDuration)

    if (isSeedance) {
      if (
        !Number.isFinite(duration) ||
        duration < 1 ||
        duration > 15 ||
        Math.floor(duration) !== duration
      ) {
        return {
          success: false,
          error:
            'seedance-2 requires integer duration between 1 and 15 seconds (-1 / auto duration not supported for billing)',
        }
      }
      const refImages = this.mediaProvider.collectStringUrlsFromInput(input, [
        'reference_image_urls',
        'reference_images',
      ])
      const hasFirstLast = Boolean(input.image_url || input.last_frame_url)
      if (refImages.length > 0 && hasFirstLast) {
        return {
          success: false,
          error:
            'seedance-2: reference_images cannot be combined with image_url or last_frame_url (first/last frame)',
        }
      }
      if (input.last_frame_url && !input.image_url) {
        return {
          success: false,
          error: 'seedance-2: last_frame_url requires image_url (first frame)',
        }
      }
    }

    const billingModel = isSeedance ? this.mediaProvider.resolveSeedance2BillingModel(input) : model
    const isMissionSession = target.isMissionSessionKey(sessionKey ?? '')
    const missionContext = isMissionSession
      ? await target.resolveMissionContext(sessionKey ?? '', userId)
      : null
    const missionAgentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '') ?? 'unknown'

    const modelEntry =
      this.mediaProvider.VIDEO_MODELS[model] ?? this.mediaProvider.VIDEO_MODELS['veo-3.1-fast']!

    if (target.replicateApiToken) {
      try {
        const [owner, name] = modelEntry.replicateId.split('/')
        const replicateInput = this.mediaProvider.buildReplicateInput(
          model,
          input,
          duration,
          aspectRatio,
        )

        target.logger.log(`[Video] Creating Replicate prediction model=${modelEntry.replicateId}`)

        const createRes = await fetch(
          `https://api.replicate.com/v1/models/${owner}/${name}/predictions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Token ${target.replicateApiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: replicateInput }),
          },
        )

        if (!createRes.ok) {
          const errText = await createRes.text()
          throw new Error(`Replicate error ${createRes.status}: ${errText.slice(0, 200)}`)
        }

        const prediction = (await createRes.json()) as { id: string; status: string }
        const job = await this.jobsService.createMediaJob(supabase, {
          user_id: userId,
          campaign_id: campaignId,
          asset_type: 'video',
          provider: 'replicate',
          provider_job_id: prediction.id,
          status: prediction.status === 'succeeded' ? 'succeeded' : 'starting',
          prompt: prompt ?? '',
          model: billingModel,
          aspect_ratio: aspectRatio,
          duration_seconds: duration,
        })

        const baseResponse = {
          success: true,
          pending: true,
          job_id: job.id,
          status: prediction.status,
        }
        if (!missionContext) return baseResponse

        const deliverable = await target.persistMissionDeliverable({
          missionId: missionContext.missionId,
          userId,
          campaignId: campaignId ?? missionContext.campaignId,
          orgId: missionContext.orgId ?? null,
          agentKey: missionAgentKey,
          type: 'video',
          title:
            typeof input.title === 'string' && input.title.trim().length > 0
              ? input.title.trim()
              : 'Generated video',
          sourceAction: 'generate_video',
          content: prompt ?? '',
          metadata: {
            provider: 'replicate',
            provider_job_id: prediction.id,
            media_job_id: job.id,
            model: billingModel,
            requested_model: model,
            aspect_ratio: aspectRatio,
            duration_seconds: duration,
            media_generation_status: prediction.status,
          },
        })
        return { ...baseResponse, deliverable_id: deliverable.deliverable_id }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown'
        if (!modelEntry.hasGoogleFallback) {
          throw new Error(`Video generation failed for ${model}: ${errMsg}`)
        }
        target.logger.error(`[Video] Replicate failed, attempting Google fallback: ${errMsg}`)
      }
    }

    if (!modelEntry.hasGoogleFallback) {
      return { success: false, error: `${model} requires Replicate API — no fallback available` }
    }

    const ai = target.getGoogleClient()
    if (!ai) {
      return {
        success: false,
        error: target.replicateApiToken
          ? 'Video generation failed'
          : 'Replicate API not configured and Google Gemini API not configured',
      }
    }

    const googleAspectRatio = this.mediaProvider.normalizeGoogleVideoAspectRatio(aspectRatio)
    target.logger.log(
      `[Video] Creating Google operation model=${this.mediaProvider.GOOGLE_VIDEO_MODEL_ID}`,
    )

    const operation = await ai.models.generateVideos({
      model: this.mediaProvider.GOOGLE_VIDEO_MODEL_ID,
      prompt,
      config: {
        numberOfVideos: 1,
        durationSeconds: duration,
        ...(googleAspectRatio ? { aspectRatio: googleAspectRatio } : {}),
      },
    })

    const opName = (operation?.name ?? '').trim()
    if (!opName)
      return { success: false, error: 'Google video generation returned no operation name' }

    const job = await this.jobsService.createMediaJob(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      asset_type: 'video',
      provider: 'google',
      provider_job_id: opName,
      status: operation.done ? 'succeeded' : 'starting',
      prompt,
      model: this.mediaProvider.GOOGLE_VIDEO_MODEL_ID,
      aspect_ratio: aspectRatio,
      duration_seconds: duration,
    })

    const baseResponse = {
      success: true,
      pending: true,
      job_id: job.id,
      status: operation.done ? 'succeeded' : 'starting',
    }
    if (!missionContext) return baseResponse

    const deliverable = await target.persistMissionDeliverable({
      missionId: missionContext.missionId,
      userId,
      campaignId: campaignId ?? missionContext.campaignId,
      orgId: missionContext.orgId ?? null,
      agentKey: missionAgentKey,
      type: 'video',
      title:
        typeof input.title === 'string' && input.title.trim().length > 0
          ? input.title.trim()
          : 'Generated video',
      sourceAction: 'generate_video',
      content: prompt,
      metadata: {
        provider: 'google',
        provider_job_id: opName,
        media_job_id: job.id,
        model: this.mediaProvider.GOOGLE_VIDEO_MODEL_ID,
        aspect_ratio: googleAspectRatio ?? aspectRatio,
        duration_seconds: duration,
        media_generation_status: operation.done ? 'succeeded' : 'starting',
      },
    })

    return { ...baseResponse, deliverable_id: deliverable.deliverable_id }
  }
}
