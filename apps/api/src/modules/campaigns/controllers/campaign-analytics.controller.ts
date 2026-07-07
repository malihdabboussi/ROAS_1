import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { CampaignsService } from '../services/campaigns.service'
import { MainDashboardService } from '../services/main-dashboard.service'
import {
  SocialInsightsService,
  type SocialAnalyticsPlatform,
} from '../services/social-insights.service'
import { isCampaignUuid, parseOptionalUuidCsv } from './campaign-controller-utils'

@Controller('campaigns')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CampaignAnalyticsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly socialInsights: SocialInsightsService,
    private readonly mainDashboard: MainDashboardService,
  ) {}

  @Get(':id/analytics')
  async analytics(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('funnel_ids') funnelIdsRaw?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    const funnelIds = parseOptionalUuidCsv(funnelIdsRaw)
    return this.campaignsService.getCampaignAnalytics(
      supabase,
      id,
      startDate,
      endDate,
      funnelIds,
      scope.orgId,
    )
  }

  @Get(':id/email-analytics')
  async emailAnalytics(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('sequence_ids') sequenceIdsRaw?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    const sequenceIds = parseOptionalUuidCsv(sequenceIdsRaw)
    return this.campaignsService.getCampaignEmailAnalytics(
      supabase,
      id,
      startDate,
      endDate,
      sequenceIds,
      scope.orgId,
    )
  }

  @Get(':id/ad-analytics')
  async adAnalytics(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.getCampaignAdAnalytics(
      supabase,
      id,
      startDate,
      endDate,
      scope.orgId,
    )
  }

  @Get(':id/social-connection-options')
  async socialConnectionOptions(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('platform') platformRaw?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    await this.campaignsService.getCampaign(supabase, id, scope.orgId)
    const raw = String(platformRaw ?? '')
      .trim()
      .toLowerCase()
    if (!raw) {
      const [instagram, linkedin, facebook, youtube] = await Promise.all([
        this.socialInsights.listCampaignSocialConnectionOptions(supabase, user.id, id, 'instagram'),
        this.socialInsights.listCampaignSocialConnectionOptions(supabase, user.id, id, 'linkedin'),
        this.socialInsights.listCampaignSocialConnectionOptions(supabase, user.id, id, 'facebook'),
        this.socialInsights.listCampaignSocialConnectionOptions(supabase, user.id, id, 'youtube'),
      ])
      return { instagram, linkedin, facebook, youtube }
    }
    if (!this.socialInsights.isSocialAnalyticsPlatform(raw)) {
      throw new NotFoundException('platform must be instagram, linkedin, facebook, or youtube')
    }
    const options = await this.socialInsights.listCampaignSocialConnectionOptions(
      supabase,
      user.id,
      id,
      raw as SocialAnalyticsPlatform,
    )
    return { options }
  }

  @Get(':id/social-analytics')
  async socialAnalytics(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('platform') platformRaw?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('refresh') refreshRaw?: string,
    @Query('connection_id') connectionIdRaw?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    await this.campaignsService.getCampaign(supabase, id, scope.orgId)
    const platform = String(platformRaw ?? '').toLowerCase()
    if (!this.socialInsights.isSocialAnalyticsPlatform(platform)) {
      throw new NotFoundException('platform must be instagram, linkedin, facebook, or youtube')
    }
    const connectionId =
      connectionIdRaw && isCampaignUuid(connectionIdRaw.trim()) ? connectionIdRaw.trim() : undefined
    return this.socialInsights.getCampaignSocialAnalytics(supabase, user.id, id, {
      platform: platform as SocialAnalyticsPlatform,
      since,
      until,
      refresh: refreshRaw === '1' || refreshRaw === 'true',
      connectionId,
    })
  }

  @Get(':id/main-dashboard')
  async mainDashboardAnalytics(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('refresh') refreshRaw?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    void scope
    return this.mainDashboard.getMainDashboard(supabase, user.id, id, {
      since,
      until,
      refresh: refreshRaw === '1' || refreshRaw === 'true',
    })
  }

  @Get(':id/reporting-widgets')
  async reportingWidgets(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.getCampaignReportingWidgets(
      supabase,
      id,
      startDate,
      endDate,
      scope.orgId,
    )
  }
}
