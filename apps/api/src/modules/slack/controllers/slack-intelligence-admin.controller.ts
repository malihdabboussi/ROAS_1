import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  SlackChannelExclusionDtoSchema,
  SlackSignalTrainingDtoSchema,
  type SlackChannelExclusionDto,
  type SlackSignalTrainingDto,
} from '../dto/slack.dto'
import { SlackChannelCoverageService } from '../services/slack-channel-coverage.service'
import { SlackSignalTrainingService } from '../services/slack-signal-training.service'

@Controller('integrations/slack/intelligence')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
@RequireOrgRole('admin')
export class SlackIntelligenceAdminController {
  constructor(
    private readonly coverage: SlackChannelCoverageService,
    private readonly training: SlackSignalTrainingService,
  ) {}

  @Get('channels/coverage')
  getCoverage(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.coverage.getCoverage(supabase, String(scope.orgId))
  }

  @Patch('channels/:channelId/exclusion')
  setExclusion(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('channelId') channelId: string,
    @Body(new ZodValidationPipe(SlackChannelExclusionDtoSchema)) body: SlackChannelExclusionDto,
  ) {
    return this.coverage.setExclusion(supabase, {
      orgId: String(scope.orgId),
      channelId,
      excluded: body.excluded,
      reason: body.reason,
    })
  }

  @Post('signals/:signalId/train')
  trainSignal(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('signalId') signalId: string,
    @Body(new ZodValidationPipe(SlackSignalTrainingDtoSchema)) body: SlackSignalTrainingDto,
  ) {
    return this.training.train({
      supabase,
      orgId: String(scope.orgId),
      userId: user.id,
      signalId,
      instruction: body.instruction,
      saveAsRule: body.save_as_rule,
    })
  }
}
