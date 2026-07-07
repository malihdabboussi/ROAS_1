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
import { CreateRepoSchema, ListRepoContentsSchema } from '../dto/github.dto'
import { GitHubApiService } from '../services/github-api.service'

@Controller('integrations/github')
export class GitHubReposController {
  constructor(private readonly api: GitHubApiService) {}

  @Get('repos')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listRepos(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const repos = await this.api.listRepos(supabase, user.id)
    return { success: true, repos }
  }

  @Post('repos')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createRepo(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateRepoSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const result = await this.api.createRepo(
      supabase,
      user.id,
      validation.data.name,
      validation.data.description,
      validation.data.private,
      validation.data.auto_init,
    )
    return result
  }

  @Get('repos/:owner/:repo/contents')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getContents(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query() query: unknown,
  ) {
    const validation = ListRepoContentsSchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const contents = await this.api.getRepoContents(
      supabase,
      user.id,
      owner,
      repo,
      validation.data.path,
      validation.data.ref,
    )
    return { success: true, contents }
  }
}
