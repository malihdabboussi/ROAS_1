import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
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
import { SocialResearchOrchestrationService } from '../services/social-research-orchestration.service'
import { SocialResearchTopicSearchService } from '../services/social-research-topic-search.service'
import { SocialResearchVideoBreakdownService } from '../services/social-research-video-breakdown.service'
import type {
  TopicSearchCreatorRef,
  TopicSearchResultItem,
} from '../types/social-research.types'
import { parseSocialResearchPlatform } from './social-research-route-params'

@Controller('spaces/:id/social-research')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SocialResearchController {
  constructor(
    private readonly socialResearch: SocialResearchOrchestrationService,
    private readonly topicSearch: SocialResearchTopicSearchService,
    private readonly videoBreakdown: SocialResearchVideoBreakdownService,
  ) {}

  @Post(':platform/topic-search')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async topicSearchPosts(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string },
    @Body() body: { query: string; cursor?: string | null },
  ) {
    SpaceIdParamSchema.parse({ id: params.id })
    const platform = parseSocialResearchPlatform(params.platform)
    const page = await this.topicSearch.searchTopic({
      userId: user.id,
      orgId: scope.orgId ?? null,
      platform,
      query: body.query,
      cursor: body.cursor ?? null,
    })
    return { success: true, items: page.items, next_cursor: page.next_cursor }
  }

  @Post(':platform/topic-search/score')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async topicSearchScore(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string },
    @Body() body: { creators: TopicSearchCreatorRef[] },
  ) {
    SpaceIdParamSchema.parse({ id: params.id })
    const platform = parseSocialResearchPlatform(params.platform)
    if (!Array.isArray(body.creators) || body.creators.length === 0) {
      throw new BadRequestException('creators is required')
    }
    const scores = await this.topicSearch.scoreCreators({
      userId: user.id,
      orgId: scope.orgId ?? null,
      creators: body.creators.map((c) => ({ ...c, platform })),
    })
    return { success: true, scores }
  }

  @Post(':platform/topic-search/save')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async topicSearchSave(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string },
    @Body() body: { query: string; items: TopicSearchResultItem[] },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseSocialResearchPlatform(params.platform)
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('items is required')
    }
    const result = await this.topicSearch.saveTopicResults({
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

  @Post(':platform/items/:itemId/comments')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async loadItemComments(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string; itemId: string },
    @Body() body: { force?: boolean; cursor?: string | null },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseSocialResearchPlatform(params.platform)
    const result = await this.socialResearch.loadItemComments({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      itemId: params.itemId,
      force: Boolean(body?.force),
      cursor: typeof body?.cursor === 'string' && body.cursor ? body.cursor : null,
    })
    return { success: true, comments: result.comments, next_cursor: result.next_cursor }
  }

  @Post(':platform/items/:itemId/breakdown')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async breakdownItem(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string; itemId: string },
    @Body() body: { force?: boolean },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseSocialResearchPlatform(params.platform)
    const breakdown = await this.videoBreakdown.breakdownItem({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      itemId: params.itemId,
      force: Boolean(body?.force),
    })
    return { success: true, breakdown }
  }

  @Post(':platform/items/:itemId/analyze')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async analyzeItem(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string; itemId: string },
    @Body() body: { shortcode_or_id: string; handle?: string; is_slideshow?: boolean },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseSocialResearchPlatform(params.platform)
    const result = await this.socialResearch.analyzeSocialPost({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      itemId: params.itemId,
      shortcodeOrId: body.shortcode_or_id,
      handle: body.handle,
      isSlideshow: body.is_slideshow,
    })
    return {
      success: true,
      post_info: result.postInfo,
      transcript: result.transcript,
      hook: result.hook,
    }
  }
}
