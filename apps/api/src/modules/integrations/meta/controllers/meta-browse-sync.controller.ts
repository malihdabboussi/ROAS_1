import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { MetaApiService } from '../services/meta-api.service'

@Controller('integrations/meta')
export class MetaBrowseSyncController {
  constructor(private readonly api: MetaApiService) {}

  @Get('ad-accounts/:adAccountId/campaigns')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listMetaCampaigns(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('adAccountId') adAccountId: string,
  ) {
    if (!adAccountId) {
      throw new HttpException(
        { success: false, error: 'adAccountId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const campaigns = await this.api.listMetaCampaigns(supabase, user.id, adAccountId)
    return { success: true, data: campaigns }
  }

  @Get('meta-campaigns/:metaCampaignId/adsets')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listMetaAdSets(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('metaCampaignId') metaCampaignId: string,
  ) {
    if (!metaCampaignId) {
      throw new HttpException(
        { success: false, error: 'metaCampaignId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const adSets = await this.api.listMetaAdSets(supabase, user.id, metaCampaignId)
    return { success: true, data: adSets }
  }

  @Get('meta-adsets/:metaAdSetId/ads')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listMetaAds(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('metaAdSetId') metaAdSetId: string,
  ) {
    if (!metaAdSetId) {
      throw new HttpException(
        { success: false, error: 'metaAdSetId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const ads = await this.api.listMetaAds(supabase, user.id, metaAdSetId)
    return { success: true, data: ads }
  }

  @Get('ad-accounts/:adAccountId/hierarchy')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getMetaFullHierarchy(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('adAccountId') adAccountId: string,
  ) {
    if (!adAccountId) {
      throw new HttpException(
        { success: false, error: 'adAccountId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const hierarchy = await this.api.getMetaFullHierarchy(supabase, user.id, adAccountId)
    return { success: true, data: hierarchy }
  }

  @Post('ad-accounts/:adAccountId/sync')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async syncMetaAdAccount(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('adAccountId') adAccountId: string,
    @Body() body: { campaignId?: string },
  ) {
    if (!adAccountId) {
      throw new HttpException(
        { success: false, error: 'adAccountId is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (!body?.campaignId) {
      throw new HttpException(
        { success: false, error: 'campaignId (Vibey campaign) is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.syncMetaAdAccount(supabase, user.id, body.campaignId, adAccountId)
    return { success: true, data: result }
  }
}
