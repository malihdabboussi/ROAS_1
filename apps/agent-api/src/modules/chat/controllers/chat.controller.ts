import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request, Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type ChatScopeKind,
  type RequestScope,
} from '@vibey/api-shared'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { ChatService } from '../services/chat.service'

/**
 * Chat Controller (Layer 1)
 *
 * Thin request handler for chat context prewarming.
 * Delegates ALL business logic to ChatService.
 */
@Controller('chat')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, CreditsGuard)
@UseInterceptors(SyncReadyInterceptor)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('prewarm')
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  async prewarm(
    @Body()
    body: {
      conversation_id: string
      model?: string
      model_settings?: {
        reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
        context_window_tokens?: number
        speed_mode?: 'standard' | 'fast'
        cortex_max?: boolean
      }
      campaign_id?: string | null
      space_id?: string | null
      scope_kind?: ChatScopeKind
      source?: string
    },
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Req() req: Request & { token?: string },
    @Res() res: Response,
  ) {
    const { conversation_id, model, model_settings, campaign_id, space_id, scope_kind, source } =
      body

    if (!conversation_id) {
      res.status(400).json({ error: 'Missing conversation_id' })
      return
    }

    const valid = await this.chatService.verifyConversationAccess(
      supabase,
      conversation_id,
      user.id,
      scope.orgId,
      scope.orgRole,
      'edit',
    )
    if (!valid) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const refreshTokenRaw = req.headers['x-supabase-refresh-token']
    const refreshToken =
      typeof refreshTokenRaw === 'string'
        ? refreshTokenRaw
        : Array.isArray(refreshTokenRaw)
          ? refreshTokenRaw[0]
          : undefined
    const result = await this.chatService.prewarmChatContext({
      supabase,
      conversationId: conversation_id,
      model,
      modelSettings: model_settings,
      userId: user.id,
      accessToken: req.token ?? '',
      refreshToken,
      campaignId: campaign_id,
      spaceId: space_id,
      scopeKind: scope_kind,
      orgId: scope.orgId ?? undefined,
      source,
    })
    res.status(200).json(result)
  }
}
