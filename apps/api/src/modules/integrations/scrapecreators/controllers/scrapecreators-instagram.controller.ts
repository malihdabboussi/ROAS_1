import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../../billing/guards/credits.guard'
import {
  ScrapeCreatorsActionService,
  type ScrapeCreatorsRawQuery,
} from '../services/scrapecreators-action.service'

@Controller('integrations/scrapecreators')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class ScrapeCreatorsInstagramController {
  constructor(private readonly actions: ScrapeCreatorsActionService) {}

  @Get('instagram/profile')
  @UseGuards(CreditsGuard)
  async instagramProfile(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_profile', '/v1/instagram/profile', q, ['handle'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('instagram/media/transcript')
  @UseGuards(CreditsGuard)
  async instagramTranscript(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_media_transcript', '/v2/instagram/media/transcript', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('instagram/profile/basic')
  @UseGuards(CreditsGuard)
  async instagramProfileBasic(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_profile_basic', '/v1/instagram/profile/basic', q, ['handle'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('instagram/posts')
  @UseGuards(CreditsGuard)
  async instagramPosts(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_posts', '/v2/instagram/user/posts', q, ['handle', 'next_max_id'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('instagram/post/info')
  @UseGuards(CreditsGuard)
  async instagramPostInfo(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    const query = this.actions.pickQuery(q, ['url', 'download_media'])
    if (!query.url) this.actions.badRequest('url is required')
    const actionSlug =
      query.download_media === 'true' ? 'instagram_post_info_download' : 'instagram_post_info'
    return this.actions.run(user.id, actionSlug, '/v1/instagram/post', query, scope.orgId ?? undefined)
  }

  @Get('instagram/reels/search')
  @UseGuards(CreditsGuard)
  async instagramReelsSearch(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_reels_search', '/v2/instagram/reels/search', q, ['query'], scope.orgId ?? undefined, { required: 'query' })
  }

  @Get('instagram/comments')
  @UseGuards(CreditsGuard)
  async instagramComments(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_comments', '/v2/instagram/post/comments', q, ['url', 'cursor'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('instagram/reels')
  @UseGuards(CreditsGuard)
  async instagramReels(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_reels', '/v1/instagram/user/reels', q, ['handle', 'user_id', 'max_id'], scope.orgId ?? undefined, { requiredAny: ['handle', 'user_id'], requiredMessage: 'handle or user_id is required' })
  }

  @Get('instagram/reels/paginated')
  @UseGuards(CreditsGuard)
  async instagramReelsPaginated(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_reels_paginated', '/v1/instagram/reels/paginated', q, ['handle', 'cursor'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('instagram/highlights')
  @UseGuards(CreditsGuard)
  async instagramHighlights(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_highlights', '/v1/instagram/highlights', q, ['handle'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('instagram/highlight/details')
  @UseGuards(CreditsGuard)
  async instagramHighlightDetails(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'instagram_highlight_details', '/v1/instagram/highlight/details', q, ['highlightId'], scope.orgId ?? undefined, { required: 'highlightId' })
  }
}
