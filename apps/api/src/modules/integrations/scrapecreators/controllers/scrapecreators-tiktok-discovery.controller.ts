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
export class ScrapeCreatorsTiktokDiscoveryController {
  constructor(private readonly actions: ScrapeCreatorsActionService) {}

  @Get('tiktok/search/users')
  @UseGuards(CreditsGuard)
  async tiktokSearchUsers(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_search_users', '/v1/tiktok/search/users', q, ['query'], scope.orgId ?? undefined, { required: 'query' })
  }

  @Get('tiktok/search/hashtag')
  @UseGuards(CreditsGuard)
  async tiktokSearchHashtag(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_search_hashtag', '/v1/tiktok/search/hashtag', q, ['hashtag'], scope.orgId ?? undefined, { required: 'hashtag' })
  }

  @Get('tiktok/search/keyword')
  @UseGuards(CreditsGuard)
  async tiktokSearchKeyword(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    const query = this.actions.pickQuery(q, ['keyword', 'query', 'cursor'])
    const keyword = query.query ?? query.keyword
    if (!keyword) this.actions.badRequest('keyword is required')
    const upstreamQuery: Record<string, string> = { query: keyword }
    if (query.cursor) upstreamQuery.cursor = query.cursor
    return this.actions.run(
      user.id,
      'tiktok_search_keyword',
      '/v1/tiktok/search/keyword',
      upstreamQuery,
      scope.orgId ?? undefined,
    )
  }

  @Get('tiktok/search/top')
  @UseGuards(CreditsGuard)
  async tiktokSearchTop(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    void q
    return this.actions.run(user.id, 'tiktok_search_top', '/v1/tiktok/search/top', {}, scope.orgId ?? undefined)
  }

  @Get('tiktok/songs/details')
  @UseGuards(CreditsGuard)
  async tiktokSongDetails(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_song_details', '/v1/tiktok/songs/details', q, ['songId'], scope.orgId ?? undefined, { required: 'songId' })
  }

  @Get('tiktok/songs/videos')
  @UseGuards(CreditsGuard)
  async tiktokSongVideos(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_song_videos', '/v1/tiktok/songs/videos', q, ['songId'], scope.orgId ?? undefined, { required: 'songId' })
  }

  @Get('tiktok/feed/trending')
  @UseGuards(CreditsGuard)
  async tiktokFeedTrending(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    void q
    return this.actions.run(user.id, 'tiktok_feed_trending', '/v1/tiktok/feed/trending', {}, scope.orgId ?? undefined)
  }
}
