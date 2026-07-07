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
  type RequestScope,
} from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AdSetArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('ad-sets/:id')
  async getAdSet(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getAdSet(supabase, id)
  }

  @Patch('ad-sets/:id')
  async updateAdSet(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string
      status?: string
      daily_budget?: number | null
      lifetime_budget?: number | null
      start_time?: string | null
      end_time?: string | null
      optimization_goal?: string
      billing_event?: string
      targeting?: Record<string, unknown>
      metadata?: Record<string, unknown>
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateAdSet(supabase, id, body)
  }

  @Get('ad-sets/:id/delivery-estimate')
  async getAdSetDeliveryEstimate(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getAdSetDeliveryEstimate(supabase, user.id, id)
  }

  @Post('ad-sets/:id/refresh-meta-status')
  @HttpCode(HttpStatus.OK)
  async refreshAdSetMetaStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.refreshAdSetMetaStatus(supabase, user.id, id)
  }

  @Post('ad-sets/:id/set-meta-status')
  @HttpCode(HttpStatus.OK)
  async setAdSetMetaStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'PAUSED' },
    @OrgContext() _scope: RequestScope,
  ) {
    if (body?.status !== 'ACTIVE' && body?.status !== 'PAUSED') {
      throw new BadRequestException('status must be ACTIVE or PAUSED')
    }
    return this.artifactsService.setAdSetMetaStatus(supabase, user.id, id, body.status)
  }
}
