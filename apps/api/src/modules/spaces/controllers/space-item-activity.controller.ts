import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
  CreateItemActivitySchema,
  SpaceIdParamSchema,
  SpaceItemActivityIdParamSchema,
  SpaceItemIdParamSchema,
  UpdateItemActivityCommentSchema,
  type CreateItemActivityDto,
  type SpaceIdParam,
  type SpaceItemActivityIdParam,
  type SpaceItemIdParam,
  type UpdateItemActivityCommentDto,
} from '../dto'
import { SpacesService } from '../services/spaces.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceItemActivityController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get(':id/items/:itemId/activity')
  @RequireOrgRole('viewer')
  async listActivity(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.listActivity(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      scope.orgId,
    )
  }

  @Post(':id/items/:itemId/activity')
  @RequireOrgRole('editor')
  async createActivity(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @Body(new ZodValidationPipe(CreateItemActivitySchema)) body: CreateItemActivityDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.addComment(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Patch(':id/items/:itemId/activity/:activityId')
  @RequireOrgRole('editor')
  async updateActivityComment(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemActivityIdParamSchema))
    itemParams: SpaceItemActivityIdParam,
    @Body(new ZodValidationPipe(UpdateItemActivityCommentSchema))
    body: UpdateItemActivityCommentDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.updateComment(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      itemParams.activityId,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Delete(':id/items/:itemId/activity/:activityId')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteActivityComment(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemActivityIdParamSchema))
    itemParams: SpaceItemActivityIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    await this.spacesService.deleteComment(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      itemParams.activityId,
      scope.orgId,
      scope.orgRole,
    )
  }
}
