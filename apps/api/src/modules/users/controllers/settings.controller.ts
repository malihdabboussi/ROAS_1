import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { SettingsService } from '../services/settings.service'

@Controller('settings')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('email')
  async getEmailSettings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.settingsService.getEmailSettings(user, supabase, scope)
  }

  @Put('email')
  async putEmailSettings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body()
    body: {
      sending_days?: string[]
      sending_time_from?: string
      sending_time_until?: string
      sending_timezone?: string
      hide_branding?: boolean
      pause_on_reply?: boolean
      stop_keywords_enabled?: boolean
      stop_keywords?: string[]
      email_provider?: 'sendgrid' | 'ghl'
    },
  ) {
    return this.settingsService.putEmailSettings(user, supabase, scope, body)
  }
}
