import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
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
import { BrainCortexMaxService } from '../services/brain-cortex-max.service'
import { BrainOpsHookService } from '../services/brain-ops-hook.service'

@Controller('brain')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class BrainCortexMaxController {
  constructor(
    private readonly cortexMax: BrainCortexMaxService,
    private readonly brainOpsHook: BrainOpsHookService,
  ) {}

  @Patch(':brainId/image')
  async setBrainImage(
    @Param('brainId') brainId: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: { image_url: string | null },
  ) {
    return this.cortexMax.setBrainImage({
      brainId,
      userId: user.id,
      scope,
      imageUrl: body.image_url,
    })
  }

  @Patch(':brainId/cortex-max')
  async toggleCortexMax(
    @Param('brainId') brainId: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
    @Body() body: { enabled: boolean },
  ) {
    return this.cortexMax.toggleCortexMax({
      brainId,
      userId: user.id,
      scope,
      supabase,
      enabled: body.enabled,
    })
  }

  @Post(':brainId/cortex-max/crystallize')
  @HttpCode(HttpStatus.ACCEPTED)
  async crystallizeCortexMax(
    @Param('brainId') brainId: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.brainOpsHook.enqueueManualCortexCrystallization(
      brainId,
      user.id,
      scope.orgId ?? null,
    )
    return {
      success: true,
      library_sync_enqueued: result.librarySyncEnqueued,
      pattern_analysis_enqueued: result.patternAnalysisEnqueued,
      timeline_synthesis_enqueued: result.timelineSynthesisEnqueued,
    }
  }

  @Get(':brainId/timelines')
  async getTimelines(
    @Param('brainId') brainId: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.cortexMax.getTimelines({
      brainId,
      userId: user.id,
      scope,
      supabase,
    })
  }

  @Get(':brainId/timelines/:timelineId/items')
  async getTimelineItems(
    @Param('brainId') brainId: string,
    @Param('timelineId') timelineId: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.cortexMax.getTimelineItems({
      brainId,
      timelineId,
      userId: user.id,
      scope,
      supabase,
    })
  }

  @Get(':brainId/narrative-pages')
  async getNarrativePages(
    @Param('brainId') brainId: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.cortexMax.getNarrativePages({
      brainId,
      userId: user.id,
      scope,
      supabase,
    })
  }
}
