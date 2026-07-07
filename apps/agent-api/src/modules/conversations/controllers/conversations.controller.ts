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
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { ConversationsService } from '../services/conversations.service'

/**
 * Conversations Controller (Layer 1)
 *
 * Thin request handler — delegates ALL business logic to ConversationsService.
 */
@Controller('conversations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('campaign_id') campaignId?: string,
    @Query('agent_id') agentId?: string,
    @Query('include_mcp') includeMcp?: string,
  ) {
    return this.conversationsService.listConversations(
      supabase,
      user.id,
      {
        campaign_id: campaignId,
        agent_id: agentId,
        include_mcp: includeMcp === 'true',
      },
      scope.orgId,
    )
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body()
    body: {
      title?: string
      campaign_id?: string
      agent_id?: string
      contact_email?: string
      metadata?: Record<string, unknown>
    },
  ) {
    return this.conversationsService.createConversation(supabase, user.id, body, scope.orgId)
  }

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
