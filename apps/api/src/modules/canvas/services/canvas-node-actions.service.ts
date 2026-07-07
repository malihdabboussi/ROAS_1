import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertImageModel } from '@vibey/api-shared'
import { AdVariationGeneratorService } from '../../campaigns/services/ad-variation-generator.service'
import { MediaService } from '../../media/services/media.service'
import { CanvasRepository } from '../repositories/canvas.repository'

@Injectable()
export class CanvasNodeActionsService {
  constructor(
    private readonly canvasRepo: CanvasRepository,
    private readonly mediaService: MediaService,
    private readonly adVariationGenerator: AdVariationGeneratorService,
  ) {}

  async runGenerate(
    supabase: SupabaseClient,
    nodeId: string,
    userId: string,
    body: {
      prompt?: string
      model?: string
      aspect_ratio?: string
      campaign_id?: string
    },
    orgId?: string | null,
  ) {
    const node = await this.requireNode(supabase, nodeId, userId)
    const prompt = String(body.prompt ?? node.payload?.prompt ?? '').trim()
    if (prompt.length < 3) throw new BadRequestException('prompt is required')

    const modelRaw =
      body.model ??
      node.payload?.model ??
      node.payload?.model_id ??
      'gemini-3.1-flash-image-preview'
    const model = typeof modelRaw === 'string' ? modelRaw : 'gemini-3.1-flash-image-preview'
    assertImageModel(model)

    await this.canvasRepo.updateNode(supabase, nodeId, { status: 'generating' })

    const result = await this.mediaService.generateImage(
      {
        prompt,
        aspect_ratio: (body.aspect_ratio as '1:1') ?? '1:1',
        campaign_id: body.campaign_id,
        category: 'ad-creative',
        model: model as 'gemini-3.1-flash-image-preview',
      },
      { id: userId },
      orgId,
    )

    if (!result.success || !result.url) {
      await this.canvasRepo.updateNode(supabase, nodeId, { status: 'error' })
      throw new BadRequestException(result.error ?? 'Image generation failed')
    }

    return this.canvasRepo.updateNode(supabase, nodeId, {
      status: 'ready',
      image_asset_id: result.asset?.id ?? null,
      payload: {
        ...node.payload,
        prompt,
        model,
        image_url: result.url,
        image_asset_id: result.asset?.id ?? null,
        crafted_prompt: prompt,
      },
    })
  }

  async runEdit(
    supabase: SupabaseClient,
    nodeId: string,
    userId: string,
    body: {
      prompt?: string
      model?: string
      parent_image_url?: string
      parent_image_asset_id?: string
      aspect_ratio?: string
      campaign_id?: string
    },
    orgId?: string | null,
  ) {
    const node = await this.requireNode(supabase, nodeId, userId)
    const prompt = String(body.prompt ?? node.payload?.prompt ?? '').trim()
    if (prompt.length < 3) throw new BadRequestException('prompt is required')

    const parentUrl =
      body.parent_image_url ??
      (node.payload?.parent_image_url as string | undefined) ??
      (node.parent_image_node_id
        ? await this.resolveParentImageUrl(supabase, node.parent_image_node_id)
        : null)

    if (!parentUrl && !body.parent_image_asset_id) {
      throw new BadRequestException('parent image is required for edit')
    }

    const modelRaw =
      body.model ??
      node.payload?.model ??
      node.payload?.model_id ??
      'gemini-3.1-flash-image-preview'
    const model = typeof modelRaw === 'string' ? modelRaw : 'gemini-3.1-flash-image-preview'
    assertImageModel(model, { requireEdit: true })

    await this.canvasRepo.updateNode(supabase, nodeId, { status: 'generating' })

    const result = await this.mediaService.generateImageEdit(
      {
        prompt,
        aspect_ratio: (body.aspect_ratio as '1:1') ?? '1:1',
        campaign_id: body.campaign_id,
        category: 'ad-creative',
        model: model as 'gemini-3.1-flash-image-preview',
        parent_image_url: parentUrl ?? undefined,
        parent_image_asset_id: body.parent_image_asset_id,
      },
      { id: userId },
      orgId,
    )

    if (!result.success || !result.url) {
      await this.canvasRepo.updateNode(supabase, nodeId, { status: 'error' })
      throw new BadRequestException(result.error ?? 'Image edit failed')
    }

    return this.canvasRepo.updateNode(supabase, nodeId, {
      status: 'ready',
      image_asset_id: result.asset?.id ?? null,
      payload: {
        ...node.payload,
        prompt,
        model,
        image_url: result.url,
        image_asset_id: result.asset?.id ?? null,
        crafted_prompt: prompt,
      },
    })
  }

  async runVariation(
    supabase: SupabaseClient,
    nodeId: string,
    userId: string,
    body: {
      prompt?: string
      model?: string
      base_image_url?: string
      base_image_asset_id?: string
      campaign_id?: string
    },
    orgId?: string | null,
  ) {
    const node = await this.requireNode(supabase, nodeId, userId)
    const baseUrl =
      body.base_image_url ??
      (node.payload?.image_url as string | undefined) ??
      (node.parent_image_node_id
        ? await this.resolveParentImageUrl(supabase, node.parent_image_node_id)
        : null)

    if (!baseUrl) throw new BadRequestException('base image is required for variation')

    await this.canvasRepo.updateNode(supabase, nodeId, { status: 'generating' })

    const [variation] = await this.adVariationGenerator.generateVariations(
      supabase,
      userId,
      baseUrl,
      body.base_image_asset_id ?? node.image_asset_id ?? undefined,
      1,
      body.campaign_id ?? null,
      body.prompt,
      orgId,
    )

    return this.canvasRepo.updateNode(supabase, nodeId, {
      status: 'ready',
      image_asset_id: variation.assetId,
      payload: {
        ...node.payload,
        image_url: variation.imageUrl,
        image_asset_id: variation.assetId,
        variation_strategy: variation.strategy,
        crafted_prompt: body.prompt ?? node.payload?.prompt,
      },
    })
  }

  private async requireNode(supabase: SupabaseClient, nodeId: string, userId: string) {
    const node = await this.canvasRepo.getNode(supabase, nodeId)
    if (!node || node.user_id !== userId) throw new NotFoundException('Node not found')
    return node
  }

  private async resolveParentImageUrl(supabase: SupabaseClient, parentNodeId: string) {
    const parent = await this.canvasRepo.getNode(supabase, parentNodeId)
    const url = parent?.payload?.image_url
    return typeof url === 'string' ? url : null
  }
}
