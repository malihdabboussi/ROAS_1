import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
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
export class ConversationRecordsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post(':id/fork')
  @HttpCode(HttpStatus.CREATED)
  async fork(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') conversationId: string,
    @Body() body: { message_id: string },
  ) {
    return this.conversationsService.forkConversation(
      supabase,
      user.id,
      conversationId,
      body.message_id,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') conversationId: string,
  ) {
    await this.conversationsService.deleteConversation(
      supabase,
      user.id,
      conversationId,
      scope.orgId,
      scope.orgRole,
    )
    return { success: true }
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') conversationId: string,
    @Body()
    body: {
      title?: string
      status?: string
      campaign_id?: string | null
      default_model_id?: string | null
      clear_team_draft?: boolean
      metadata?: Record<string, unknown>
    },
  ) {
    return this.conversationsService.updateConversation(
      supabase,
      user.id,
      conversationId,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }
}
