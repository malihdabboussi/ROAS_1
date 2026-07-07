import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
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
import { SpaceIdParamSchema, SpaceItemIdParamSchema } from '../dto'
import type { SpaceIdParam, SpaceItemIdParam } from '../dto'
import { SpacesService } from '../services/spaces.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceItemAgentActionsController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post(':id/items/:itemId/cancel-agent')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.ACCEPTED)
  async cancelTaskAgent(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.cancelAgentOnTask(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      scope.orgId,
      scope.orgRole,
    )
  }
}
