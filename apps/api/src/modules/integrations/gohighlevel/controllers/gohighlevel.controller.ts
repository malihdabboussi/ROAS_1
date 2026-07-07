import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { StartGhlOAuthSchema, UpsertGhlLeadContactSchema } from '../dto/gohighlevel.dto'
import { GoHighLevelOAuthService } from '../services/gohighlevel-oauth.service'

@Controller('integrations/lhg')
export class GoHighLevelController {
  constructor(private readonly oauth: GoHighLevelOAuthService) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const result = await this.oauth.getStatus(supabase, user.id)
    return { success: true, ...result }
  }

  /**
   * Contacts in the connected GHL location (for CRM / studio import UI).
   */
  @Get('contacts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listContacts(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const st = await this.oauth.getStatus(supabase, user.id)
    if (!st.connected) {
      throw new NotFoundException('GoHighLevel is not connected')
    }
    const { contacts } = await this.oauth.listLocationContactsForImport(supabase, user.id)
    return { success: true, contacts }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = StartGhlOAuthSchema.safeParse(body)
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
    if (!code || !state) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing code or state')
    }

    try {
      const redirectTo = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectTo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'GoHighLevel OAuth failed'
      return res.status(HttpStatus.BAD_REQUEST).send(msg)
    }
  }

  @Post('refresh')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async refresh(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    await this.oauth.refreshAccessToken(supabase, user.id)
    return { success: true }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    await this.oauth.disconnect(supabase, user.id)
    return { success: true }
  }

  @Post('upsert-lead-contact')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async upsertLeadContact(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = UpsertGhlLeadContactSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const result = await this.oauth.upsertLeadContactInGhl(supabase, user.id, validation.data)
    return { success: true, ...result }
  }
}
