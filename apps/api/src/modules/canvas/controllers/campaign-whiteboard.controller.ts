import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
} from '@vibey/api-shared'
import {
  ApplyWhiteboardOperationsSchema,
  CreateWhiteboardSchema,
  UndoWhiteboardOperationSchema,
  WhiteboardBoardParamSchema,
  WhiteboardCampaignParamSchema,
  type ApplyWhiteboardOperationsDto,
  type CreateWhiteboardDto,
  type UndoWhiteboardOperationDto,
  type WhiteboardBoardParam,
  type WhiteboardCampaignParam,
} from '../dto'
import { WhiteboardService } from '../services/whiteboard.service'

@Controller('canvas/campaigns')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CampaignWhiteboardController {
  constructor(private readonly whiteboardService: WhiteboardService) {}

  @Get(':campaignId/whiteboard')
  @RequireOrgRole('viewer')
  loadWhiteboard(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(WhiteboardCampaignParamSchema)) params: WhiteboardCampaignParam,
  ) {
    return this.whiteboardService.load(supabase, params.campaignId, user.id)
  }

  @Get(':campaignId/whiteboards')
  @RequireOrgRole('viewer')
  listWhiteboards(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(WhiteboardCampaignParamSchema)) params: WhiteboardCampaignParam,
  ) {
    return this.whiteboardService.list(supabase, params.campaignId, user.id)
  }

  @Post(':campaignId/whiteboards')
  @RequireOrgRole('editor')
  createWhiteboard(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(WhiteboardCampaignParamSchema)) params: WhiteboardCampaignParam,
    @Body(new ZodValidationPipe(CreateWhiteboardSchema)) body: CreateWhiteboardDto,
  ) {
    return this.whiteboardService.create(supabase, params.campaignId, user.id, body.title)
  }

  @Get(':campaignId/whiteboards/:boardId')
  @RequireOrgRole('viewer')
  loadNamedWhiteboard(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(WhiteboardBoardParamSchema)) params: WhiteboardBoardParam,
  ) {
    return this.whiteboardService.loadBoard(supabase, params.campaignId, params.boardId)
  }

  @Post(':campaignId/whiteboards/:boardId/operations')
  @RequireOrgRole('editor')
  applyNamedWhiteboardOperations(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(WhiteboardBoardParamSchema)) params: WhiteboardBoardParam,
    @Body(new ZodValidationPipe(ApplyWhiteboardOperationsSchema))
    body: ApplyWhiteboardOperationsDto,
  ) {
    return this.whiteboardService.applyBoardOperations(
      supabase,
      params.campaignId,
      params.boardId,
      user.id,
      body,
    )
  }

  @Post(':campaignId/whiteboards/:boardId/undo')
  @RequireOrgRole('editor')
  undoNamedWhiteboardOperation(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(WhiteboardBoardParamSchema)) params: WhiteboardBoardParam,
    @Body(new ZodValidationPipe(UndoWhiteboardOperationSchema)) body: UndoWhiteboardOperationDto,
  ) {
    return this.whiteboardService.undoBoardOperation(
      supabase,
      params.campaignId,
      params.boardId,
      user.id,
      body.operation_id,
    )
  }

  @Post(':campaignId/whiteboard/operations')
  @RequireOrgRole('editor')
  applyWhiteboardOperations(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(WhiteboardCampaignParamSchema)) params: WhiteboardCampaignParam,
    @Body(new ZodValidationPipe(ApplyWhiteboardOperationsSchema))
    body: ApplyWhiteboardOperationsDto,
  ) {
    return this.whiteboardService.applyOperations(supabase, params.campaignId, user.id, body)
  }

  @Post(':campaignId/whiteboard/undo')
  @RequireOrgRole('editor')
  undoWhiteboardOperation(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(WhiteboardCampaignParamSchema)) params: WhiteboardCampaignParam,
    @Body(new ZodValidationPipe(UndoWhiteboardOperationSchema)) body: UndoWhiteboardOperationDto,
  ) {
    return this.whiteboardService.undoOperation(
      supabase,
      params.campaignId,
      user.id,
      body.operation_id,
    )
  }
}
