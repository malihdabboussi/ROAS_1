import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
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
import { AgentCheckpointsService } from '../../missions/services/agent-checkpoints.service'

@Controller('agents/:agentKey/checkpoints')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentCheckpointsController {
  constructor(private readonly checkpointsService: AgentCheckpointsService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
    @Query() query: { limit?: string; cursor?: string },
  ) {
    return this.checkpointsService.list(supabase, user.id, scope.orgId, agentKey, query)
  }

  @Get(':checkpointId')
  async get(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
    @Param('checkpointId') checkpointId: string,
  ) {
    return this.checkpointsService.get(supabase, user.id, scope.orgId, agentKey, checkpointId)
  }

  @Patch(':checkpointId')
  async updateSummary(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
    @Param('checkpointId') checkpointId: string,
    @Body() body: { summary: string },
  ) {
    return this.checkpointsService.updateSummary(
      supabase,
      user.id,
      scope.orgId,
      agentKey,
      checkpointId,
      body.summary,
    )
  }

  @Post(':checkpointId/restore')
  async restore(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
    @Param('checkpointId') checkpointId: string,
  ) {
    return this.checkpointsService.restore(supabase, user.id, scope.orgId, agentKey, checkpointId)
  }
}
