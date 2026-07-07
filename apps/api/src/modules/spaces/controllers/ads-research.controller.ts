import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { SpaceIdParamSchema, type SpaceIdParam } from '../dto'
import { AdsResearchBreakdownService } from '../services/ads-research-breakdown.service'
import { AdsResearchSearchService } from '../services/ads-research-search.service'
import type {
  AdAdvertiserRef,
  AdSearchResultItem,
  SavedAdSearchFilters,
} from '../types/ads-research.types'
import { parseAdsResearchKind, parseAdsResearchPlatform } from './ads-research-route-params'

@Controller('spaces/:id/ads-research')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AdsResearchController {
  constructor(
    private readonly adsResearch: AdsResearchSearchService,
    private readonly adsBreakdown: AdsResearchBreakdownService,
  ) {}

  @Post(':platform/search')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async searchAds(
    @Param() params: SpaceIdParam & { platform: string },
    @Body()
    body: {
      kind: string
      query?: string
      advertiser?: AdAdvertiserRef | null
      next_page_token?: string | null
      filters?: SavedAdSearchFilters | null
    },
  ) {
    SpaceIdParamSchema.parse({ id: params.id })
    const platform = parseAdsResearchPlatform(params.platform)
    const kind = parseAdsResearchKind(String(body.kind ?? ''))
    const page = await this.adsResearch.searchAds({
      platform,
      kind,
      query: String(body.query ?? ''),
      advertiser: body.advertiser ?? null,
      nextPageToken: body.next_page_token ?? null,
      filters: body.filters ?? null,
    })
    return { success: true, items: page.items, next_page_token: page.next_page_token }
  }

  @Post(':platform/ad-breakdown')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async breakdownAd(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string },
    @Body() body: { ad: AdSearchResultItem },
  ) {
    SpaceIdParamSchema.parse({ id: params.id })
    const platform = parseAdsResearchPlatform(params.platform)
    if (!body.ad || typeof body.ad !== 'object' || !body.ad.ad_id) {
      throw new BadRequestException('ad is required')
    }
    const result = await this.adsBreakdown.breakdownAd({
      userId: user.id,
      orgId: scope.orgId ?? null,
      ad: { ...body.ad, platform },
    })
    return { success: true, patch: result.patch }
  }

  @Post(':platform/ad-details')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async getAdDetails(
    @Param() params: SpaceIdParam & { platform: string },
    @Body() body: { ad_id: string; details_token?: string | null; advertiser_id?: string | null },
  ) {
    SpaceIdParamSchema.parse({ id: params.id })
    const platform = parseAdsResearchPlatform(params.platform)
    const details = await this.adsResearch.getAdDetails({
      platform,
      adId: String(body.ad_id ?? ''),
      detailsToken: body.details_token ?? null,
      advertiserId: body.advertiser_id ?? null,
    })
    return { success: true, details }
  }

  @Get(':platform/advertisers')
  @UseGuards(CreditsGuard)
  async searchAdvertisers(
    @Param() params: SpaceIdParam & { platform: string },
    @Query('q') q: string,
  ) {
    SpaceIdParamSchema.parse({ id: params.id })
    const platform = parseAdsResearchPlatform(params.platform)
    const advertisers = await this.adsResearch.searchAdvertisers({
      platform,
      query: String(q ?? ''),
    })
    return { success: true, advertisers }
  }

  @Post(':platform/save')
  @HttpCode(HttpStatus.OK)
  async saveAds(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string },
    @Body() body: { query?: string; items: AdSearchResultItem[] },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseAdsResearchPlatform(params.platform)
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('items is required')
    }
    const result = await this.adsResearch.saveAdsToSpace({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      query: String(body.query ?? ''),
      items: body.items,
    })
    return { success: true, ...result }
  }
}
