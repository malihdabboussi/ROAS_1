import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { CreatePullRequestSchema } from '../dto/github.dto'
import { GitHubApiService } from '../services/github-api.service'

@Controller('integrations/github')
export class GitHubPullRequestsController {
  constructor(private readonly api: GitHubApiService) {}

  @Post('repos/:owner/:repo/pr')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createPR(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() body: unknown,
  ) {
    const validation = CreatePullRequestSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const result = await this.api.createPullRequest(
      supabase,
      user.id,
      owner,
      repo,
      validation.data.title,
      validation.data.body,
      validation.data.head,
      validation.data.base,
    )
    return result
  }

  @Get('repos/:owner/:repo/prs')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listPRs(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('state') state?: string,
  ) {
    const prState = (state === 'closed' || state === 'all' ? state : 'open') as
      | 'open'
      | 'closed'
      | 'all'
    const prs = await this.api.listPullRequests(supabase, user.id, owner, repo, prState)
    return { success: true, prs }
  }
}
