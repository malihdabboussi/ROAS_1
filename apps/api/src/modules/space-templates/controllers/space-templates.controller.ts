import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
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
  InstantiateTemplateSchema,
  TemplateSlugParamSchema,
  type InstantiateTemplateDto,
  type TemplateSlugParam,
} from '../dto'
import { SpaceTemplatesService } from '../services/space-templates.service'

@Controller('space-templates')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceTemplatesController {
  constructor(private readonly service: SpaceTemplatesService) {}

  @Get()
  @RequireOrgRole('viewer')
  list(@Supabase() supabase: SupabaseClient) {
    return this.service.list(supabase)
  }

  @Get(':slug')
  @RequireOrgRole('viewer')
  get(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(TemplateSlugParamSchema)) params: TemplateSlugParam,
  ) {
    return this.service.get(supabase, params.slug)
  }

  @Post(':slug/instantiate')
  @RequireOrgRole('editor')
  instantiate(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(TemplateSlugParamSchema)) params: TemplateSlugParam,
    @Body(new ZodValidationPipe(InstantiateTemplateSchema)) body: InstantiateTemplateDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.instantiate(
      supabase,
      { ...scope, userId: scope.userId ?? user.id },
      params.slug,
      body,
    )
  }
}
