import {
  Body,
  Controller,
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
  FlowBlueprintIdParamSchema,
  FlowBlueprintSearchSchema,
  FlowCreateBlueprintSchema,
  type FlowBlueprintIdParam,
} from '../dto/flow-builder.dto'
import { SpaceFlowBuilderService } from '../services/space-flow-builder.service'
import { SpacePermissionsService } from '../services/space-permissions.service'

@Controller('spaces/:id/automations/flows/blueprints')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceFlowBuilderBlueprintsController {
  constructor(
    private readonly builderService: SpaceFlowBuilderService,
    private readonly permissionsService: SpacePermissionsService,
  ) {}

  @Get()
  @Roles('admin')
  async listBlueprints(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Query(new ZodValidationPipe(FlowBlueprintSearchSchema)) query: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.listBlueprints(supabase, {
      spaceId: params.id,
      orgId: scope.orgId,
      ...(query as { status?: string; limit?: number }),
    })
  }

  @Post('drafts')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createBlueprint(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(FlowCreateBlueprintSchema)) body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    await this.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.createBlueprint(supabase, {
      spaceId: params.id,
      orgId: scope.orgId,
      userId: user.id,
      dto: body as never,
    })
  }

  @Post(':blueprintId/validate')
  @Roles('admin')
  async validateBlueprint(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBlueprintIdParamSchema)) bParams: FlowBlueprintIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.assertSpaceAccess(supabase, user.id, params.id, scope, 'view')
    return this.builderService.validateBlueprint(supabase, params.id, bParams.blueprintId)
  }

  @Post(':blueprintId/activate')
  @Roles('admin')
  async activateBlueprint(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowBlueprintIdParamSchema)) bParams: FlowBlueprintIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.assertSpaceAccess(supabase, user.id, params.id, scope, 'edit')
    return this.builderService.activateBlueprint(supabase, params.id, bParams.blueprintId)
  }

  private assertSpaceAccess(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    scope: RequestScope,
    level: 'view' | 'edit',
  ) {
    return this.permissionsService.assertCanAccessSpace(
      supabase,
      userId,
      scope.orgRole,
      spaceId,
      level,
      scope.orgId,
    )
  }
}
