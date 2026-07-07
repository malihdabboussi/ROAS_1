import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { CampaignsService } from '../services/campaigns.service'
import { isCampaignUuid } from './campaign-controller-utils'

@Controller('campaigns')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CampaignAgentsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get(':id/agents')
  async listCampaignAgents(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') campaignId: string,
  ) {
    if (!isCampaignUuid(campaignId)) throw new NotFoundException('Campaign not found')
    const team = await this.campaignsService.listCampaignTeam(supabase, user.id, campaignId)
    return { success: true, campaign_id: campaignId, team }
  }

  @Post(':id/agents')
  @HttpCode(HttpStatus.OK)
  async assignCampaignAgent(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') campaignId: string,
    @Body() body: { agent_key: string },
  ) {
    if (!isCampaignUuid(campaignId)) throw new NotFoundException('Campaign not found')
    if (!body.agent_key?.trim()) throw new Error('agent_key is required')
    const assignment = await this.campaignsService.assignAgentToCampaign(
      supabase,
      user.id,
      campaignId,
      body.agent_key,
      { orgRole: scope.orgRole },
    )
    return { success: true, assignment }
  }

  @Delete(':id/agents/:agentKey')
  async unassignCampaignAgent(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') campaignId: string,
    @Param('agentKey') agentKey: string,
  ) {
    if (!isCampaignUuid(campaignId)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.unassignAgentFromCampaign(
      supabase,
      user.id,
      campaignId,
      agentKey,
      {
        orgRole: scope.orgRole,
      },
    )
  }
}
