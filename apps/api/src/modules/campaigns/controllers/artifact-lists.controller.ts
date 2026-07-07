import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common'
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
export class ArtifactListsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('campaigns/:campaignId/offers')
  async listOffers(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
    @Query('space_id') spaceId?: string,
  ) {
    return this.artifactsService.listOffers(supabase, campaignId, spaceId)
  }

  @Get('campaigns/:campaignId/sequences')
  async listSequences(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
    @Query('space_id') spaceId?: string,
    @Query('fields') fields?: string,
  ) {
    return this.artifactsService.listSequences(supabase, campaignId, spaceId, {
      summary: fields === 'summary',
    })
  }

  @Get('campaigns/:campaignId/presentations')
  async listPresentations(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
    @Query('space_id') spaceId?: string,
    @Query('fields') fields?: string,
  ) {
    return this.artifactsService.listPresentations(supabase, campaignId, spaceId, {
      summary: fields === 'summary',
    })
  }

  @Get('campaigns/:campaignId/avatars')
  async listAvatars(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
    @Query('space_id') spaceId?: string,
  ) {
    return this.artifactsService.listAvatars(supabase, campaignId, spaceId)
  }

  @Get('campaigns/:campaignId/ads')
  async listAds(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
    @Query('space_id') spaceId?: string,
  ) {
    return this.artifactsService.listAds(supabase, campaignId, spaceId)
  }

  @Get('campaigns/:campaignId/ad-campaigns')
  async listAdCampaigns(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
    @Query('space_id') spaceId?: string,
    @Query('fields') fields?: string,
  ) {
    return this.artifactsService.listAdCampaigns(supabase, campaignId, spaceId, {
      summary: fields === 'summary',
    })
  }

  @Post('campaigns/:campaignId/ad-campaigns')
  @HttpCode(HttpStatus.CREATED)
  async createAdCampaign(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body() body: { name?: string; space_id?: string | null },
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.createAdCampaign(
      supabase,
      user.id,
      campaignId,
      body?.name ?? 'Untitled Campaign',
      scope.orgId,
      body?.space_id ?? null,
    )
  }
}
