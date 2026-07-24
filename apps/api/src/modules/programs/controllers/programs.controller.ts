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
  CreateProgramSchema,
  ProgramIdParamSchema,
  UpdateProgramSchema,
  type CreateProgramInput,
  type ProgramIdParam,
  type UpdateProgramInput,
} from '../dto/programs.dto'
import { ProgramsService } from '../services/programs.service'

@Controller('programs')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.programsService.list(supabase, user.id, scope.orgRole, scope.orgId)
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ProgramIdParamSchema)) params: ProgramIdParam,
  ) {
    return this.programsService.getById(supabase, params.id, user.id, scope.orgRole, scope.orgId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRole('creator')
  async create(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(CreateProgramSchema)) body: CreateProgramInput,
  ) {
    return this.programsService.create(supabase, user.id, body, scope.orgId)
  }

  @Patch(':id')
  @RequireOrgRole('editor')
  async update(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ProgramIdParamSchema)) params: ProgramIdParam,
    @Body(new ZodValidationPipe(UpdateProgramSchema)) body: UpdateProgramInput,
  ) {
    return this.programsService.update(
      supabase,
      params.id,
      body,
      user.id,
      scope.orgRole,
      scope.orgId,
    )
  }

  @Delete(':id')
  @RequireOrgRole('editor')
  async delete(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ProgramIdParamSchema)) params: ProgramIdParam,
  ) {
    return this.programsService.delete(supabase, params.id, user.id, scope.orgRole, scope.orgId)
  }
}
