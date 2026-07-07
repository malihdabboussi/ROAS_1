import { Controller, Get, HttpException, HttpStatus, Query, UseGuards } from '@nestjs/common'
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
import { StripeCampaignOverviewQuerySchema } from '../dto/stripe.dto'
import { StripeApiService } from '../services/stripe-api.service'

@Controller('integrations/stripe')
export class StripeAnalyticsController {
  constructor(private readonly api: StripeApiService) {}

  @Get('analytics/overview')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async overview(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.api.getOverview(supabase, user.id, {
      fromUnix: from ? Number(from) : undefined,
      toUnix: to ? Number(to) : undefined,
    })
  }

  @Get('analytics/campaign-overview')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async campaignOverview(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = StripeCampaignOverviewQuerySchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    return this.api.getCampaignOverview(supabase, user.id, {
      campaignId: validation.data.campaign_id,
      fromUnix: validation.data.from,
      toUnix: validation.data.to,
      orgId: scope.orgId,
    })
  }
}
