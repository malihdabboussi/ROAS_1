import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
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
  RecentAutomationRunsQuerySchema,
  SpaceIdParamSchema,
  SpaceItemIdParamSchema,
  type RecentAutomationRunsQuery,
  type SpaceIdParam,
  type SpaceItemIdParam,
} from '../dto'
import { SpacesService } from '../services/spaces.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpacesStateController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get('recent-automation-runs')
  @RequireOrgRole('viewer')
  async recentAutomationRuns(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(RecentAutomationRunsQuerySchema)) query: RecentAutomationRunsQuery,
  ) {
    return this.spacesService.listRecentCompletedAutomationRuns(
      supabase,
      query,
      scope.orgId,
      user.id,
    )
  }

  @Get('user-state')
  @RequireOrgRole('viewer')
  async listUserState(@CurrentUser() user: { id: string }, @Supabase() supabase: SupabaseClient) {
    return this.spacesService.listUserState(supabase, user.id)
  }

  @Get('items/:itemId')
  @RequireOrgRole('viewer')
  async getItemById(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.getItemById(
      supabase,
      user.id,
      itemParams.itemId,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Patch(':id/user-state')
  @RequireOrgRole('viewer')
  async updateUserState(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body() body: { is_favorite?: boolean; is_hidden?: boolean },
  ) {
    return this.spacesService.upsertUserState(supabase, user.id, params.id, body)
  }
}
