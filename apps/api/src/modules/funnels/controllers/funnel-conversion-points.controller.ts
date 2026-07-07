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
import { FunnelsService } from '../services/funnels.service'

@Controller('funnels')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class FunnelConversionPointsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  @Get(':id/conversion-points')
  async listConversionPoints(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
  ) {
    return this.funnelsService.listConversionPoints(supabase, funnelId, scope.orgId)
  }

  @Patch(':id/conversion-points/email-capture')
  async upsertEmailCapturePoint(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Body() body: { funnel_page_id: string; config?: Record<string, unknown> },
  ) {
    if (!body?.funnel_page_id) throw new BadRequestException('funnel_page_id is required')
    return this.funnelsService.upsertEmailCaptureConversionPoint(
      supabase,
      user.id,
      funnelId,
      body.funnel_page_id,
      scope.orgId,
      body.config ?? {},
    )
  }

  @Delete(':id/conversion-points/email-capture/:pageId')
  @HttpCode(HttpStatus.OK)
  async deleteEmailCapturePoint(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.funnelsService.deleteEmailCaptureConversionPoint(
      supabase,
      funnelId,
      pageId,
      scope.orgId,
    )
  }
}
