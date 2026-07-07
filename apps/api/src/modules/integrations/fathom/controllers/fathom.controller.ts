import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { StartFathomConnectSchema } from '../dto/fathom.dto'
import { FathomOAuthService, type FathomAutoIngestSettings } from '../services/fathom-oauth.service'

@Controller('integrations/fathom')
export class FathomController {
  constructor(private readonly oauth: FathomOAuthService) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const result = await this.oauth.getStatus(supabase, user.id)
    return { success: true, ...result }
  }

  @Post('settings/auto-ingest')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateAutoIngest(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      autoIngest?: boolean
      billingScope?: FathomAutoIngestSettings['billingScope']
      billingOrgId?: string | null
    },
  ) {
    const autoIngest =
      body.autoIngest === true || body.autoIngest === false ? body.autoIngest : true
    const settings = await this.oauth.updateAutoIngest(supabase, user.id, autoIngest, {
      billingScope: body.billingScope,
      billingOrgId: body.billingOrgId ?? null,
    })
    return { success: true, ...settings }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const validation = StartFathomConnectSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (
      validation.data.connection_scope === 'org_shared' &&
      scope.orgRole !== 'admin' &&
      scope.orgRole !== 'owner'
    ) {
      throw new HttpException(
        { success: false, error: 'Only org admin/owner can share a connection with the org.' },
        HttpStatus.FORBIDDEN,
      )
    }
    const authorizeUrl = this.oauth.getAuthorizationUrl(user.id, validation.data.redirectTo, {
      scopeMode: validation.data.connection_scope,
      orgId: scope.orgId ?? null,
    })
    return { success: true, authorizeUrl }
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) return res.status(HttpStatus.BAD_REQUEST).send('Missing code or state')
    try {
      const redirectTo = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectTo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fathom OAuth failed'
      return res.status(HttpStatus.BAD_REQUEST).send(msg)
    }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    await this.oauth.disconnect(supabase, user.id)
    return { success: true }
  }
}
