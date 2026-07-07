import { Controller, Get, UseGuards } from '@nestjs/common'
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
import { DomainAuthService } from '../services/domain-auth.service'

@Controller('email/domains')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class DomainStatusController {
  constructor(private readonly domainAuthService: DomainAuthService) {}

  @Get('status/verified')
  async checkVerifiedStatus(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const hasVerified = await this.domainAuthService.hasVerifiedDomain(
      supabase,
      user.id,
      scope.orgId,
    )
    return { success: true, hasVerifiedDomain: hasVerified }
  }
}
