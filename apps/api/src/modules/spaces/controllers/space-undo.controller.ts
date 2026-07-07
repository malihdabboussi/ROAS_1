import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
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
  UndoAgentTaskEditsSchema,
  type SpaceIdParam,
  type UndoAgentTaskEditsDto,
} from '../dto'
import { SpacesUndoService } from '../services/spaces-undo.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceUndoController {
  constructor(private readonly undoService: SpacesUndoService) {}

  @Post(':id/items/undo')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async undoAgentTaskEdits(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(UndoAgentTaskEditsSchema)) body: UndoAgentTaskEditsDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.undoService.undoAgentTaskEdits(
      supabase,
      user.id,
      params.id,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }
}
