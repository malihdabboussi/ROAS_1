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
export class AdArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('ads/:id')
  async getAd(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getAd(supabase, id)
  }

  @Patch('ads/:id')
  async updateAd(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body()
    body: {
      headline?: string
      primary_text?: string
      description?: string | null
      cta_type?: string | null
      cta_text?: string | null
      destination_url?: string
      display_link?: string | null
      placement?: string
      generated_tsx?: string | null
      image_url?: string | null
      image_asset_id?: string | null
      placement_images?: Record<string, { image_url: string; image_asset_id?: string | null }>
      placement_tsx?: Record<string, string>
      ad_format?: string
      video_url?: string | null
      carousel_cards?: Array<{
        image_url: string
        headline?: string
        description?: string
        link?: string
        image_asset_id?: string | null
      }> | null
      metadata?: Record<string, unknown>
      ad_set_id?: string | null
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateAd(supabase, id, body)
  }

  @Post('ads/:id/refresh-meta-status')
  @HttpCode(HttpStatus.OK)
  async refreshAdMetaStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.refreshAdMetaStatus(supabase, user.id, id)
  }

  @Post('ads/:id/set-meta-status')
  @HttpCode(HttpStatus.OK)
  async setAdMetaStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'PAUSED' },
    @OrgContext() _scope: RequestScope,
  ) {
    if (body?.status !== 'ACTIVE' && body?.status !== 'PAUSED') {
      throw new BadRequestException('status must be ACTIVE or PAUSED')
    }
    return this.artifactsService.setAdMetaStatus(supabase, user.id, id, body.status)
  }

  @Post('ads/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateAd(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.duplicateAd(supabase, user.id, id, scope.orgId)
  }

  @Post('ads/:id/clone')
  @HttpCode(HttpStatus.CREATED)
  async cloneAdToAdSet(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { target_ad_set_id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.cloneAdToAdSet(
      supabase,
      user.id,
      id,
      body.target_ad_set_id,
      scope.orgId,
    )
  }

  @Delete('ads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAd(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.artifactsService.deleteAd(supabase, user.id, id)
  }
}
