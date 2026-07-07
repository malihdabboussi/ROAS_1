import { randomUUID } from 'node:crypto'
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
  SpaceIdParamSchema,
  SpaceItemIdParamSchema,
  SpaceShareIdParamSchema,
  UpsertSpaceItemShareSchema,
  type SpaceIdParam,
  type SpaceItemIdParam,
  type SpaceShareIdParam,
  type UpsertSpaceItemShareDto,
} from '../dto'
import { SpacePermissionsService } from '../services/space-permissions.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceItemSharingController {
  constructor(private readonly permissionsService: SpacePermissionsService) {}

  @Get(':id/items/:itemId/shares')
  @RequireOrgRole('viewer')
  async listItemShares(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    const effectiveLevel = await this.permissionsService.assertCanAccessItem(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      itemParams.itemId,
      'view',
      scope.orgId,
    )
    const shares = await this.permissionsService.listItemShares(
      supabase,
      params.id,
      itemParams.itemId,
      scope.orgId,
    )
    return { effective_level: effectiveLevel, shares }
  }

  @Post(':id/items/:itemId/shares')
  @RequireOrgRole('admin')
  async upsertItemShare(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @Body(new ZodValidationPipe(UpsertSpaceItemShareSchema)) body: UpsertSpaceItemShareDto,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessItem(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      itemParams.itemId,
      'admin',
      scope.orgId,
    )
    const share = await this.permissionsService.upsertItemShare(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      body,
      scope.orgId,
    )
    return share
  }

  @Delete(':id/items/:itemId/shares/:shareId')
  @RequireOrgRole('admin')
  async deleteItemShare(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @Param(new ZodValidationPipe(SpaceShareIdParamSchema)) shareParams: SpaceShareIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessItem(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      itemParams.itemId,
      'admin',
      scope.orgId,
    )
    await this.permissionsService.deleteItemShare(
      supabase,
      params.id,
      itemParams.itemId,
      shareParams.shareId,
      scope.orgId,
    )
    return { deleted: true }
  }

  @Post(':id/items/:itemId/share-link')
  @RequireOrgRole('editor')
  async enableItemShareLink(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessItem(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      itemParams.itemId,
      'admin',
      scope.orgId,
    )
    return this.permissionsService.enableItemShareLink(
      supabase,
      params.id,
      itemParams.itemId,
      randomUUID(),
      scope.orgId,
    )
  }

  @Delete(':id/items/:itemId/share-link')
  @RequireOrgRole('editor')
  async disableItemShareLink(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessItem(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      itemParams.itemId,
      'admin',
      scope.orgId,
    )
    return this.permissionsService.disableItemShareLink(
      supabase,
      params.id,
      itemParams.itemId,
      scope.orgId,
    )
  }
}
