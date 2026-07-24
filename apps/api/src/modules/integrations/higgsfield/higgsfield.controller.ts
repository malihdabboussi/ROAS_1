import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  type RequestScope,
} from '@vibey/api-shared'
import { HiggsfieldOAuthService } from './higgsfield-oauth.service'

@Controller('integrations/higgsfield')
export class HiggsfieldController {
  constructor(private readonly oauth: HiggsfieldOAuthService) {}

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  connect(@OrgContext() scope: RequestScope, @Body() body: { redirectTo?: string }) {
    return {
      success: true,
      authorizeUrl: this.oauth.getAuthorizationUrl(scope, body.redirectTo ?? ''),
    }
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    if (!code || !state) return response.status(400).send('Missing code or state')
    try {
      return response.redirect(await this.oauth.handleCallback(code, state))
    } catch {
      return response
        .status(400)
        .send('Higgsfield connection failed. Return to ROAS and try again.')
    }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async disconnect(@OrgContext() scope: RequestScope) {
    await this.oauth.disconnect(scope)
    return { success: true }
  }
}
