import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
} from '@vibey/api-shared'
import {
  CampaignKnowledgeGraphParamSchema,
  KnowledgeGraphQuerySchema,
  KnowledgeGraphStatsBatchQuerySchema,
  SpaceKnowledgeGraphParamSchema,
  type CampaignKnowledgeGraphParam,
  type KnowledgeGraphQuery,
  type KnowledgeGraphStatsBatchQuery,
  type SpaceKnowledgeGraphParam,
} from '../dto/space-knowledge-graph.dto'
import { SpaceKnowledgeGraphService } from '../services/space-knowledge-graph.service'

@Controller('space-retrieval/knowledge')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SpaceKnowledgeGraphController {
  constructor(private readonly graphService: SpaceKnowledgeGraphService) {}

  @Get('spaces/:spaceId/graph')
  async getSpaceGraph(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceKnowledgeGraphParamSchema)) params: SpaceKnowledgeGraphParam,
    @Query(new ZodValidationPipe(KnowledgeGraphQuerySchema)) query: KnowledgeGraphQuery,
  ) {
    return this.graphService.getSpaceGraph(supabase, params.spaceId, query.limit)
  }

  @Get('campaigns/:campaignId/graph')
  async getCampaignGraph(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(CampaignKnowledgeGraphParamSchema))
    params: CampaignKnowledgeGraphParam,
    @Query(new ZodValidationPipe(KnowledgeGraphQuerySchema)) query: KnowledgeGraphQuery,
  ) {
    return this.graphService.getCampaignGraph(supabase, params.campaignId, query.limit)
  }

  @Get('stats/batch')
  async getStatsBatch(
    @Supabase() supabase: SupabaseClient,
    @Query(new ZodValidationPipe(KnowledgeGraphStatsBatchQuerySchema))
    query: KnowledgeGraphStatsBatchQuery,
  ) {
    return this.graphService.getStatsBatch(supabase, {
      spaceIds: query.space_ids,
      campaignIds: query.campaign_ids,
    })
  }
}
