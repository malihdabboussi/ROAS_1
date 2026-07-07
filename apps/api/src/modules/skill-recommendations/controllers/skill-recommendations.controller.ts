import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  UpdateSkillRecommendationSchema,
  UpdateSkillRecommendationSettingsSchema,
  type UpdateSkillRecommendationInput,
  type UpdateSkillRecommendationSettingsInput,
} from '../dtos/skill-recommendations.dto'
import { AgentLearningLoopApplyService } from '../services/agent-learning-loop-apply.service'
import { SkillRecommendationsService } from '../services/skill-recommendations.service'

@Controller('skill-recommendations')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SkillRecommendationsController {
  constructor(
    private readonly service: SkillRecommendationsService,
    private readonly applyService: AgentLearningLoopApplyService,
  ) {}

  @Get('settings')
  async getSettings(@OrgContext() scope: RequestScope) {
    return this.service.getSettings(scope)
  }

  @Patch('settings')
  @RequireOrgRole('admin')
  async updateSettings(
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(UpdateSkillRecommendationSettingsSchema))
    body: UpdateSkillRecommendationSettingsInput,
  ) {
    if (!scope.orgId) {
      throw new BadRequestException('Organization context required to update skill recommendations')
    }
    return this.service.updateSettings(scope.orgId, body.enabled)
  }

  @Get('home')
  async getHome(@OrgContext() scope: RequestScope, @Query('limit') limit?: string) {
    return this.service.getHome(scope, limit ? Number(limit) : 5)
  }

  @Get(':id')
  async getRecommendation(@OrgContext() scope: RequestScope, @Param('id') id: string) {
    return this.service.getRecommendation(scope, id)
  }

  @Patch(':id')
  async updateRecommendation(
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSkillRecommendationSchema))
    body: UpdateSkillRecommendationInput,
  ) {
    return this.service.updateRecommendation(scope, id, body.status)
  }

  @Post(':id/apply')
  @RequireOrgRole('admin')
  async applyRecommendation(
    @OrgContext() scope: RequestScope,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
  ) {
    if (!scope.orgId) throw new BadRequestException('Organization context required')
    return this.applyService.applyRecommendation(supabase, user.id, scope.orgId, id)
  }

  @Post(':id/experiment/evaluate')
  @RequireOrgRole('admin')
  async evaluateExperiment(
    @OrgContext() scope: RequestScope,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
  ) {
    if (!scope.orgId) throw new BadRequestException('Organization context required')
    return this.applyService.evaluateExperiment(supabase, user.id, scope.orgId, id)
  }
}
