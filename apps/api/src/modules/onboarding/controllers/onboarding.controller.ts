import { Controller, Get, Post, UseGuards } from '@nestjs/common'
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
import { OnboardingStatusService } from '../services/onboarding-status.service'

@Controller('onboarding')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class OnboardingController {
  constructor(private readonly onboardingStatus: OnboardingStatusService) {}

  @Get('status')
  async getStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.onboardingStatus.getStatus(supabase, user.id, scope)
  }

  @Post('retry')
  async retry(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.onboardingStatus.retry(supabase, user.id, scope)
  }
}
