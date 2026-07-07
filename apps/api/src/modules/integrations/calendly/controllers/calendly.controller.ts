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
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { StartCalendlyConnectSchema } from '../dto/calendly.dto'
import { CalendlyOAuthService } from '../services/calendly-oauth.service'

@Controller('integrations/calendly')
export class CalendlyController {
  constructor(private readonly oauth: CalendlyOAuthService) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const result = await this.oauth.getStatus(supabase, user.id)
    return { success: true, ...result }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = StartCalendlyConnectSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const authorizeUrl = this.oauth.getAuthorizationUrl(user.id, validation.data.redirectTo)
    return { success: true, authorizeUrl }
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) return res.status(HttpStatus.BAD_REQUEST).send('Missing code or state')
    try {
      const redirectTo = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectTo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Calendly OAuth failed'
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
