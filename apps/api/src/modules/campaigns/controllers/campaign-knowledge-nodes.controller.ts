import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
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
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { CampaignsService } from '../services/campaigns.service'
import { type CampaignKnowledgeDomain, isCampaignUuid } from './campaign-controller-utils'

@Controller('campaigns')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CampaignKnowledgeNodesController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get(':id/knowledge/nodes')
  async listKnowledgeNodes(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('node_type') nodeType?: string,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
    @Query('domain') domain?: string,
    @Query('source_type') sourceType?: string,
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.listKnowledgeNodes(
      supabase,
      id,
      {
        node_type: nodeType,
        query,
        limit: limit ? Number(limit) : 100,
        domain,
        source_type: sourceType,
      },
      scope.orgId,
    )
  }

  @Post(':id/knowledge/nodes/manual')
  @UseGuards(CreditsGuard)
  async createManualKnowledgeNode(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body()
    body: {
      title: string
      content: string
      node_type?: 'document' | 'user_upload' | 'url_import'
      domain?: CampaignKnowledgeDomain
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string | null
      mediaMimeType?: string | null
      mediaBase64?: string | null
      mediaCaption?: string | null
    },
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.createManualKnowledgeNode(supabase, user.id, id, body)
  }
}
