import { Body, Controller, HttpException, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { MetaApiService } from '../services/meta-api.service'
import { MetaPublishRequestService } from '../services/meta-publish-request.service'

@Controller('integrations/meta')
export class MetaPublishController {
  constructor(
    private readonly api: MetaApiService,
    private readonly metaPublishRequest: MetaPublishRequestService,
  ) {}

  @Patch('campaign-budget')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateCampaignBudget(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { adCampaignId?: string; daily_budget?: number; lifetime_budget?: number },
  ) {
    if (!body?.adCampaignId) {
      throw new HttpException(
        { success: false, error: 'adCampaignId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (typeof body.daily_budget !== 'number' && typeof body.lifetime_budget !== 'number') {
      throw new HttpException(
        { success: false, error: 'daily_budget or lifetime_budget is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.updateCampaignBudget(supabase, user.id, body.adCampaignId, {
      daily_budget: body.daily_budget,
      lifetime_budget: body.lifetime_budget,
    })
  }

  @Patch('adset-budget')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateAdSetBudget(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { adSetId?: string; daily_budget?: number; lifetime_budget?: number },
  ) {
    if (!body?.adSetId) {
      throw new HttpException(
        { success: false, error: 'adSetId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (typeof body.daily_budget !== 'number' && typeof body.lifetime_budget !== 'number') {
      throw new HttpException(
        { success: false, error: 'daily_budget or lifetime_budget is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.updateAdSetBudget(supabase, user.id, body.adSetId, {
      daily_budget: body.daily_budget,
      lifetime_budget: body.lifetime_budget,
    })
  }

  @Patch('campaign')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateCampaign(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    const adCampaignId = body?.adCampaignId as string | undefined
    if (!adCampaignId) {
      throw new HttpException(
        { success: false, error: 'adCampaignId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const { adCampaignId: _, ...fields } = body
    if (Object.keys(fields).length === 0) {
      throw new HttpException(
        { success: false, error: 'At least one field to update is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.updateCampaignOnMeta(supabase, user.id, adCampaignId, fields)
  }

  @Patch('adset')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateAdSet(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    const adSetId = body?.adSetId as string | undefined
    if (!adSetId) {
      throw new HttpException(
        { success: false, error: 'adSetId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const { adSetId: _, ...fields } = body
    if (Object.keys(fields).length === 0) {
      throw new HttpException(
        { success: false, error: 'At least one field to update is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.updateAdSetOnMeta(supabase, user.id, adSetId, fields)
  }

  @Post('publish-ad')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async publishAd(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    return this.metaPublishRequest.publishAd(supabase, user.id, body)
  }

  @Post('publish-campaign')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async publishCampaign(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const input = body as Record<string, unknown>
    if (!input.campaign_id) {
      throw new HttpException(
        {
          success: false,
          error: 'campaign_id is required',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    return this.api.publishCampaignBatch(supabase, user.id, {
      campaign_id: input.campaign_id as string,
      ad_account_id: input.ad_account_id as string | undefined,
      page_id: input.page_id as string | undefined,
      instagram_user_id: input.instagram_user_id as string | undefined,
      campaign_name: input.campaign_name as string | undefined,
      campaign_objective: input.campaign_objective as any,
      budget_type: input.budget_type as 'ABO' | 'CBO' | undefined,
      schedule_type: input.schedule_type as 'continuous' | 'one_time' | undefined,
      daily_budget: input.daily_budget as number | undefined,
      lifetime_budget: input.lifetime_budget as number | undefined,
      bid_strategy: input.bid_strategy as string | undefined,
      targeting: input.targeting as Record<string, unknown> | undefined,
      pixel_id: input.pixel_id as string | undefined,
      custom_event_type: input.custom_event_type as string | undefined,
      start_time: input.start_time as string | undefined,
      end_time: input.end_time as string | undefined,
    })
  }
}
