import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
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
import { ConversationActivityService } from '../services/conversation-activity.service'
import { ConversationsService } from '../services/conversations.service'

@Controller('conversations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class ConversationRecordsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly conversationActivityService: ConversationActivityService,
  ) {}

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
  ) {
    return this.conversationActivityService.markRead(
      supabase,
      user.id,
      conversationId,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/auto-title')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async autoTitle(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') conversationId: string,
    @Body() body?: { user_message?: string },
  ) {
    try {
      return await this.conversationsService.autoTitleConversation(
        supabase,
        user.id,
        conversationId,
        scope.orgId,
        scope.orgRole,
        body?.user_message,
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      if (msg === ConversationsService.ERR_SUGGEST_TITLE_UNAVAILABLE) {
        throw new HttpException(
          'Title suggestion is temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        )
      }
      if (error instanceof HttpException) throw error
      throw new HttpException('Could not auto-title conversation', HttpStatus.INTERNAL_SERVER_ERROR)
    }
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
