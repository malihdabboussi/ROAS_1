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
export class SocialPostArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('campaigns/:campaignId/social-posts')
  async listSocialPosts(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
    @Query('platform') platform?: string,
    @Query('space_id') spaceId?: string,
  ) {
    return this.artifactsService.listSocialPosts(supabase, campaignId, platform, spaceId)
  }

  @Get('campaigns/:campaignId/schedule')
  async listCampaignSchedule(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.listScheduledPosts(supabase, campaignId)
  }

  @Post('campaigns/:campaignId/social-posts')
  @HttpCode(HttpStatus.CREATED)
  async createSocialPost(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body()
    body: {
      platform: string
      post_type: string
      caption?: string
      space_id?: string | null
    },
    @OrgContext() scope: RequestScope,
  ) {
    if (!body?.platform) throw new BadRequestException('platform is required')
    if (!body?.post_type) throw new BadRequestException('post_type is required')
    return this.artifactsService.createSocialPost(supabase, user.id, campaignId, body, scope.orgId)
  }

  @Get('social-posts/:id')
  async getSocialPost(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getSocialPost(supabase, id)
  }

  @Patch('social-posts/:id')
  async updateSocialPost(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body()
    body: {
      caption?: string
      headline?: string
      generated_tsx?: string | null
      image_url?: string | null
      image_asset_id?: string | null
      video_url?: string | null
      video_asset_id?: string | null
      carousel_slides?: unknown
      hashtags?: string[]
      cta_url?: string | null
      post_type?: string
      status?: string
      metadata?: Record<string, unknown>
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateSocialPost(supabase, id, body)
  }

  @Post('social-posts/:id/schedule')
  async scheduleSocialPost(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { scheduled_at: string },
    @OrgContext() _scope: RequestScope,
  ) {
    if (!body?.scheduled_at) throw new BadRequestException('scheduled_at is required')
    const scheduledAt = new Date(body.scheduled_at)
    if (Number.isNaN(scheduledAt.getTime()))
      throw new BadRequestException('scheduled_at is invalid')
    if (scheduledAt.getTime() <= Date.now())
      throw new BadRequestException('scheduled_at must be in the future')
    return this.artifactsService.scheduleSocialPost(supabase, id, scheduledAt.toISOString())
  }

  @Post('social-posts/:id/unschedule')
  async unscheduleSocialPost(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.unscheduleSocialPost(supabase, id)
  }

  @Delete('social-posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSocialPost(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.artifactsService.deleteSocialPost(supabase, id)
  }
}
