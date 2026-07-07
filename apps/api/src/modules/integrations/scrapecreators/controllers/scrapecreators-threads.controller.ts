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
export class ScrapeCreatorsThreadsController {
  constructor(private readonly actions: ScrapeCreatorsActionService) {}

  @Get('threads/profile')
  @UseGuards(CreditsGuard)
  async threadsProfile(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'threads_profile', '/v1/threads/profile', q, ['handle'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('threads/posts')
  @UseGuards(CreditsGuard)
  async threadsPosts(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'threads_posts', '/v1/threads/posts', q, ['handle'], scope.orgId ?? undefined, { required: 'handle' })
  }

  @Get('threads/post')
  @UseGuards(CreditsGuard)
  async threadsPost(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'threads_post', '/v1/threads/post', q, ['url'], scope.orgId ?? undefined, { required: 'url' })
  }

  @Get('threads/search/keyword')
  @UseGuards(CreditsGuard)
  async threadsSearchKeyword(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'threads_search_keyword', '/v1/threads/search/keyword', q, ['keyword'], scope.orgId ?? undefined, { required: 'keyword' })
  }

  @Get('threads/search/users')
  @UseGuards(CreditsGuard)
  async threadsSearchUsers(
    @CurrentUser() user: { id: string },
    @Query() q: ScrapeCreatorsRawQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.actions.runPicked(user.id, 'threads_search_users', '/v1/threads/search/users', q, ['query'], scope.orgId ?? undefined, { required: 'query' })
  }
}
