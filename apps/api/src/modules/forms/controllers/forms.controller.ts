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
  CreateFormSchema,
  FormIdParamSchema,
  UpdateFormSchema,
  type CreateFormDto,
  type FormIdParam,
  type UpdateFormDto,
} from '../dto'
import { FormsService } from '../services/forms.service'

@Controller('forms')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  @RequireOrgRole('viewer')
  async list(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('campaign_id') campaignId: string,
    @Query('space_id') spaceId?: string,
  ) {
    return this.formsService.listForms(supabase, campaignId, scope.orgId, {
      spaceId: spaceId ?? undefined,
    })
  }

  @Get('aggregates')
  @RequireOrgRole('viewer')
  async aggregates(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('campaign_id') campaignId: string,
    @Query('space_id') spaceId?: string,
  ) {
    return this.formsService.listAggregates(supabase, campaignId, scope.orgId, {
      spaceId: spaceId ?? undefined,
    })
  }

  @Get(':id')
  @RequireOrgRole('viewer')
  async get(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(FormIdParamSchema)) params: FormIdParam,
  ) {
    return this.formsService.getForm(supabase, params.id, scope.orgId)
  }

  @Post()
  @RequireOrgRole('creator')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(CreateFormSchema)) body: CreateFormDto,
  ) {
    return this.formsService.createForm(supabase, user.id, body, scope.orgId)
  }

  @Patch(':id')
  @RequireOrgRole('editor')
  async update(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(FormIdParamSchema)) params: FormIdParam,
    @Body(new ZodValidationPipe(UpdateFormSchema)) body: UpdateFormDto,
  ) {
    return this.formsService.updateForm(supabase, params.id, body, scope.orgId)
  }

  @Delete(':id')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(FormIdParamSchema)) params: FormIdParam,
  ) {
    await this.formsService.deleteForm(supabase, params.id, scope.orgId)
  }

  @Post(':id/publish')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(FormIdParamSchema)) params: FormIdParam,
  ) {
    return this.formsService.publishForm(supabase, params.id, scope.orgId)
  }

  @Post(':id/unpublish')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(FormIdParamSchema)) params: FormIdParam,
  ) {
    return this.formsService.unpublishForm(supabase, params.id, scope.orgId)
  }

  @Get(':id/responses')
  @RequireOrgRole('viewer')
  async responses(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(FormIdParamSchema)) params: FormIdParam,
  ) {
    return this.formsService.listResponses(supabase, params.id, scope.orgId)
  }
}
