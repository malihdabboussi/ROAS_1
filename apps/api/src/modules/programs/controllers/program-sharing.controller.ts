import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
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
  ProgramIdParamSchema,
  ProgramShareIdParamSchema,
  UpsertProgramShareSchema,
  type ProgramIdParam,
  type ProgramShareIdParam,
  type UpsertProgramShareInput,
} from '../dto/programs.dto'
import { ProgramPermissionsService } from '../services/program-permissions.service'
import { ProgramsService } from '../services/programs.service'

@Controller('programs')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class ProgramSharingController {
  constructor(
    private readonly programsService: ProgramsService,
    private readonly programPermissions: ProgramPermissionsService,
  ) {}

  @Get(':id/shares')
  @RequireOrgRole('viewer')
  async listShares(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ProgramIdParamSchema)) params: ProgramIdParam,
  ) {
    const effectiveLevel = await this.programPermissions.assertProgramAccess(
      supabase,
      params.id,
      user.id,
      scope.orgRole,
      'view',
      scope.orgId,
    )
    const program = await this.programsService.getById(
      supabase,
      params.id,
      user.id,
      scope.orgRole,
      scope.orgId,
    )
    const shares = await this.programPermissions.listShares(supabase, params.id, scope.orgId)
    return {
      effective_level: effectiveLevel,
      visibility: program.visibility,
      created_by: program.created_by,
      can_manage_shares: this.programPermissions.canManageShares(
        program,
        user.id,
        scope.orgRole,
        effectiveLevel,
      ),
      shares,
    }
  }

  @Post(':id/shares')
  @RequireOrgRole('editor')
  async upsertShare(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ProgramIdParamSchema)) params: ProgramIdParam,
    @Body(new ZodValidationPipe(UpsertProgramShareSchema)) body: UpsertProgramShareInput,
  ) {
    const effectiveLevel = await this.programPermissions.assertProgramAccess(
      supabase,
      params.id,
      user.id,
      scope.orgRole,
      'edit',
      scope.orgId,
    )
    const program = await this.programsService.getById(
      supabase,
      params.id,
      user.id,
      scope.orgRole,
      scope.orgId,
    )
    if (!this.programPermissions.canManageShares(program, user.id, scope.orgRole, effectiveLevel)) {
      throw new ForbiddenException('Insufficient permissions to manage program shares')
    }
    return this.programPermissions.upsertShare(supabase, user.id, params.id, body, scope.orgId)
  }

  @Delete(':id/shares/:shareId')
  @RequireOrgRole('editor')
  async deleteShare(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ProgramShareIdParamSchema)) params: ProgramShareIdParam,
  ) {
    const effectiveLevel = await this.programPermissions.assertProgramAccess(
      supabase,
      params.id,
      user.id,
      scope.orgRole,
      'edit',
      scope.orgId,
    )
    const program = await this.programsService.getById(
      supabase,
      params.id,
      user.id,
      scope.orgRole,
      scope.orgId,
    )
    if (!this.programPermissions.canManageShares(program, user.id, scope.orgRole, effectiveLevel)) {
      throw new ForbiddenException('Insufficient permissions to manage program shares')
    }
    await this.programPermissions.deleteShare(supabase, params.id, params.shareId, scope.orgId)
    return { deleted: true }
  }
}
