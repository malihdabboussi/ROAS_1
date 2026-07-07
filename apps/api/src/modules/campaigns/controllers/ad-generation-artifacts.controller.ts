import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { CreditsService } from '../../billing/services/credits.service'
import {
  GenerateVariationsInput,
  GenerateVariationsSchema,
  RegenerateVariationInput,
  RegenerateVariationSchema,
} from '../dto/ad-bulk-creator.dto'
import {
  AdVariationGeneratorService,
  REGENERATION_PRESETS,
} from '../services/ad-variation-generator.service'
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AdGenerationArtifactsController {
  constructor(
    private readonly artifactsService: ArtifactsService,
    private readonly adVariationGenerator: AdVariationGeneratorService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('ad-sets/:adSetId/ads/bulk')
  @HttpCode(HttpStatus.CREATED)
  async createAdsBulk(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('adSetId') adSetId: string,
    @Body()
    body: {
      creatives: Array<{ imageUrl?: string; imageAssetId?: string }>
      template?: {
        headline?: string
        primaryText?: string
        destinationUrl?: string
        ctaType?: string
      }
    },
    @OrgContext() scope: RequestScope,
  ) {
    if (!body?.creatives || !Array.isArray(body.creatives) || body.creatives.length === 0) {
      throw new BadRequestException('creatives array is required and must not be empty')
    }
    return this.artifactsService.createAdsBulk(
      supabase,
      user.id,
      adSetId,
      body.creatives,
      body.template,
      scope.orgId,
    )
  }

  @Post('ad-sets/:adSetId/ads/generate-variations')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async generateAdVariations(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('adSetId') adSetId: string,
    @Body(new ZodValidationPipe(GenerateVariationsSchema)) body: GenerateVariationsInput,
    @OrgContext() scope: RequestScope,
  ) {
    const count = body.variationCount
    const adSet = await this.artifactsService.getAdSet(supabase, adSetId)
    const adCampaign = await this.artifactsService.getAdCampaign(
      supabase,
      (adSet as Record<string, unknown>).ad_campaign_id as string,
    )
    const campaignId = ((adCampaign as Record<string, unknown>).campaign_id as string) ?? null

    const variations = await this.adVariationGenerator.generateVariations(
      supabase,
      user.id,
      body.baseImageUrl,
      body.baseImageAssetId,
      count,
      campaignId,
      undefined,
      scope.orgId,
    )

    for (const _v of variations) {
      await this.creditsService.processImageUsage({
        userId: user.id,
        campaignId: campaignId ?? undefined,
        orgId: scope.orgId ?? undefined,
        modelName: 'gemini-3.1-flash-image-preview',
      })
    }

    return { variations }
  }

  @Post('ad-sets/:adSetId/ads/regenerate-variation')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async regenerateVariation(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('adSetId') adSetId: string,
    @Body(new ZodValidationPipe(RegenerateVariationSchema)) body: RegenerateVariationInput,
    @OrgContext() scope: RequestScope,
  ) {
    let prompt = body.prompt ?? ''
    if (body.presetName) {
      const preset = REGENERATION_PRESETS.find((p) => p.name === body.presetName)
      if (preset) prompt = preset.prompt
    }
    if (!prompt) {
      throw new BadRequestException('Either prompt or presetName is required')
    }

    const adSet = await this.artifactsService.getAdSet(supabase, adSetId)
    const adCampaign = await this.artifactsService.getAdCampaign(
      supabase,
      (adSet as Record<string, unknown>).ad_campaign_id as string,
    )
    const campaignId = ((adCampaign as Record<string, unknown>).campaign_id as string) ?? null

    const variation = await this.adVariationGenerator.regenerateVariation(
      supabase,
      user.id,
      body.baseImageUrl,
      prompt,
      campaignId,
      scope.orgId,
    )

    await this.creditsService.processImageUsage({
      userId: user.id,
      campaignId: campaignId ?? undefined,
      orgId: scope.orgId ?? undefined,
      modelName: 'gemini-3.1-flash-image-preview',
    })

    return { variation }
  }
}
