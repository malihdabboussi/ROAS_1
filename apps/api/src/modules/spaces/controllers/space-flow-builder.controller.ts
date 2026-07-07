import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
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
import { FlowCreateBuildSessionSchema, FlowCreatePlanSchema } from '../dto/flow-builder.dto'
import { SpaceFlowBuilderAccessService } from '../services/space-flow-builder-access.service'
import { SpaceFlowBuilderService } from '../services/space-flow-builder.service'

@Controller('spaces/:id/automations/flows')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceFlowBuilderController {
  constructor(
    private readonly builderService: SpaceFlowBuilderService,
    private readonly accessService: SpaceFlowBuilderAccessService,
  ) {}

  @Get('build-context')
  @Roles('admin')
  async getBuildContext(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.getContext(supabase, { spaceId: params.id, orgId: scope.orgId })
  }

  @Post('plans')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(FlowCreatePlanSchema)) body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.createPlan(supabase, {
      spaceId: params.id,
      orgId: scope.orgId,
      userId: user.id,
      dto: body as never,
    })
  }

  @Post('build-sessions')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createBuildSession(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(FlowCreateBuildSessionSchema)) body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.createBuildSession(supabase, {
      spaceId: params.id,
      orgId: scope.orgId,
      userId: user.id,
      dto: body as never,
    })
  }
}
