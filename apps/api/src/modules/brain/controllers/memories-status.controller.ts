import { Controller, Get, Query, UseGuards } from '@nestjs/common'
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
import { BrainPermissionsService } from '../services/brain-permissions.service'
import { MemoriesService } from '../services/memories.service'
import { assertBrainFeatureAllowed } from './brain-controller-access'

@Controller('brain')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class MemoriesStatusController {
  constructor(
    private readonly memoriesService: MemoriesService,
    private readonly brainPermissions: BrainPermissionsService,
  ) {}

  @Get('brains')
  async listBrains(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
  ) {
    assertBrainFeatureAllowed(scope)
    const payload = await this.memoriesService.listBrainsForExtension(supabase, user.id, scope)
    return { success: true, ...payload }
  }

  @Get('stats')
  async stats(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Query('agent_id') agentId?: string,
  ) {
    assertBrainFeatureAllowed(scope)
    return this.memoriesService.getStats(supabase, user.id, agentId, scope.orgId)
  }

  @Get('health')
  async health(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Query('agent_id') agentId?: string,
    @Query('brain_id') brainId?: string,
  ) {
    assertBrainFeatureAllowed(scope)
    if (brainId?.trim()) {
      await this.brainPermissions.assertCanViewBrain(supabase, user.id, scope, brainId.trim())
    }
    return this.memoriesService.getHealth(supabase, user.id, agentId, brainId, scope.orgId)
  }

  @Get('health/batch')
  async healthBatch(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Query('brain_ids') brainIdsRaw?: string,
  ) {
    assertBrainFeatureAllowed(scope)
    return this.memoriesService.getHealthBatch(supabase, user.id, brainIdsRaw)
  }
}
