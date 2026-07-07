import { Body, Controller, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'
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
  InviteSpaceItemByEmailSchema,
  SpaceIdParamSchema,
  SpaceItemIdParamSchema,
  type InviteSpaceItemByEmailDto,
  type SpaceIdParam,
  type SpaceItemIdParam,
} from '../dto'
import { SpacePermissionsService } from '../services/space-permissions.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceItemSharingInvitesController {
  constructor(private readonly permissionsService: SpacePermissionsService) {}

  @Post(':id/items/:itemId/share-invite')
  @RequireOrgRole('editor')
  async inviteItemByEmail(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @Body(new ZodValidationPipe(InviteSpaceItemByEmailSchema)) body: InviteSpaceItemByEmailDto,
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

    void body
    // External email invites are paused while sharing is being re-scoped to
    // internal team/workspace access only.
    throw new NotFoundException('External sharing is paused')
  }
}
