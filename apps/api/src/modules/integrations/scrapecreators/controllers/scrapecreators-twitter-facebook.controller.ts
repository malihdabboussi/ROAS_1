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
export class ScrapeCreatorsTwitterFacebookController {
  constructor(private readonly actions: ScrapeCreatorsActionService) {}

  @Get('twitter/profile')
  @UseGuards(CreditsGuard)
  async twitterProfile(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'twitter_profile', '/v1/twitter/profile', q, ['handle'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('twitter/tweet/transcript')
  @UseGuards(CreditsGuard)
  async twitterTranscript(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'twitter_tweet_transcript', '/v1/twitter/tweet/transcript', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('twitter/user/tweets')
  @UseGuards(CreditsGuard)
  async twitterUserTweets(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'twitter_user_tweets', '/v1/twitter/user/tweets', q, ['handle'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('twitter/tweet/details')
  @UseGuards(CreditsGuard)
  async twitterTweetDetails(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'twitter_tweet_details', '/v1/twitter/tweet/details', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('twitter/community/tweets')
  @UseGuards(CreditsGuard)
  async twitterCommunityTweets(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'twitter_community_tweets', '/v1/twitter/community/tweets', q, ['communityId', 'limit', 'cursor'], scope.orgId ?? undefined, { required: 'communityId' })
  }

  @Get('facebook/profile')
  @UseGuards(CreditsGuard)
  async facebookProfile(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'facebook_profile', '/v1/facebook/profile', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('facebook/post/transcript')
  @UseGuards(CreditsGuard)
  async facebookTranscript(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'facebook_post_transcript', '/v1/facebook/post/transcript', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('facebook/profile/posts')
  @UseGuards(CreditsGuard)
  async facebookProfilePosts(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'facebook_profile_posts', '/v1/facebook/profile/posts', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('facebook/group/posts')
  @UseGuards(CreditsGuard)
  async facebookGroupPosts(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'facebook_group_posts', '/v1/facebook/group/posts', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('facebook/post')
  @UseGuards(CreditsGuard)
  async facebookPost(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'facebook_post', '/v1/facebook/post', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('facebook/video/transcript')
  @UseGuards(CreditsGuard)
  async facebookVideoTranscript(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'facebook_video_transcript', '/v1/facebook/video/transcript', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('facebook/comments')
  @UseGuards(CreditsGuard)
  async facebookComments(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'facebook_comments', '/v1/facebook/comments', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }
}
