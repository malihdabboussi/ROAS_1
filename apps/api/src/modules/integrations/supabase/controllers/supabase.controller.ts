import {
  Body,
  Controller,
  Get,
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
import { SupabaseOAuthService } from '../services/supabase-oauth.service'

@Controller('integrations/supabase')
export class SupabaseController {
  constructor(private readonly oauth: SupabaseOAuthService) {}

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

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: { redirectTo?: string },
  ) {
    const redirectTo = body.redirectTo || ''
    const authorizeUrl = this.oauth.getAuthorizationUrl(user.id, scope.orgId, redirectTo)
    return { success: true, authorizeUrl }
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing code or state')
    }

    try {
      const redirectTo = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectTo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Supabase OAuth connection failed'
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
