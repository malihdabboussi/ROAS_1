import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
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
  SpaceShareIdParamSchema,
  SpaceViewIdParamSchema,
  UpsertSpaceViewShareSchema,
  type SpaceShareIdParam,
  type SpaceViewIdParam,
  type UpsertSpaceViewShareDto,
} from '../dto'
import { SpacePermissionsService } from '../services/space-permissions.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceViewSharingController {
  constructor(private readonly permissionsService: SpacePermissionsService) {}

  @Get(':id/views/:viewId/shares')
  @RequireOrgRole('viewer')
  async listViewShares(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceViewIdParamSchema)) params: SpaceViewIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    const effectiveLevel = await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'view',
      scope.orgId,
    )
    const shares = await this.permissionsService.listSpaceViewShares(
      supabase,
      params.id,
      params.viewId,
      scope.orgId,
    )
    return { effective_level: effectiveLevel, shares }
  }

  @Post(':id/views/:viewId/shares')
  @RequireOrgRole('admin')
  async upsertViewShare(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceViewIdParamSchema)) params: SpaceViewIdParam,
    @Body(new ZodValidationPipe(UpsertSpaceViewShareSchema)) body: UpsertSpaceViewShareDto,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'admin',
      scope.orgId,
    )
    return this.permissionsService.upsertSpaceViewShare(
      supabase,
      user.id,
      params.id,
      params.viewId,
      body,
      scope.orgId,
    )
  }

  @Delete(':id/views/:viewId/shares/:shareId')
  @RequireOrgRole('admin')
  async deleteViewShare(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceViewIdParamSchema)) params: SpaceViewIdParam,
    @Param(new ZodValidationPipe(SpaceShareIdParamSchema)) shareParams: SpaceShareIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'admin',
      scope.orgId,
    )
    await this.permissionsService.deleteSpaceViewShare(
      supabase,
      params.id,
      shareParams.shareId,
      scope.orgId,
    )
    return { deleted: true }
  }
}
