import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
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
  SlackAttachSenderDtoSchema,
  SlackBrainAutoIngestDtoSchema,
  SlackBrainMappingCreateDtoSchema,
  SlackBrainMappingIdParamSchema,
  SlackBrainMappingUpdateDtoSchema,
  type SlackAttachSenderDto,
  type SlackBrainAutoIngestDto,
  type SlackBrainMappingCreateDto,
  type SlackBrainMappingIdParam,
  type SlackBrainMappingUpdateDto,
} from '../dto/slack.dto'
import { SlackBrainMappingService } from '../services/slack-brain-mapping.service'

@Controller('integrations/slack/brain-mappings')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SlackBrainMappingController {
  constructor(private readonly mappings: SlackBrainMappingService) {}

  @Get()
  async list(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.mappings.listMappings(supabase, user.id, scope.orgId)
  }

  @Post()
  async create(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackBrainMappingCreateDtoSchema))
    body: SlackBrainMappingCreateDto,
  ) {
    return this.mappings.createMapping(supabase, user.id, body, scope.orgId)
  }

  @Patch(':id')
  async update(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackBrainMappingIdParamSchema))
    params: SlackBrainMappingIdParam,
    @Body(new ZodValidationPipe(SlackBrainMappingUpdateDtoSchema))
    body: SlackBrainMappingUpdateDto,
  ) {
    return this.mappings.updateMapping(supabase, user.id, params.id, body, scope.orgId)
  }

  @Delete(':id')
  async delete(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackBrainMappingIdParamSchema))
    params: SlackBrainMappingIdParam,
  ) {
    return this.mappings.deleteMapping(supabase, user.id, params.id, scope.orgId)
  }

  @Post(':id/sync-now')
  async syncNow(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackBrainMappingIdParamSchema))
    params: SlackBrainMappingIdParam,
  ) {
    return this.mappings.syncNow(supabase, user.id, params.id, scope.orgId)
  }

  @Get('sender-resolution')
  async senderResolution(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.mappings.listSenderResolution(supabase, user.id, scope.orgId)
  }

  @Post('sender-resolution/attach')
  async attachSender(
    @Supabase() supabase: SupabaseClient,
    @Body(new ZodValidationPipe(SlackAttachSenderDtoSchema)) body: SlackAttachSenderDto,
  ) {
    return this.mappings.attachSenderToContact(supabase, {
      contactId: body.contact_id,
      slackUserId: body.slack_user_id,
    })
  }
}

@Controller('integrations/slack/settings')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SlackBrainSettingsController {
  constructor(private readonly mappings: SlackBrainMappingService) {}

  @Post('auto-ingest')
  async setAutoIngest(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackBrainAutoIngestDtoSchema)) body: SlackBrainAutoIngestDto,
  ) {
    return this.mappings.setAutoIngest(supabase, user.id, scope.orgId, body.autoIngest)
  }
}
