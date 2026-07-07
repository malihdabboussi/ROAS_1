import { Controller, Delete, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common'
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
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { CampaignsService } from '../services/campaigns.service'
import { isCampaignUuid } from './campaign-controller-utils'

@Controller('campaigns')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CampaignKnowledgeGraphController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Delete(':id/knowledge/nodes/:nodeId')
  async deleteKnowledgeNode(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    await this.campaignsService.deleteKnowledgeNode(supabase, id, nodeId)
    return { success: true }
  }

  @Get(':id/knowledge/graph')
  async getKnowledgeGraph(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.getKnowledgeGraph(supabase, id)
  }

  @Get(':id/knowledge/search')
  async searchKnowledge(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
    @Query('depth') depth?: string,
    @Query('domain') domain?: string,
    @Query('domains') domains?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    const parsedDomains = domains
      ? domains
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      : undefined
    return this.campaignsService.searchKnowledge(supabase, id, query || '', {
      limit: limit ? Number(limit) : 8,
      depth: depth ? Number(depth) : 2,
      domain,
      domains: parsedDomains,
    })
  }

  @Post(':id/knowledge/sync-assets')
  @UseGuards(CreditsGuard)
  async syncKnowledgeFromAssets(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.syncKnowledgeFromAssets(supabase, user.id, id)
  }

  @Post(':id/knowledge/organize')
  @UseGuards(CreditsGuard)
  async organizeKnowledgeGraph(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.organizeKnowledgeGraph(supabase, user.id, id)
  }
}
