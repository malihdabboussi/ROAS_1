import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class DocumentListArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('campaigns/:campaignId/documents')
  async listCampaignDocuments(
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.listDocumentsByCampaign(supabase, campaignId)
  }

  @Get('conversations/:conversationId/documents')
  async listConversationDocuments(
    @Supabase() supabase: SupabaseClient,
    @Param('conversationId') conversationId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.listDocumentsByConversation(supabase, conversationId)
  }

  @Get('agents/:agentKey/documents')
  async listAgentDocuments(
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.listDocumentsByAgent(supabase, agentKey)
  }
}
