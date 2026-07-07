import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
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
  SpaceIdParamSchema,
  SpaceShareIdParamSchema,
  UpsertSpaceShareSchema,
  type SpaceIdParam,
  type SpaceShareIdParam,
  type UpsertSpaceShareDto,
} from '../dto'
import { SpacePermissionsService } from '../services/space-permissions.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceSharingController {
  constructor(private readonly permissionsService: SpacePermissionsService) {}

  @Get(':id/shares')
  @RequireOrgRole('viewer')
  async listSpaceShares(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
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
    const shares = await this.permissionsService.listSpaceShares(supabase, params.id, scope.orgId)
    return { effective_level: effectiveLevel, shares }
  }

  @Post(':id/shares')
  @RequireOrgRole('admin')
  async upsertSpaceShare(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(UpsertSpaceShareSchema)) body: UpsertSpaceShareDto,
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
    return this.permissionsService.upsertSpaceShare(supabase, user.id, params.id, body, scope.orgId)
  }

  @Delete(':id/shares/:shareId')
  @RequireOrgRole('admin')
  async deleteSpaceShare(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
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
    await this.permissionsService.deleteSpaceShare(
      supabase,
      params.id,
      shareParams.shareId,
      scope.orgId,
    )
    return { deleted: true }
  }

  @Post(':id/make-private')
  @RequireOrgRole('editor')
  async makePrivate(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
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
    const space = await this.permissionsService.setSpaceVisibility(
      supabase,
      params.id,
      'private',
      scope.orgId,
    )
    return space
  }

  @Post(':id/make-team')
  @RequireOrgRole('editor')
  async makeTeam(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
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
    const space = await this.permissionsService.setSpaceVisibility(
      supabase,
      params.id,
      'team',
      scope.orgId,
    )
    return space
  }

  @Post(':id/share-link')
  @RequireOrgRole('editor')
  async enableSpaceShareLink(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
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
    throw new NotFoundException('External sharing is paused')
  }

  @Delete(':id/share-link')
  @RequireOrgRole('editor')
  async disableSpaceShareLink(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
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
    throw new NotFoundException('External sharing is paused')
  }
}
