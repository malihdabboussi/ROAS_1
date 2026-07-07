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
  type RequestScope,
} from '@vibey/api-shared'
import { StartStripeConnectSchema } from '../dto/stripe.dto'
import { StripeOAuthService } from '../services/stripe-oauth.service'

@Controller('integrations/stripe')
export class StripeConnectionController {
  constructor(private readonly oauth: StripeOAuthService) {}

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
    @Body() body: unknown,
  ) {
    const validation = StartStripeConnectSchema.safeParse(body)
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
    const authorizeUrl = this.oauth.getAuthorizationUrl(
      user.id,
      validation.data.redirectTo,
      scope.orgId,
      connectionScope,
    )
    return { success: true, authorizeUrl }
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) return res.status(HttpStatus.BAD_REQUEST).send('Missing code or state')
    try {
      const redirectTo = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectTo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Stripe OAuth failed'
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
