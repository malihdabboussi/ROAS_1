import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
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
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  ConversationListQuerySchema,
  type ConversationListQuery,
} from '../dto/conversation-list-query.dto'
import {
  SuggestConversationTitleBodySchema,
  type SuggestConversationTitleBody,
} from '../dto/suggest-conversation-title.dto'
import { ConversationFeedService } from '../services/conversation-feed.service'
import { ConversationsService } from '../services/conversations.service'

@Controller('conversations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly conversationFeedService: ConversationFeedService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(ConversationListQuerySchema)) query: ConversationListQuery,
  ) {
    return this.conversationFeedService.list(
      supabase,
      user.id,
      {
        campaign_id: query.campaign_id,
        agent_id: query.agent_id,
        space_id: query.space_id,
        channel_id: query.channel_id,
        feed_scope: query.feed_scope,
        feed_org_id: query.feed_org_id,
      },
      scope.orgId,
      scope.orgRole,
    )
  }

  @Get('shared-with-me')
  async sharedWithMe(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.conversationFeedService.listShared(supabase, user.id, scope.orgId, scope.orgRole)
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
      draft?: boolean
      metadata?: Record<string, unknown>
    },
  ) {
    return this.conversationsService.createConversation(supabase, user.id, body, scope.orgId)
  }

  @Post('suggest-title')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async suggestTitle(
    @CurrentUser() user: { id: string; email: string },
    @Body(new ZodValidationPipe(SuggestConversationTitleBodySchema))
    body: SuggestConversationTitleBody,
  ) {
    try {
      return await this.conversationsService.suggestConversationTitle(body.user_message, user.id)
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      if (msg === ConversationsService.ERR_SUGGEST_TITLE_UNAVAILABLE) {
        throw new HttpException(
          'Title suggestion is temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        )
      }
      throw new HttpException('Could not suggest a title', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('assets')
  async listAssets(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('scope') assetScope?: 'artifacts' | 'documents' | 'media' | 'links',
    @Query('agent_id') agentId?: string,
    @Query('campaign_id') campaignId?: string,
    @Query('limit') limitStr?: string,
    @Query('before') before?: string,
  ) {
    const resolvedScope = assetScope ?? 'media'
    if (!['artifacts', 'documents', 'media', 'links'].includes(resolvedScope)) {
      throw new Error('Invalid scope')
    }
    const limit = limitStr ? Math.min(Math.max(Number(limitStr) || 50, 1), 100) : 50
    return this.conversationsService.getAssetsFeed(supabase, user.id, scope.orgId, resolvedScope, {
      agentId: agentId || null,
      campaignId: campaignId || null,
      before,
      limit,
    })
  }
}
