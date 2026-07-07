import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { StartGitHubInstallSchema } from '../dto/github.dto'
import { GitHubOAuthService } from '../services/github-oauth.service'

@Controller('integrations/github')
export class GitHubController {
  constructor(private readonly oauth: GitHubOAuthService) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.oauth.getStatus(supabase, user.id, scope.orgId)
    return { success: true, ...result }
  }

  @Post('install')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async install(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const validation = StartGitHubInstallSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const connectionScope = validation.data.connection_scope ?? 'personal'
    if (
      scope.orgId &&
      connectionScope === 'org_shared' &&
      scope.orgRole !== 'owner' &&
      scope.orgRole !== 'admin'
    ) {
      throw new HttpException(
        { success: false, error: 'Only org admin/owner can create All Org connections.' },
        HttpStatus.FORBIDDEN,
      )
    }
    const installUrl = this.oauth.getInstallUrl(
      user.id,
      validation.data.redirectTo,
      scope.orgId,
      connectionScope,
    )
    return { success: true, installUrl }
  }

  @Get('callback')
  async callback(
    @Query('installation_id') installationId: string,
    @Query('setup_action') setupAction: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!installationId || !state) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing installation_id or state')
    }

    try {
      const redirectTo = await this.oauth.handleCallback(
        Number(installationId),
        setupAction || 'install',
        state,
      )
      return res.redirect(redirectTo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'GitHub App installation failed'
      return res.status(HttpStatus.BAD_REQUEST).send(msg)
    }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    await this.oauth.disconnect(supabase, user.id, scope.orgId)
    return { success: true }
  }
}
