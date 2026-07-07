import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
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
import { CreditsGuard } from '../../billing/guards/credits.guard'
import {
  AdSetIdParamSchema,
  CanvasNodeActionSchema,
  CreateCanvasNodeSchema,
  NodeIdParamSchema,
  SaveCanvasGraphSchema,
  UpdateCanvasNodeSchema,
  type AdSetIdParam,
  type CanvasNodeActionDto,
  type CreateCanvasNodeDto,
  type NodeIdParam,
  type SaveCanvasGraphDto,
  type UpdateCanvasNodeDto,
} from '../dto'
import { CanvasNodeActionsService } from '../services/canvas-node-actions.service'
import { CanvasService } from '../services/canvas.service'

@Controller('canvas')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CanvasController {
  constructor(
    private readonly canvasService: CanvasService,
    private readonly canvasNodeActionsService: CanvasNodeActionsService,
  ) {}

  @Get('ad-sets/:adSetId')
  @RequireOrgRole('viewer')
  loadGraph(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(AdSetIdParamSchema)) params: AdSetIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.canvasService.loadCanvasGraph(supabase, params.adSetId, user.id, scope.orgId)
  }

  @Patch('ad-sets/:adSetId')
  @RequireOrgRole('editor')
  saveGraph(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(AdSetIdParamSchema)) params: AdSetIdParam,
    @Body(new ZodValidationPipe(SaveCanvasGraphSchema)) body: SaveCanvasGraphDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.canvasService.saveCanvasGraph(supabase, params.adSetId, user.id, body, scope.orgId)
  }

  @Post('nodes')
  @RequireOrgRole('editor')
  createNode(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateCanvasNodeSchema)) body: CreateCanvasNodeDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.canvasService.createNode(supabase, user.id, body, scope.orgId)
  }

  @Patch('nodes/:nodeId')
  @RequireOrgRole('editor')
  updateNode(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NodeIdParamSchema)) params: NodeIdParam,
    @Body(new ZodValidationPipe(UpdateCanvasNodeSchema)) body: UpdateCanvasNodeDto,
  ) {
    return this.canvasService.updateNode(supabase, params.nodeId, user.id, body)
  }

  @Delete('nodes/:nodeId')
  @RequireOrgRole('editor')
  deleteNode(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NodeIdParamSchema)) params: NodeIdParam,
  ) {
    return this.canvasService.deleteNode(supabase, params.nodeId, user.id)
  }

  @Post('nodes/:nodeId/promote')
  @RequireOrgRole('editor')
  promoteNode(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NodeIdParamSchema)) params: NodeIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.canvasService.promoteNodeToAd(supabase, params.nodeId, user.id, scope.orgId)
  }

  @Post('nodes/:nodeId/generate')
  @UseGuards(CreditsGuard)
  @RequireOrgRole('editor')
  generateNode(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NodeIdParamSchema)) params: NodeIdParam,
    @Body(new ZodValidationPipe(CanvasNodeActionSchema)) body: CanvasNodeActionDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.canvasNodeActionsService.runGenerate(
      supabase,
      params.nodeId,
      user.id,
      { ...body, model: body.model ?? body.model_id },
      scope.orgId,
    )
  }

  @Post('nodes/:nodeId/edit')
  @UseGuards(CreditsGuard)
  @RequireOrgRole('editor')
  editNode(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NodeIdParamSchema)) params: NodeIdParam,
    @Body(new ZodValidationPipe(CanvasNodeActionSchema)) body: CanvasNodeActionDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.canvasNodeActionsService.runEdit(
      supabase,
      params.nodeId,
      user.id,
      { ...body, model: body.model ?? body.model_id },
      scope.orgId,
    )
  }

  @Post('nodes/:nodeId/variation')
  @UseGuards(CreditsGuard)
  @RequireOrgRole('editor')
  variationNode(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NodeIdParamSchema)) params: NodeIdParam,
    @Body(new ZodValidationPipe(CanvasNodeActionSchema)) body: CanvasNodeActionDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.canvasNodeActionsService.runVariation(
      supabase,
      params.nodeId,
      user.id,
      { ...body, model: body.model ?? body.model_id },
      scope.orgId,
    )
  }
}
