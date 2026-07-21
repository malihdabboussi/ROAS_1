import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { WebinarFulfillmentTeamService } from '../../missions/services/webinar-fulfillment-team.service'

@Controller('agents')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgencyTeamController {
  constructor(private readonly agencyTeamService: WebinarFulfillmentTeamService) {}

  @Post('ensure-agency-team')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRole('creator')
  async ensureAgencyTeam(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { campaign_id?: string | null },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agencyTeamService.ensureTeam(supabase, user.id, {
      orgId: scope.orgId,
      campaignId: body.campaign_id ?? null,
    })
  }
}
