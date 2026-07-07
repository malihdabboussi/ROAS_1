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
export class ScrapeCreatorsYoutubeController {
  constructor(private readonly actions: ScrapeCreatorsActionService) {}

  @Get('youtube/video/transcript')
  @UseGuards(CreditsGuard)
  async youtubeTranscript(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_video_transcript', '/v1/youtube/video/transcript', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('youtube/channel')
  @UseGuards(CreditsGuard)
  async youtubeChannel(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_channel', '/v1/youtube/channel', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('youtube/channel/videos')
  @UseGuards(CreditsGuard)
  async youtubeChannelVideos(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_channel_videos', '/v1/youtube/channel-videos', q, ['url', 'limit'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('youtube/channel/shorts')
  @UseGuards(CreditsGuard)
  async youtubeChannelShorts(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_channel_shorts', '/v1/youtube/channel/shorts', q, ['url', 'cursor'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('youtube/video/details')
  @UseGuards(CreditsGuard)
  async youtubeVideoDetails(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_video_details', '/v1/youtube/video', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('youtube/search')
  @UseGuards(CreditsGuard)
  async youtubeSearch(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_search', '/v1/youtube/search', q, ['query', 'limit'], scope.orgId ?? undefined, { required: 'query' })
  }

  @Get('youtube/search/hashtag')
  @UseGuards(CreditsGuard)
  async youtubeSearchHashtag(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_search_hashtag', '/v1/youtube/search/hashtag', q, ['hashtag', 'limit'], scope.orgId ?? undefined, { required: 'hashtag' })
  }

  @Get('youtube/video/comments')
  @UseGuards(CreditsGuard)
  async youtubeVideoComments(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_video_comments', '/v1/youtube/video/comments', q, ['url', 'limit'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('youtube/shorts/trending')
  @UseGuards(CreditsGuard)
  async youtubeShortsTrending(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    void q
    return this.actions.run(user.id, 'youtube_shorts_trending', '/v1/youtube/shorts/trending', {}, scope.orgId ?? undefined)
  }

  @Get('youtube/playlist')
  @UseGuards(CreditsGuard)
  async youtubePlaylist(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'youtube_playlist', '/v1/youtube/playlist', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }
}
