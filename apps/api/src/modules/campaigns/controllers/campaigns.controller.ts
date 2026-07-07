import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { CampaignsService } from '../services/campaigns.service'
import { isCampaignUuid } from './campaign-controller-utils'

@Controller('campaigns')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.campaignsService.listCampaigns(supabase, user.id, scope.orgId)
  }

  @Get('user-state')
  @RequireOrgRole('viewer')
  async listUserState(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.campaignsService.listUserState(supabase, user.id)
  }

  @Patch(':id/user-state')
  @RequireOrgRole('viewer')
  async updateUserState(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { is_favorite?: boolean; is_hidden?: boolean },
    @OrgContext() scope: RequestScope,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.upsertUserState(supabase, user.id, id, body, scope.orgId)
  }

  @Get('leaderboard')
  async campaignLeaderboard(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limitRaw?: string,
  ) {
    void scope
    const limit = limitRaw ? Number(limitRaw) : undefined
    return this.campaignsService.getCampaignLeaderboard(supabase, startDate, endDate, limit)
  }

  @Get('assignments/by-agent/:agentKey')
  async listAgentCampaignAssignments(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
  ) {
    const campaignIds = await this.campaignsService.listAgentCampaignIds(
      supabase,
      user.id,
      agentKey,
      scope.orgId,
    )
    return { success: true, campaign_ids: campaignIds }
  }

  @Get(':id')
  async get(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.getCampaign(supabase, id, scope.orgId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRole('creator')
  async create(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { name: string; campaign_type?: string; config?: Record<string, unknown> },
    @OrgContext() scope: RequestScope,
  ) {
    return this.campaignsService.createCampaign(supabase, user.id, body, scope.orgId)
  }

  @Patch(':id')
  @RequireOrgRole('editor')
  async update(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.updateCampaign(supabase, id, body, scope.orgId)
  }

  @Patch(':id/context')
  @RequireOrgRole('editor')
  async updateContext(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: { result?: string; purpose?: string; strategy?: string; off_limits?: string[] },
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.updateCampaignContext(supabase, user.id, id, body)
  }

  @Post(':id/generate-context')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRole('editor')
  @UseGuards(CreditsGuard)
  async generateCampaignContext(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.generateCampaignStrategyContext(supabase, user.id, id, scope.orgId)
  }

  @Delete(':id')
  @RequireOrgRole('admin')
  async delete(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    await this.campaignsService.deleteCampaign(supabase, id, scope.orgId)
    return { success: true }
  }

  @Patch(':id/restore')
  @RequireOrgRole('admin')
  async restore(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    const campaign = await this.campaignsService.restoreCampaign(supabase, id)
    return { success: true, campaign }
  }
}
