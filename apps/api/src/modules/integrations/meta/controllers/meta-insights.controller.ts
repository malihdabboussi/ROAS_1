import { Controller, Get, HttpException, HttpStatus, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { MetaApiService } from '../services/meta-api.service'

@Controller('integrations/meta')
export class MetaInsightsController {
  constructor(private readonly api: MetaApiService) {}

  @Get('insights')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async insights(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('campaignId') campaignId?: string,
    @Query('level') level?: 'campaign' | 'adset' | 'ad',
    @Query('adCampaignId') adCampaignId?: string,
    @Query('adSetId') adSetId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    if (!campaignId) {
      throw new HttpException(
        { success: false, error: 'campaignId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const safeLevel = level ?? 'campaign'
    if (safeLevel !== 'campaign' && safeLevel !== 'adset' && safeLevel !== 'ad') {
      throw new HttpException(
        { success: false, error: 'level must be campaign, adset, or ad' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const data = await this.api.getInsights(supabase, user.id, {
      campaignId,
      level: safeLevel,
      adCampaignId,
      adSetId,
      startDate,
      endDate,
    })
    return { success: true, ...data }
  }
}
