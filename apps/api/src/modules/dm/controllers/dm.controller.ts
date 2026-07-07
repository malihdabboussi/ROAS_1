import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  EditDmMessageSchema,
  ListDmMessagesQuerySchema,
  OpenDmSchema,
  SendDmMessageSchema,
  type EditDmMessageInput,
  type ListDmMessagesQueryInput,
  type OpenDmInput,
  type SendDmMessageInput,
} from '../dto'
import { DmService } from '../services/dm.service'

@Controller('dm')
@UseGuards(AuthGuard, OrgContextGuard)
export class DmController {
  constructor(private readonly dmService: DmService) {}

  @Post('open')
  @HttpCode(HttpStatus.OK)
  async openDm(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(OpenDmSchema)) body: OpenDmInput,
  ) {
    return this.dmService.openDm(supabase, scope, body.target_user_id)
  }

  @Get('list')
  async listDms(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    const dms = await this.dmService.listDms(supabase, scope)
    return { dms }
  }

  @Get('unread-counts')
  async getUnreadCounts(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.dmService.getUnreadCounts(supabase, scope)
  }

  @Get(':id/messages')
  async listMessages(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Query(new ZodValidationPipe(ListDmMessagesQuerySchema)) query: ListDmMessagesQueryInput,
  ) {
    const messages = await this.dmService.listMessages(supabase, scope, conversationId, query)
    return { messages }
  }

  @Post(':id/messages')
  async sendMessage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Body(new ZodValidationPipe(SendDmMessageSchema)) body: SendDmMessageInput,
  ) {
    const message = await this.dmService.sendMessage(supabase, scope, conversationId, body)
    return { message }
  }

  @Patch(':id/messages/:messageId')
  async editMessage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body(new ZodValidationPipe(EditDmMessageSchema)) body: EditDmMessageInput,
  ) {
    const message = await this.dmService.editMessage(
      supabase,
      scope,
      conversationId,
      messageId,
      body.content,
    )
    return { message }
  }

  @Delete(':id/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    await this.dmService.deleteMessage(supabase, scope, conversationId, messageId)
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
  ) {
    await this.dmService.markRead(supabase, scope, conversationId)
  }
}
