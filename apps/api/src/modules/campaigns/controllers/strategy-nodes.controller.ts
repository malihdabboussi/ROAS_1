import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
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
import { StrategyNodesService } from '../services/strategy-nodes.service'

@Controller()
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class StrategyNodesController {
  constructor(private readonly strategyNodesService: StrategyNodesService) {}

  @Get('campaigns/:campaignId/strategy-nodes')
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.strategyNodesService.list(supabase, user.id, campaignId)
  }

  @Post('campaigns/:campaignId/strategy-nodes')
  async create(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body()
    body: {
      node_type: string
      text: string
      color?: string
      artifact_hint?: string
      position_x: number
      position_y: number
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.strategyNodesService.create(supabase, user.id, campaignId, body)
  }

  @Patch('campaigns/:campaignId/strategy-nodes/:nodeId')
  async update(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') _campaignId: string,
    @Param('nodeId') nodeId: string,
    @Body()
    body: Partial<{
      text: string
      color: string
      artifact_hint: string
      linked_artifact_id: string | null
      linked_artifact_type: string | null
      position_x: number
      position_y: number
    }>,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.strategyNodesService.update(supabase, user.id, nodeId, body)
  }

  @Delete('campaigns/:campaignId/strategy-nodes/:nodeId')
  async delete(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') _campaignId: string,
    @Param('nodeId') nodeId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.strategyNodesService.delete(supabase, user.id, nodeId)
    return { success: true }
  }
}
