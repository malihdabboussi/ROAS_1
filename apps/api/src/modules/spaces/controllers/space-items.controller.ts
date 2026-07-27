import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
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
  BatchUpdateSpaceItemsSchema,
  CreateSpaceItemSchema,
  SpaceIdParamSchema,
  SpaceItemIdParamSchema,
  SpaceItemQuerySchema,
  UpdateSpaceItemSchema,
  type BatchUpdateSpaceItemsDto,
  type CreateSpaceItemDto,
  type SpaceIdParam,
  type SpaceItemIdParam,
  type SpaceItemQuery,
  type UpdateSpaceItemDto,
} from '../dto'
import { SpacesService } from '../services/spaces.service'

const RemapMeetingSpeakerSchema = z.object({
  speaker_key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  email: z.string().trim().email().nullable().optional(),
  contact_id: z.string().trim().uuid().nullable().optional(),
})
type RemapMeetingSpeakerDto = z.infer<typeof RemapMeetingSpeakerSchema>

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceItemsController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get(':id/items')
  @RequireOrgRole('viewer')
  async listItems(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Query(new ZodValidationPipe(SpaceItemQuerySchema)) query: SpaceItemQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.listItems(
      supabase,
      user.id,
      params.id,
      query,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/items')
  @RequireOrgRole('editor')
  async createItem(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(CreateSpaceItemSchema)) body: CreateSpaceItemDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.createItem(
      supabase,
      user.id,
      params.id,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Get(':id/items/:itemId')
  @RequireOrgRole('viewer')
  async getItem(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.getItem(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Patch(':id/items/batch')
  @RequireOrgRole('editor')
  async updateItemsBatch(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(BatchUpdateSpaceItemsSchema)) body: BatchUpdateSpaceItemsDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.updateItemsBatch(
      supabase,
      user.id,
      params.id,
      body.updates,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Patch(':id/items/:itemId')
  @RequireOrgRole('editor')
  async updateItem(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @Body(new ZodValidationPipe(UpdateSpaceItemSchema)) body: UpdateSpaceItemDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.updateItem(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/items/:itemId/speaker-remaps')
  @RequireOrgRole('editor')
  async remapMeetingSpeaker(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @Body(new ZodValidationPipe(RemapMeetingSpeakerSchema)) body: RemapMeetingSpeakerDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.remapMeetingSpeaker(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Delete(':id/items/:itemId')
  @RequireOrgRole('editor')
  async deleteItem(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.deleteItem(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Get(':id/items/:itemId/subtasks')
  @RequireOrgRole('viewer')
  async listSubtasks(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.listSubtasks(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      scope.orgId,
    )
  }
}
