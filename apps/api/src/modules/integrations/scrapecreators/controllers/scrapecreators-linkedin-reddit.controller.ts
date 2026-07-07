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
export class ScrapeCreatorsLinkedinRedditController {
  constructor(private readonly actions: ScrapeCreatorsActionService) {}

  @Get('linkedin/profile')
  @UseGuards(CreditsGuard)
  async linkedinProfile(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'linkedin_profile', '/v1/linkedin/profile', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('linkedin/company')
  @UseGuards(CreditsGuard)
  async linkedinCompany(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'linkedin_company', '/v1/linkedin/company', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('linkedin/company/posts')
  @UseGuards(CreditsGuard)
  async linkedinCompanyPosts(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'linkedin_company_posts', '/v1/linkedin/company/posts', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('linkedin/post')
  @UseGuards(CreditsGuard)
  async linkedinPost(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'linkedin_post', '/v1/linkedin/post', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('reddit/subreddit/posts')
  @UseGuards(CreditsGuard)
  async redditSubredditPosts(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'reddit_subreddit_posts', '/v1/reddit/subreddit/posts', q, ['subreddit'], scope.orgId ?? undefined, { required: 'subreddit' })
  }

  @Get('reddit/post/comments')
  @UseGuards(CreditsGuard)
  async redditPostComments(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'reddit_post_comments', '/v1/reddit/post/comments', q, ['postId'], scope.orgId ?? undefined, { required: 'postId' })
  }

  @Get('reddit/comments/simple')
  @UseGuards(CreditsGuard)
  async redditCommentsSimple(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'reddit_comments_simple', '/v1/reddit/comments/simple', q, ['postId'], scope.orgId ?? undefined, { required: 'postId' })
  }

  @Get('reddit/search')
  @UseGuards(CreditsGuard)
  async redditSearch(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'reddit_search', '/v1/reddit/search', q, ['query'], scope.orgId ?? undefined, { required: 'query' })
  }

  @Get('reddit/ads/search')
  @UseGuards(CreditsGuard)
  async redditAdsSearch(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'reddit_ads_search', '/v1/reddit/ads/search', q, ['query'], scope.orgId ?? undefined, { required: 'query' })
  }

  @Get('reddit/ad')
  @UseGuards(CreditsGuard)
  async redditAd(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'reddit_ad', '/v1/reddit/ad/get', q, ['adId'], scope.orgId ?? undefined, { required: 'adId' })
  }
}
