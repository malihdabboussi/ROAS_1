import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
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
  DuplicateSpaceItemSchema,
  InvokeTaskAgentBodySchema,
  PushToAgentBodySchema,
  SpaceIdParamSchema,
  SpaceItemIdParamSchema,
  TransferSpaceItemSchema,
  VisualizeDocBodySchema,
  type DuplicateSpaceItemDto,
  type InvokeTaskAgentBody,
  type PushToAgentBody,
  type SpaceIdParam,
  type SpaceItemIdParam,
  type TransferSpaceItemDto,
  type VisualizeDocBody,
} from '../dto'
import { SpacesService } from '../services/spaces.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceItemActionsController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post(':id/items/:itemId/transfer-to-space')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async transferItemToSpace(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @Body(new ZodValidationPipe(TransferSpaceItemSchema)) body: TransferSpaceItemDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.transferItemToSpace(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      body.target_space_id,
      body.mode,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/items/:itemId/duplicate')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async duplicateItem(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @Body(new ZodValidationPipe(DuplicateSpaceItemSchema)) body: DuplicateSpaceItemDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.duplicateItem(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/items/:itemId/push-to-agent')
  @RequireOrgRole('editor')
  async pushToAgent(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(PushToAgentBodySchema)) body: PushToAgentBody,
  ) {
    return this.spacesService.pushToAgent(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      scope.orgId,
      body,
      scope.orgRole,
    )
  }

  @Post(':id/items/:itemId/invoke-agent')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.ACCEPTED)
  async invokeTaskAgent(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(InvokeTaskAgentBodySchema)) body: InvokeTaskAgentBody,
  ) {
    return this.spacesService.invokeAgentOnTask(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/items/:itemId/visualize-doc')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async visualizeDoc(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(VisualizeDocBodySchema)) body: VisualizeDocBody,
  ) {
    return this.spacesService.visualizeDocItem(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/items/:itemId/accept-suggestion')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async acceptSuggestion(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.acceptSuggestion(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/items/:itemId/dismiss-suggestion')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async dismissSuggestion(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(SpaceItemIdParamSchema)) itemParams: SpaceItemIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.dismissSuggestion(
      supabase,
      user.id,
      params.id,
      itemParams.itemId,
      scope.orgId,
      scope.orgRole,
    )
  }
}
