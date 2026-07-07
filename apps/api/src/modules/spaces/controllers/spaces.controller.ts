import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
  CreateSpaceSchema,
  EnsureSpaceViewSchema,
  SpaceIdParamSchema,
  SpaceQuerySchema,
  UpdateSpaceSchema,
  type CreateSpaceDto,
  type EnsureSpaceViewDto,
  type SpaceIdParam,
  type SpaceQuery,
  type UpdateSpaceDto,
} from '../dto'
import { OrgAutomationFlowsService } from '../services/org-automation-flows.service'
import { SpacesService } from '../services/spaces.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly orgFlowsService: OrgAutomationFlowsService,
  ) {}

  @Get()
  @RequireOrgRole('viewer')
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query(new ZodValidationPipe(SpaceQuerySchema)) query: SpaceQuery,
    @OrgContext() scope: RequestScope,
  ) {
    if (query.paginated || query.cursor) {
      return this.spacesService.listPage(supabase, user.id, query, scope.orgId)
    }
    return this.spacesService.list(supabase, user.id, query, scope.orgId)
  }

  @Post()
  @RequireOrgRole('editor')
  async create(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body(new ZodValidationPipe(CreateSpaceSchema)) body: CreateSpaceDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.create(supabase, user.id, body, scope.orgId)
  }

  @Post('ensure-default')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async ensureDefault(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.ensureDefault(supabase, user.id, scope.orgId)
  }

  @Post('ensure-general')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async ensureGeneral(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.ensureGeneral(supabase, user.id, scope.orgId)
  }

  @Post('ensure-flows-concept')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async ensureFlowsConcept(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    if (!scope.orgId) {
      throw new ForbiddenException('Only available in org context')
    }
    return this.orgFlowsService.ensureConceptSpace(supabase, scope.orgId, user.id)
  }

  @Post('ensure-view')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async ensureView(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body(new ZodValidationPipe(EnsureSpaceViewSchema)) body: EnsureSpaceViewDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.ensureView(supabase, user.id, body, scope.orgId, scope.orgRole)
  }

  @Get(':id')
  @RequireOrgRole('viewer')
  async getById(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.getById(supabase, user.id, params.id, scope.orgId, scope.orgRole)
  }

  @Patch(':id')
  @RequireOrgRole('editor')
  async update(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(UpdateSpaceSchema)) body: UpdateSpaceDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.update(supabase, user.id, params.id, body, scope.orgId, scope.orgRole)
  }

  @Delete(':id')
  @RequireOrgRole('editor')
  async delete(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.delete(supabase, user.id, params.id, scope.orgId, scope.orgRole)
  }
}
