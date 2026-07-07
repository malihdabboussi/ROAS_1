import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RoleGuard,
  Roles,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { SpaceIdParamSchema, type SpaceIdParam } from '../dto'
import {
  FlowBuildSessionIdParamSchema,
  FlowClarificationAnswerSchema,
  FlowCompilePlanSchema,
  FlowEvaluatePlanSchema,
  FlowUpdatePlanSchema,
  type FlowBuildSessionIdParam,
} from '../dto/flow-builder.dto'
import { SpaceFlowBuilderAccessService } from '../services/space-flow-builder-access.service'
import { SpaceFlowBuilderService } from '../services/space-flow-builder.service'

@Controller('spaces/:id/automations/flows')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceFlowPlansController {
  constructor(
    private readonly builderService: SpaceFlowBuilderService,
    private readonly accessService: SpaceFlowBuilderAccessService,
  ) {}

  @Get('plans/latest')
  @Roles('admin')
  async getLatestPlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.getLatestPlan(supabase, params.id)
  }

  @Get('plans/:sessionId')
  @Roles('admin')
  async getPlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.getPlan(supabase, params.id, sParams.sessionId)
  }

  @Patch('plans/:sessionId')
  @Roles('admin')
  async updatePlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @Body(new ZodValidationPipe(FlowUpdatePlanSchema)) body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.updatePlan(supabase, {
      spaceId: params.id,
      sessionId: sParams.sessionId,
      dto: body as never,
    })
  }

  @Post('plans/:sessionId/clarifications')
  @Roles('admin')
  async answerPlanClarifications(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @Body(new ZodValidationPipe(FlowClarificationAnswerSchema)) body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.answerClarifications(supabase, {
      spaceId: params.id,
      sessionId: sParams.sessionId,
      dto: body as never,
    })
  }

  @Post('plans/:sessionId/validate')
  @Roles('admin')
  async validatePlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.validatePlan(supabase, params.id, sParams.sessionId)
  }

  @Post('plans/:sessionId/compile')
  @Roles('admin')
  async compilePlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @Body(new ZodValidationPipe(FlowCompilePlanSchema)) body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.compilePlan(supabase, {
      spaceId: params.id,
      sessionId: sParams.sessionId,
      userId: user.id,
      dto: body as never,
    })
  }

  @Post('plans/:sessionId/evaluations')
  @Roles('admin')
  async evaluatePlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @Body(new ZodValidationPipe(FlowEvaluatePlanSchema)) body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.evaluatePlan(supabase, {
      spaceId: params.id,
      sessionId: sParams.sessionId,
      userId: user.id,
      orgId: scope.orgId,
      dto: body as never,
    })
  }
}
