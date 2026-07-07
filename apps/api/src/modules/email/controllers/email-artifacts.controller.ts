import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  CampaignIdParamSchema,
  CreateCampaignEmailArtifactSchema,
  CreateEmailArtifactSchema,
  EmailIdParamSchema,
  UpdateEmailArtifactSchema,
  type CampaignIdParam,
  type CreateCampaignEmailArtifactDto,
  type CreateEmailArtifactDto,
  type EmailIdParam,
  type UpdateEmailArtifactDto,
} from '../dto/email-artifacts.dto'
import { EmailArtifactsService } from '../services/email-artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class EmailArtifactsController {
  constructor(private readonly emailArtifactsService: EmailArtifactsService) {}

  @Post('emails')
  async create(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(CreateEmailArtifactSchema)) body: CreateEmailArtifactDto,
  ) {
    return this.emailArtifactsService.create(supabase, user.id, scope.orgId ?? null, body)
  }

  @Get('campaigns/:campaignId/emails')
  async listByCampaign(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(CampaignIdParamSchema)) params: CampaignIdParam,
    @Query('space_id') spaceId?: string,
  ) {
    return this.emailArtifactsService.listByCampaign(supabase, params.campaignId, spaceId)
  }

  @Post('campaigns/:campaignId/emails')
  async createForCampaign(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(CampaignIdParamSchema)) params: CampaignIdParam,
    @Body(new ZodValidationPipe(CreateCampaignEmailArtifactSchema))
    body: CreateCampaignEmailArtifactDto,
  ) {
    return this.emailArtifactsService.createForCampaign(
      supabase,
      user.id,
      params.campaignId,
      body,
      scope.orgId ?? null,
    )
  }

  @Get('emails/:id')
  async get(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(EmailIdParamSchema)) params: EmailIdParam,
  ) {
    return this.emailArtifactsService.getById(supabase, params.id)
  }

  @Patch('emails/:id')
  async update(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(EmailIdParamSchema)) params: EmailIdParam,
    @Body(new ZodValidationPipe(UpdateEmailArtifactSchema)) body: UpdateEmailArtifactDto,
  ) {
    return this.emailArtifactsService.update(supabase, params.id, body)
  }

  @Delete('emails/:id')
  async delete(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(EmailIdParamSchema)) params: EmailIdParam,
  ) {
    return this.emailArtifactsService.delete(supabase, params.id)
  }
}
