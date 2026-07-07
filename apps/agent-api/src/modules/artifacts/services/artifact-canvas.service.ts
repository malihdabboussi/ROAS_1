import { Injectable } from '@nestjs/common'
import { AD_STRATEGIES, getAdStrategy, type AdStrategyKey } from '@vibey/api-shared'
import { ArtifactCanvasRepository } from '../repositories/artifact-canvas.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactCanvasService {
  constructor(
    private readonly repository: ArtifactCanvasRepository = new ArtifactCanvasRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_canvas_nodes: (data, sessionKey) => this.listCanvasNodes(target, data, sessionKey),
      generate_ad_set: (data, sessionKey) => this.generateAdSet(target, data, sessionKey),
      edit_image: (data, sessionKey) => this.editImage(target, data, sessionKey),
    }
  }

  private async listCanvasNodes(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    if (input.canvas_id && typeof input.canvas_id === 'string') {
      const { data: nodes, error } = await this.repository.listNodesByCanvasId(supabase, {
        canvasId: input.canvas_id,
        userId,
      })
      if (error) return { success: false, error: error.message }
      return { success: true, nodes: nodes ?? [] }
    }

    if (input.ad_set_id && typeof input.ad_set_id === 'string') {
      const { data: canvas, error: canvasErr } = await this.repository.findCanvasByAdSet(
        supabase,
        { adSetId: input.ad_set_id, userId },
      )
      if (canvasErr) return { success: false, error: canvasErr.message }
      if (!canvas) return { success: true, nodes: [] }

      const { data: nodes, error } = await this.repository.listNodesByCanvasId(supabase, {
        canvasId: String(canvas.id),
        userId,
      })
      if (error) return { success: false, error: error.message }
      return { success: true, nodes: nodes ?? [], canvas_id: canvas.id }
    }

    return { success: false, error: 'canvas_id or ad_set_id is required' }
  }

  private async editImage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : ''
    if (!prompt) return { success: false, error: 'prompt is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    let parentUrl = typeof input.parent_image_url === 'string' ? input.parent_image_url : undefined
    if (!parentUrl && typeof input.parent_image_asset_id === 'string') {
      const { data: asset } = await this.repository.findMediaAsset(supabase, {
        assetId: input.parent_image_asset_id,
        userId,
      })
      if (asset?.public_url) {
        parentUrl = asset.public_url as string
      }
    }

    if (!parentUrl) {
      return { success: false, error: 'parent_image_url or parent_image_asset_id is required' }
    }

    const generateInput: Record<string, unknown> = {
      prompt,
      input_image_url: parentUrl,
      aspect_ratio: input.aspect_ratio ?? '1:1',
      model: input.model,
      campaign_id: input.campaign_id,
      space_id: input.space_id,
      ad_id: input.ad_id,
    }

    const result = await target.generateImage(generateInput, sessionKey)
    if (!result || (result as { success?: boolean }).success === false) return result

    const canvasNodeId = typeof input.canvas_node_id === 'string' ? input.canvas_node_id : undefined
    if (canvasNodeId) {
      await this.patchCanvasNodeFromImage(
        supabase,
        userId,
        canvasNodeId,
        result as Record<string, unknown>,
        prompt,
        input.model,
      )
    }

    return result
  }

  private async generateAdSet(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adSetId = typeof input.ad_set_id === 'string' ? input.ad_set_id : ''
    if (!adSetId) return { success: false, error: 'ad_set_id is required' }

    const strategiesRaw = Array.isArray(input.strategies) ? input.strategies : []
    const strategies = strategiesRaw
      .map((s) => String(s))
      .filter((s) => AD_STRATEGIES.some((def) => def.key === s)) as AdStrategyKey[]

    if (strategies.length === 0) {
      return { success: false, error: 'strategies must include at least one valid strategy key' }
    }

    const variationsPerStrategy = Math.min(
      4,
      Math.max(1, Number(input.variations_per_strategy ?? 2) || 2),
    )

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: adSet, error: adSetErr } = await this.repository.findAdSet(supabase, {
      adSetId,
      userId,
    })
    if (adSetErr || !adSet) return { success: false, error: 'Ad set not found' }

    let campaignId: string | null = typeof input.campaign_id === 'string' ? input.campaign_id : null
    let resolvedSpaceId =
      getActiveSpaceId(input) ??
      (typeof adSet.space_id === 'string' && adSet.space_id.trim() ? adSet.space_id : null)
    if (!campaignId && adSet.ad_campaign_id) {
      const { data: adCampaign } = await this.repository.findAdCampaign(
        supabase,
        String(adSet.ad_campaign_id),
      )
      campaignId = (adCampaign?.campaign_id as string | null) ?? null
      if (
        !resolvedSpaceId &&
        typeof adCampaign?.space_id === 'string' &&
        adCampaign.space_id.trim()
      ) {
        resolvedSpaceId = adCampaign.space_id
      }
    }

    const createdAds: Record<string, unknown>[] = []

    for (const strategyKey of strategies) {
      const strategy = getAdStrategy(strategyKey)
      for (let v = 0; v < variationsPerStrategy; v++) {
        const prompt = strategy.defaultPromptTemplate.replace(/\{\{[^}]+\}\}/g, 'your offer')
        const genResult = (await target.generateImage(
          {
            prompt,
            aspect_ratio: '1:1',
            campaign_id: campaignId ?? undefined,
            space_id: resolvedSpaceId ?? undefined,
            model: input.model,
          },
          sessionKey,
        )) as Record<string, unknown>

        if (genResult.success === false) continue

        const imageUrl = (genResult.url ?? genResult.image_url) as string | undefined
        const imageAssetId = (genResult.image_asset_id ??
          (genResult.asset as Record<string, unknown> | undefined)?.id) as string | undefined

        const { data: ad, error: adErr } = await this.repository.createAd(supabase, {
          user_id: userId,
          campaign_id: campaignId,
          ...(resolvedSpaceId ? { space_id: resolvedSpaceId } : {}),
          ad_set_id: adSetId,
          platform: 'meta',
          placement: 'feed',
          headline: strategy.name,
          primary_text: strategy.description,
          destination_url: '',
          image_url: imageUrl ?? null,
          image_asset_id: imageAssetId ?? null,
          metadata: {
            creative_strategy: strategyKey,
            variation_index: v,
          },
        })

        if (!adErr && ad) createdAds.push(ad as Record<string, unknown>)
      }
    }
    await ensureSpaceView({
      supabase,
      spaceId: resolvedSpaceId,
      campaignId,
      viewType: 'ads',
      logger: target.logger,
    })

    return {
      success: true,
      ads: createdAds,
      count: createdAds.length,
      strategies,
      variations_per_strategy: variationsPerStrategy,
    }
  }

  async patchCanvasNodeFromImage(
    supabase: { from: (table: string) => any },
    userId: string,
    canvasNodeId: string,
    result: Record<string, unknown>,
    craftedPrompt: string,
    model?: unknown,
  ) {
    const imageUrl = (result.url ?? result.image_url) as string | undefined
    const imageAssetId = (result.image_asset_id ??
      (result.asset as Record<string, unknown> | undefined)?.id) as string | undefined

    const { data: node } = await this.repository.findCanvasNodePayload(supabase, {
      canvasNodeId,
      userId,
    })

    if (!node) return

    await this.repository.updateCanvasNodeFromImage(supabase, {
      canvasNodeId,
      userId,
      payload: {
        status: 'ready',
        image_asset_id: imageAssetId ?? null,
        payload: {
          ...(typeof node.payload === 'object' && node.payload ? node.payload : {}),
          image_url: imageUrl,
          image_asset_id: imageAssetId ?? null,
          crafted_prompt: craftedPrompt,
          model: typeof model === 'string' ? model : undefined,
        },
      },
    })
  }
}
