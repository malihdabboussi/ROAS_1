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
export class ScrapeCreatorsController {
  constructor(private readonly actions: ScrapeCreatorsActionService) {}

  @Get('tiktok/profile')
  @UseGuards(CreditsGuard)
  async tiktokProfile(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_profile', '/v1/tiktok/profile', q, ['handle'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('tiktok/video/transcript')
  @UseGuards(CreditsGuard)
  async tiktokTranscript(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_video_transcript', '/v1/tiktok/video/transcript', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('tiktok/user/audience')
  @UseGuards(CreditsGuard)
  async tiktokAudience(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_user_audience', '/v1/tiktok/user/audience', q, ['username'], scope.orgId ?? undefined, { required: 'username' })
  }

  @Get('tiktok/profile/videos')
  @UseGuards(CreditsGuard)
  async tiktokProfileVideos(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_profile_videos', '/v3/tiktok/profile/videos', q, ['handle', 'max_cursor', 'region', 'trim'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('tiktok/video/info')
  @UseGuards(CreditsGuard)
  async tiktokVideoInfo(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_video_info', '/v2/tiktok/video', q, ['url', 'region', 'trim', 'download'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('tiktok/live')
  @UseGuards(CreditsGuard)
  async tiktokLive(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_live', '/v1/tiktok/live', q, ['username'], scope.orgId ?? undefined, { required: 'username' })
  }

  @Get('tiktok/comments')
  @UseGuards(CreditsGuard)
  async tiktokComments(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    const query = this.actions.pickQuery(q, ['videoId', 'url', 'cursor'])
    if (!query.videoId && !query.url) this.actions.badRequest('videoId or url is required')
    const upstreamQuery: Record<string, string> = {
      url: query.url ?? `https://www.tiktok.com/@_/video/${query.videoId}`,
    }
    if (query.cursor) upstreamQuery.cursor = query.cursor
    return this.actions.run(
      user.id,
      'tiktok_comments',
      '/v1/tiktok/video/comments',
      upstreamQuery,
      scope.orgId ?? undefined,
    )
  }

  @Get('tiktok/comment/replies')
  @UseGuards(CreditsGuard)
  async tiktokCommentReplies(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_comment_replies', '/v1/tiktok/comment/replies', q, ['commentId', 'limit', 'cursor'], scope.orgId ?? undefined, { required: 'commentId' })
  }

  @Get('tiktok/following')
  @UseGuards(CreditsGuard)
  async tiktokFollowing(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_following', '/v1/tiktok/following', q, ['username'], scope.orgId ?? undefined, { required: 'username' })
  }

  @Get('tiktok/followers')
  @UseGuards(CreditsGuard)
  async tiktokFollowers(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'tiktok_followers', '/v1/tiktok/followers', q, ['username'], scope.orgId ?? undefined, { required: 'username' })
  }
}
