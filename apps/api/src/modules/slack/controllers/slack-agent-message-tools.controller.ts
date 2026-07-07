import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
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
  SlackChannelHistoryQuerySchema,
  SlackDeleteMessageDtoSchema,
  SlackFileInfoQuerySchema,
  SlackOpenDmDtoSchema,
  SlackReactionDtoSchema,
  SlackSendMessageDtoSchema,
  SlackThreadRepliesQuerySchema,
  SlackUpdateMessageDtoSchema,
  SlackUploadFileDtoSchema,
  type SlackChannelHistoryQuery,
  type SlackDeleteMessageDto,
  type SlackFileInfoQuery,
  type SlackOpenDmDto,
  type SlackReactionDto,
  type SlackSendMessageDto,
  type SlackThreadRepliesQuery,
  type SlackUpdateMessageDto,
  type SlackUploadFileDto,
} from '../dto/slack.dto'
import { SlackAgentToolsService } from '../services/slack-agent-tools.service'

@Controller('integrations/slack')
export class SlackAgentMessageToolsController {
  constructor(private readonly tools: SlackAgentToolsService) {}

  @Post('send-message')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async sendMessage(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackSendMessageDtoSchema)) body: SlackSendMessageDto,
  ) {
    return this.tools.sendMessage(supabase, user.id, scope.orgId, body)
  }

  @Post('update-message')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateMessage(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackUpdateMessageDtoSchema)) body: SlackUpdateMessageDto,
  ) {
    return this.tools.updateMessage(supabase, user.id, scope.orgId, body)
  }

  @Post('delete-message')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteMessage(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackDeleteMessageDtoSchema)) body: SlackDeleteMessageDto,
  ) {
    return this.tools.deleteMessage(supabase, user.id, scope.orgId, body)
  }

  @Get('channel-history')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getChannelHistory(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackChannelHistoryQuerySchema)) query: SlackChannelHistoryQuery,
  ) {
    return this.tools.getChannelHistory(supabase, user.id, scope.orgId, query)
  }

  @Get('thread-replies')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getThreadReplies(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackThreadRepliesQuerySchema)) query: SlackThreadRepliesQuery,
  ) {
    return this.tools.getThreadReplies(supabase, user.id, scope.orgId, query)
  }

  @Post('add-reaction')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async addReaction(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackReactionDtoSchema)) body: SlackReactionDto,
  ) {
    return this.tools.addReaction(supabase, user.id, scope.orgId, body)
  }

  @Post('remove-reaction')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async removeReaction(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackReactionDtoSchema)) body: SlackReactionDto,
  ) {
    return this.tools.removeReaction(supabase, user.id, scope.orgId, body)
  }

  @Post('open-dm')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async openDm(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackOpenDmDtoSchema)) body: SlackOpenDmDto,
  ) {
    return this.tools.openDm(supabase, user.id, scope.orgId, body)
  }

  @Post('upload-file')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async uploadFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SlackUploadFileDtoSchema)) body: SlackUploadFileDto,
  ) {
    return this.tools.uploadFile(supabase, user.id, scope.orgId, body)
  }

  @Get('file-info')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getFileInfo(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackFileInfoQuerySchema)) query: SlackFileInfoQuery,
  ) {
    return this.tools.getFileInfo(supabase, user.id, scope.orgId, query)
  }
}
