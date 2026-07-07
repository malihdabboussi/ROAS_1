import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { ConversationsService } from '../services/conversations.service'

@Controller('conversations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class ConversationMessagesController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get(':id/messages')
  async getMessages(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') conversationId: string,
    @Query('before') before?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined
    const safeLimit = parsedLimit && Number.isFinite(parsedLimit) ? parsedLimit : undefined
    return this.conversationsService.getMessages(
      supabase,
      user.id,
      conversationId,
      {
        before,
        limit: safeLimit,
      },
      scope.orgId,
      scope.orgRole,
    )
  }

  @Patch(':id/messages/:messageId')
  async patchMessage(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: { metadata?: Record<string, unknown> },
  ) {
    return this.conversationsService.patchMessageMetadata(
      supabase,
      user.id,
      conversationId,
      messageId,
      body.metadata ?? {},
      scope.orgId,
      scope.orgRole,
    )
  }

  @Delete(':id/messages-from/:messageId')
  async deleteMessagesFrom(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    await this.conversationsService.deleteMessagesFrom(
      supabase,
      user.id,
      conversationId,
      messageId,
      scope.orgId,
      scope.orgRole,
    )
    return { success: true }
  }
}
