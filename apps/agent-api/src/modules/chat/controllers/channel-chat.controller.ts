import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import type { Response } from 'express'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { CreditsService } from '../../billing/services/credits.service'
import { CHANNEL_CHAT_ERRORS } from '../config/errors.config'
import { ChannelServiceGuard } from '../guards/channel-service.guard'
import { ChatService } from '../services/chat.service'

@Controller('channel-chat')
@UseGuards(ChannelServiceGuard)
@UseInterceptors(SyncReadyInterceptor)
export class ChannelChatController {
  private readonly logger = new Logger(ChannelChatController.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly svc: SupabaseServiceClient,
    private readonly creditsService: CreditsService,
  ) {}

  @Post()
  @HttpCode(200)
  async sendMessage(
    @Body()
    body: {
      user_id: string
      conversation_id: string
      content: string
      source?: string
      access_token?: string
      refresh_token?: string
      org_id?: string | null
      channel_user?: {
        platform_id: string
        username?: string
        display_name: string
        language?: string
        relationship_kind?: 'internal'
        is_connection_owner?: boolean
        personal_brain_access?: boolean
      }
      documents?: Array<{
        filename: string
        type: 'text' | 'image' | 'video'
        text?: string
        fileUrl?: string
        mimeType?: string
        mediaAssetId?: string
        sizeBytes?: number
        pageCount?: number
        preview?: string
      }>
    },
    @Res() res: Response,
  ) {
    const {
      user_id,
      conversation_id,
      content,
      source,
      access_token,
      refresh_token,
      org_id,
      channel_user,
      documents,
    } = body
    if (!user_id || !conversation_id || !content) {
      res.status(400).json({ error: CHANNEL_CHAT_ERRORS.missingRequiredFields })
      return
    }
    if (!access_token) {
      res.status(400).json({ error: CHANNEL_CHAT_ERRORS.missingAccessToken })
      return
    }
    if (
      source === 'slack' &&
      (channel_user?.relationship_kind !== 'internal' ||
        typeof channel_user.is_connection_owner !== 'boolean' ||
        typeof channel_user.personal_brain_access !== 'boolean')
    ) {
      res.status(403).json({ error: CHANNEL_CHAT_ERRORS.slackAccessDenied })
      return
    }

    const supabase = this.svc.client

    try {
      await this.creditsService.assertHasAvailableCredits(user_id, org_id)
    } catch (err) {
      this.logger.error(`Channel chat credit check failed: ${err}`)
      throw err
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    // Generation abort — only triggered explicitly, not by client disconnect.
    const generationAbort = new AbortController()

    let clientAlive = true
    res.on('close', () => {
      clientAlive = false
    })

    const HEARTBEAT_INTERVAL_MS = 25_000
    const heartbeatId = setInterval(() => {
      if (!clientAlive) return
      try {
        res.write(': heartbeat\n\n')
      } catch {
        clientAlive = false
      }
    }, HEARTBEAT_INTERVAL_MS)

    try {
      await this.chatService.processMessage({
        supabase,
        conversationId: conversation_id,
        content,
        userId: user_id,
        accessToken: access_token,
        refreshToken: refresh_token,
        orgId: org_id ?? undefined,
        source,
        channelUser: channel_user,
        documents,
        signal: generationAbort.signal,
        send: async (type: string, data: Record<string, unknown>) => {
          if (!clientAlive) return
          try {
            res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
          } catch {
            clientAlive = false
          }
        },
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Channel chat stream error: ${message}`)
      if (clientAlive) {
        try {
          res.write(
            `data: ${JSON.stringify({ type: 'error', message: CHANNEL_CHAT_ERRORS.processingFailed })}\n\n`,
          )
        } catch {
          clientAlive = false
        }
      }
    } finally {
      clearInterval(heartbeatId)
      if (clientAlive) {
        try {
          res.write('data: [DONE]\n\n')
          res.end()
        } catch {
          /* already closed */
        }
      }
    }
  }
}
