import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
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
import { MissionsUserOperationsService } from '../services/missions-user-operations.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsUserController {
  constructor(private readonly missionsUserOperationsService: MissionsUserOperationsService) {}

  @Patch('profile/settings')
  async updateProfileSettings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body()
    body: {
      daily_digest_enabled?: boolean
      daily_digest_time?: string
      preferred_channel?: string
      auto_approve_plans?: boolean
      public_agent_slug?: string
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.updateProfileSettings(user, supabase, body)
  }

  @Get('profile/settings')
  async getProfileSettings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.getProfileSettings(user, supabase)
  }

  @Patch('awareness-toggle')
  async toggleAwareness(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { enabled: boolean },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.toggleAwareness(user, supabase, body)
  }

  @Patch('auto-approve-toggle')
  async toggleAutoApprovePlans(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { enabled: boolean },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.toggleAutoApprovePlans(user, supabase, body)
  }
}
