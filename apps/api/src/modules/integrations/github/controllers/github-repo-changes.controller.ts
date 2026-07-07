import { Body, Controller, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { CommitFilesSchema, CreateBranchSchema } from '../dto/github.dto'
import { GitHubApiService } from '../services/github-api.service'

@Controller('integrations/github')
export class GitHubRepoChangesController {
  constructor(private readonly api: GitHubApiService) {}

  @Post('repos/:owner/:repo/branch')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createBranch(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() body: unknown,
  ) {
    const validation = CreateBranchSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const result = await this.api.createBranch(
      supabase,
      user.id,
      owner,
      repo,
      validation.data.branch,
      validation.data.from_branch,
    )
    return result
  }

  @Post('repos/:owner/:repo/commit')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async commitFiles(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() body: unknown,
  ) {
    const validation = CommitFilesSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const result = await this.api.commitFiles(
      supabase,
      user.id,
      owner,
      repo,
      validation.data.branch,
      validation.data.message,
      validation.data.files,
    )
    return result
  }
}
