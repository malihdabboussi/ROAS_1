import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
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
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AdCampaignArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('ad-campaigns/:id')
  async getAdCampaign(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getAdCampaign(supabase, id)
  }

  @Get('ad-campaigns/:id/ads')
  async listAdCampaignAds(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.listAdsByAdCampaign(supabase, id)
  }

  @Get('ad-sets/:id/ads')
  async listAdSetAds(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.listAdsByAdSet(supabase, id)
  }

  @Patch('ad-campaigns/:id')
  async updateAdCampaign(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string
      objective?: string
      status?: string
      budget_type?: string
      daily_budget?: number | null
      lifetime_budget?: number | null
      bid_strategy?: string
      special_ad_categories?: string[]
      meta_ad_account_id?: string | null
      meta_page_id?: string | null
      schedule_type?: string
      start_time?: string | null
      end_time?: string | null
      metadata?: Record<string, unknown>
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateAdCampaign(supabase, id, body)
  }

  @Post('ad-campaigns/:id/refresh-meta-status')
  @HttpCode(HttpStatus.OK)
  async refreshAdCampaignMetaStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.refreshAdCampaignMetaStatus(supabase, user.id, id)
  }

  @Post('ad-campaigns/:id/set-meta-status')
  @HttpCode(HttpStatus.OK)
  async setAdCampaignMetaStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'PAUSED' },
    @OrgContext() _scope: RequestScope,
  ) {
    if (body?.status !== 'ACTIVE' && body?.status !== 'PAUSED') {
      throw new BadRequestException('status must be ACTIVE or PAUSED')
    }
    return this.artifactsService.setAdCampaignMetaStatus(supabase, user.id, id, body.status)
  }

  @Post('ad-campaigns/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateAdCampaign(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.duplicateAdCampaign(supabase, user.id, id, scope.orgId)
  }

  @Delete('ad-campaigns/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAdCampaign(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
    @Query('delete_mode') deleteMode?: 'keep_ads' | 'delete_all',
  ) {
    const mode = deleteMode === 'delete_all' ? 'delete_all' : 'keep_ads'
    await this.artifactsService.deleteAdCampaign(supabase, user.id, id, mode)
  }

  @Delete('campaigns/:campaignId/ungrouped-ads')
  @HttpCode(HttpStatus.OK)
  async deleteUngroupedAds(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.deleteUngroupedAds(supabase, user.id, campaignId, scope.orgId)
  }

  @Post('ad-campaigns/:id/ad-sets')
  @HttpCode(HttpStatus.CREATED)
  async createAdSet(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') adCampaignId: string,
    @Body() body: { name?: string; space_id?: string | null },
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.createAdSet(
      supabase,
      user.id,
      adCampaignId,
      body?.name ?? 'Untitled Ad Set',
      scope.orgId,
      body?.space_id ?? null,
    )
  }
}
