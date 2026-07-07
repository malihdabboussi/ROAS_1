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
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { FunnelsService } from '../services/funnels.service'

@Controller('funnels')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class FunnelsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  @Get()
  async list(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('campaign_id') campaignId: string,
    @Query('space_id') spaceId?: string,
    @Query('fields') fields?: string,
  ) {
    if (!campaignId) {
      throw new BadRequestException('campaign_id query param is required')
    }
    return this.funnelsService.listFunnels(supabase, campaignId, scope.orgId, spaceId, {
      summary: fields === 'summary',
    })
  }

  @Get(':id')
  async get(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    return this.funnelsService.getFunnel(supabase, id, scope.orgId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRole('creator')
  async create(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body()
    body: { name: string; funnel_type: string; campaign_id: string; space_id?: string | null },
  ) {
    if (!body.name || !body.funnel_type || !body.campaign_id) {
      throw new BadRequestException('name, funnel_type, and campaign_id are required')
    }
    return this.funnelsService.createFunnel(supabase, user.id, body, scope.orgId)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    await this.funnelsService.deleteFunnel(supabase, id, scope.orgId)
  }

  @Patch(':id')
  async update(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.funnelsService.updateFunnel(supabase, id, body, scope.orgId)
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    return this.funnelsService.publishFunnel(supabase, id, scope.orgId)
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    return this.funnelsService.unpublishFunnel(supabase, id, scope.orgId)
  }
}
