import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'
import {
  CreatePresentationBodySchema,
  type CreatePresentationBody,
} from './presentation-artifact.schemas'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post('campaigns/:campaignId/offers')
  @HttpCode(HttpStatus.CREATED)
  async createOffer(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body() body: { name?: string; space_id?: string | null },
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.createOffer(
      supabase,
      user.id,
      campaignId,
      body?.name ?? 'Untitled Offer',
      scope.orgId,
      body?.space_id ?? null,
    )
  }

  @Post('campaigns/:campaignId/sequences')
  @HttpCode(HttpStatus.CREATED)
  async createSequence(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body() body: { name?: string; space_id?: string | null },
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.createSequence(
      supabase,
      user.id,
      campaignId,
      body?.name ?? 'Untitled Sequence',
      scope.orgId,
      body?.space_id ?? null,
    )
  }

  @Post('campaigns/:campaignId/presentations')
  @HttpCode(HttpStatus.CREATED)
  async createPresentation(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body(new ZodValidationPipe(CreatePresentationBodySchema)) body: CreatePresentationBody,
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.createPresentation(
      supabase,
      user.id,
      campaignId,
      body?.name ?? 'Untitled Presentation',
      scope.orgId,
      body?.space_id ?? null,
      {
        files: body?.files,
        entryFile: body?.entry_file,
      },
    )
  }

  @Post('campaigns/:campaignId/avatars')
  @HttpCode(HttpStatus.CREATED)
  async createAvatar(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body() body: { name?: string; space_id?: string | null },
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.createAvatar(
      supabase,
      user.id,
      campaignId,
      body?.name ?? 'Untitled Avatar',
      scope.orgId,
      body?.space_id ?? null,
    )
  }

  @Get('campaigns/:campaignId/assets/summary')
  async getAssetSummary(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getCampaignAssetSummary(supabase, campaignId)
  }

  @Patch('artifacts/:table/:id/move')
  async moveArtifact(
    @Supabase() supabase: SupabaseClient,
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() body: { target_campaign_id: string },
    @OrgContext() _scope: RequestScope,
  ) {
    if (!body?.target_campaign_id) {
      throw new BadRequestException('target_campaign_id is required')
    }
    return this.artifactsService.moveArtifactToCampaign(
      supabase,
      table,
      id,
      body.target_campaign_id,
    )
  }

  @Post('artifacts/:table/:id/copy')
  @HttpCode(HttpStatus.CREATED)
  async copyArtifact(
    @Supabase() supabase: SupabaseClient,
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() body: { target_campaign_id: string },
    @OrgContext() _scope: RequestScope,
  ) {
    if (!body?.target_campaign_id) {
      throw new BadRequestException('target_campaign_id is required')
    }
    return this.artifactsService.copyArtifactToCampaign(
      supabase,
      table,
      id,
      body.target_campaign_id,
    )
  }

  @Post('artifacts/resolve-campaigns')
  @HttpCode(HttpStatus.OK)
  async resolveArtifactCampaigns(
    @Supabase() supabase: SupabaseClient,
    @Body() body: { items?: Array<{ table: string; id: string }> },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.resolveArtifactCampaigns(supabase, body?.items ?? [])
  }
}
