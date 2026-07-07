import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
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
import { SocialResearchTopicSearchService } from '../services/social-research-topic-search.service'
import type { SavedTopicSearchFilters, TopicSearchResultItem } from '../types/social-research.types'
import { parseSocialResearchPlatform } from './social-research-route-params'

@Controller('spaces/:id/social-research')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SocialResearchTopicSearchesController {
  constructor(private readonly topicSearch: SocialResearchTopicSearchService) {}

  @Get('topic-searches')
  async listSavedTopicSearches(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam,
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const searches = await this.topicSearch.listSavedSearches({ supabase, spaceId })
    return { success: true, searches }
  }

  @Get('topic-searches/:searchId')
  async getSavedTopicSearch(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam & { searchId: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const search = await this.topicSearch.getSavedSearch({
      supabase,
      spaceId,
      searchId: params.searchId,
    })
    return { success: true, search }
  }

  @Post('topic-searches')
  @HttpCode(HttpStatus.OK)
  async createSavedTopicSearch(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam,
    @Body()
    body: {
      platform: string
      title?: string
      query: string
      filters?: SavedTopicSearchFilters
      items: TopicSearchResultItem[]
      next_cursor?: string | null
    },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseSocialResearchPlatform(String(body.platform ?? ''))
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('items is required')
    }
    const search = await this.topicSearch.createSavedSearch({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      title: String(body.title ?? ''),
      query: String(body.query ?? ''),
      filters: body.filters ?? {},
      items: body.items,
      nextCursor: body.next_cursor ?? null,
    })
    return { success: true, search }
  }

  @Post('topic-searches/:searchId/refresh')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async refreshSavedTopicSearch(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { searchId: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const search = await this.topicSearch.refreshSavedSearch({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      searchId: params.searchId,
    })
    return { success: true, search }
  }

  @Post('topic-searches/:searchId/load-more')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async loadMoreSavedTopicSearch(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { searchId: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const search = await this.topicSearch.loadMoreSavedSearch({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      searchId: params.searchId,
    })
    return { success: true, search }
  }

  @Patch('topic-searches/:searchId')
  async updateSavedTopicSearch(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { searchId: string },
    @Body()
    body: {
      title?: string
      filters?: SavedTopicSearchFilters
      results?: TopicSearchResultItem[]
      next_cursor?: string | null
    },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    await this.topicSearch.updateSavedSearch({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      searchId: params.searchId,
      title: body.title,
      filters: body.filters,
      results: Array.isArray(body.results) ? body.results : undefined,
      nextCursor: body.next_cursor,
    })
    return { success: true }
  }

  @Delete('topic-searches/:searchId')
  @HttpCode(HttpStatus.OK)
  async deleteSavedTopicSearch(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam & { searchId: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    await this.topicSearch.deleteSavedSearch({ supabase, spaceId, searchId: params.searchId })
    return { success: true }
  }
}
