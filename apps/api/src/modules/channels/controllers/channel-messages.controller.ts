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
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  ChannelIdParamSchema,
  ChannelMessageParamSchema,
  EditChannelMessageSchema,
  ListChannelMessagesQuerySchema,
  PatchChannelMessageMetadataSchema,
  PinChannelMessageSchema,
  RenameThreadSchema,
  RetryAgentSchema,
  SendChannelMessageSchema,
  StartBrainstormSchema,
  type ChannelIdParam,
  type ChannelMessageParam,
  type EditChannelMessageInput,
  type ListChannelMessagesQuery,
  type PatchChannelMessageMetadataInput,
  type PinChannelMessageInput,
  type RenameThreadInput,
  type RetryAgentInput,
  type SendChannelMessageInput,
  type StartBrainstormInput,
} from '../dto'
import { ChannelsService } from '../services/channels.service'

@Controller('channels')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class ChannelMessagesController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':id/messages')
  async listMessages(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
    @Query(new ZodValidationPipe(ListChannelMessagesQuerySchema)) query: ListChannelMessagesQuery,
  ) {
    return this.channelsService.listMessages(supabase, scope, params.id, query.limit, query.before)
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
    @Body(new ZodValidationPipe(SendChannelMessageSchema)) body: SendChannelMessageInput,
  ) {
    return this.channelsService.sendMessage(supabase, scope, params.id, body)
  }

  @Patch(':id/messages/:messageId/pin')
  async togglePinMessage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelMessageParamSchema)) params: ChannelMessageParam,
    @Body(new ZodValidationPipe(PinChannelMessageSchema)) body: PinChannelMessageInput,
  ) {
    return this.channelsService.pinMessage(supabase, scope, params.id, params.messageId, body)
  }

  @Patch(':id/messages/:messageId')
  async editChannelMessage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelMessageParamSchema)) params: ChannelMessageParam,
    @Body(new ZodValidationPipe(EditChannelMessageSchema)) body: EditChannelMessageInput,
  ) {
    return this.channelsService.editMessage(supabase, scope, params.id, params.messageId, body)
  }

  @Patch(':id/messages/:messageId/metadata')
  async patchMessageMetadata(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelMessageParamSchema)) params: ChannelMessageParam,
    @Body(new ZodValidationPipe(PatchChannelMessageMetadataSchema))
    body: PatchChannelMessageMetadataInput,
  ) {
    return this.channelsService.patchMessageMetadata(
      supabase,
      scope,
      params.id,
      params.messageId,
      body,
    )
  }

  @Patch(':id/messages/:messageId/rename')
  async renameThread(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelMessageParamSchema)) params: ChannelMessageParam,
    @Body(new ZodValidationPipe(RenameThreadSchema)) body: RenameThreadInput,
  ) {
    return this.channelsService.renameThread(supabase, scope, params.id, params.messageId, body)
  }

  @Post(':id/messages/:messageId/retry-agent')
  @HttpCode(HttpStatus.ACCEPTED)
  async retryAgent(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelMessageParamSchema)) params: ChannelMessageParam,
    @Body(new ZodValidationPipe(RetryAgentSchema)) body: RetryAgentInput,
  ) {
    return this.channelsService.retryAgentInvocation(
      supabase,
      scope,
      params.id,
      params.messageId,
      body.agent_key,
    )
  }

  @Post(':id/brainstorm')
  @HttpCode(HttpStatus.CREATED)
  async startBrainstorm(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
    @Body(new ZodValidationPipe(StartBrainstormSchema)) body: StartBrainstormInput,
  ) {
    return this.channelsService.startBrainstorm(supabase, scope, params.id, body)
  }

  @Delete(':id/messages/:messageId')
  async deleteMessage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelMessageParamSchema)) params: ChannelMessageParam,
  ) {
    return this.channelsService.deleteMessage(supabase, scope, params.id, params.messageId)
  }
}
