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
  UndoWhiteboardOperationSchema,
  WhiteboardCampaignParamSchema,
  type ApplyWhiteboardOperationsDto,
  type UndoWhiteboardOperationDto,
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
