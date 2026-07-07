import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { GraphRequestService } from '../services/graph-request.service'

/**
 * Graph Controller (US-006)
 *
 * Provides the ForceGraph visualization payload.
 * Thin handler — delegates all logic to GraphService.
 */
@Controller('brain')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class GraphController {
  constructor(private readonly graphRequestService: GraphRequestService) {}

  @Get('graph')
  async getGraph(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Query('agent_id') agentId?: string,
    @Query('brain_id') brainId?: string,
    @Query('limit') limit?: string,
    @Query('min_significance') minSignificance?: string,
    @Query('memory_type') memoryType?: string,
  ) {
    if (scope.orgId && scope.orgRole === 'viewer') {
      throw new ForbiddenException('Viewers cannot access Brain')
    }
    return this.graphRequestService.buildGraphForRequest(supabase, user.id, scope, {
      agentId,
      brainId,
      limit,
      minSignificance,
      memoryType,
    })
  }
}
