import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
  FlowCreateClarificationsSchema,
  type FlowBuildSessionIdParam,
} from '../dto/flow-builder.dto'
import { SpaceFlowBuilderAccessService } from '../services/space-flow-builder-access.service'
import { SpaceFlowBuilderService } from '../services/space-flow-builder.service'

@Controller('spaces/:id/automations/flows')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceFlowBuildSessionsController {
  constructor(
    private readonly builderService: SpaceFlowBuilderService,
    private readonly accessService: SpaceFlowBuilderAccessService,
  ) {}

  @Get('build-sessions/latest')
  @Roles('admin')
  async getLatestBuildSession(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Query('conversation_id') conversationId: string | undefined,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.getLatestPlan(supabase, params.id, conversationId ?? null)
  }

  @Get('build-sessions')
  @Roles('admin')
  async listBuildSessions(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.listBuildSessionLinks(supabase, params.id)
  }

  @Get('build-sessions/:sessionId')
  @Roles('admin')
  async getBuildSession(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.getBuildSession(supabase, params.id, sParams.sessionId)
  }

  @Delete('build-sessions/:sessionId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deleteBuildSession(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.deleteBuildSession(supabase, params.id, sParams.sessionId)
  }

  @Post('build-sessions/:sessionId/clarifications')
  @Roles('admin')
  async createClarifications(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBuildSessionIdParamSchema)) sParams: FlowBuildSessionIdParam,
    @Body(new ZodValidationPipe(FlowCreateClarificationsSchema)) body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.accessService.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.createClarifications(supabase, {
      spaceId: params.id,
      sessionId: sParams.sessionId,
      orgId: scope.orgId,
      userId: user.id,
      dto: body as never,
    })
  }

  @Post('build-sessions/:sessionId/clarifications/answers')
  @Roles('admin')
  async answerBuildSessionClarifications(
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
}
