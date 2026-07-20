import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { SpaceIdParamSchema, type SpaceIdParam } from '../dto'
import { AdsResearchSearchService } from '../services/ads-research-search.service'
import type {
  AdAdvertiserRef,
  AdSearchResultItem,
  SavedAdSearchFilters,
} from '../types/ads-research.types'
import { parseAdsResearchKind, parseAdsResearchPlatform } from './ads-research-route-params'

type AdsResearchUpdateBody = {
  title?: string
  filters?: SavedAdSearchFilters
  results?: AdSearchResultItem[]
}

@Controller('spaces/:id/ads-research')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AdsResearchSavedSearchesController {
  constructor(private readonly adsResearch: AdsResearchSearchService) {}

  @Get('searches')
  async listSavedSearches(@Supabase() supabase: SupabaseClient, @Param() params: SpaceIdParam) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const searches = await this.adsResearch.listSavedSearches({ supabase, spaceId })
    return { success: true, searches }
  }

  @Get('searches/:searchId')
  async getSavedSearch(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam & { searchId: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const search = await this.adsResearch.getSavedSearch({
      supabase,
      spaceId,
      searchId: params.searchId,
    })
    return { success: true, search }
  }

  @Post('searches')
  @HttpCode(HttpStatus.OK)
  async createSavedSearch(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam,
    @Body()
    body: {
      platform: string
      kind: string
      title?: string
      query: string
      advertiser?: AdAdvertiserRef | null
      filters?: SavedAdSearchFilters
      items: AdSearchResultItem[]
      next_page_token?: string | null
      mission_id?: string | null
    },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseAdsResearchPlatform(String(body.platform ?? ''))
    const kind = parseAdsResearchKind(String(body.kind ?? ''))
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('items is required')
    }
    const search = await this.adsResearch.createSavedSearch({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      kind,
      title: String(body.title ?? ''),
      query: String(body.query ?? ''),
      advertiser: body.advertiser ?? null,
      filters: body.filters ?? {},
      items: body.items,
      nextPageToken: body.next_page_token ?? null,
      missionId: body.mission_id ?? null,
    })
    return { success: true, search }
  }

  @Post('searches/:searchId/refresh')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async refreshSavedSearch(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam & { searchId: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const search = await this.adsResearch.refreshSavedSearch({
      supabase,
      spaceId,
      searchId: params.searchId,
    })
    return { success: true, search }
  }

  @Patch('searches/:searchId')
  async updateSavedSearch(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam & { searchId: string },
    @Body() body: AdsResearchUpdateBody,
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    await this.adsResearch.updateSavedSearch({
      supabase,
      spaceId,
      searchId: params.searchId,
      title: body.title,
      filters: body.filters,
      results: Array.isArray(body.results) ? body.results : undefined,
    })
    return { success: true }
  }

  @Delete('searches/:searchId')
  @HttpCode(HttpStatus.OK)
  async deleteSavedSearch(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam & { searchId: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    await this.adsResearch.deleteSavedSearch({ supabase, spaceId, searchId: params.searchId })
    return { success: true }
  }
}
