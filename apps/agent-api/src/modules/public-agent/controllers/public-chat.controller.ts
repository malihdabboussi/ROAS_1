import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { CreditsService } from '../../billing/services/credits.service'
import type { ChatTurnTimingSpan } from '../../chat/services/chat-turn-session.service'
import { ChatService } from '../../chat/services/chat.service'
import type { SendFn } from '../../chat/services/openclaw-proxy.service'
import { PublicAgentGuard } from '../guards/public-agent.guard'
import { PublicAgentChatService } from '../services/public-agent-chat.service'

const HEARTBEAT_INTERVAL_MS = 25_000

@Controller('public-chat')
@UseGuards(PublicAgentGuard, ThrottlerGuard)
@UseInterceptors(SyncReadyInterceptor)
export class PublicChatController {
  private readonly logger = new Logger(PublicChatController.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly publicAgentChatService: PublicAgentChatService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async sendMessage(
    @Body()
    body: {
      visitor_id: string
      conversation_id: string
      content: string
    },
    @Req()
    req: Request & {
      publicAgent?: { userId: string | null; orgId: string | null; agentKey: string }
    },
    @Res() res: Response,
  ) {
    const controllerStartedAt = Date.now()
    const { visitor_id, conversation_id, content } = body
    if (!visitor_id || !conversation_id || !content) {
      res.status(400).json({ error: 'Missing visitor_id, conversation_id, or content' })
      return
    }

    const { userId, orgId, agentKey } = req.publicAgent!
    const { owner, supabase } = await this.publicAgentChatService.resolveChatRuntime({
      userId,
      orgId,
      agentKey,
    })
    await this.creditsService.assertHasAvailableCredits(owner.actingUserId, owner.orgId)
    const controllerEndedAt = Date.now()
    const timingSpans: ChatTurnTimingSpan[] = [
      {
        name: 'public_controller',
        started_at_ms: controllerStartedAt,
        ended_at_ms: controllerEndedAt,
        duration_ms: Math.max(0, controllerEndedAt - controllerStartedAt),
        metadata: { agent_key: agentKey },
      },
    ]

    this.logger.log(`Public chat: visitor=${visitor_id} agent=${agentKey} conv=${conversation_id}`)

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let clientAlive = true
    const markClientClosed = () => {
      clientAlive = false
    }
    req.on('aborted', markClientClosed)
    res.on('close', markClientClosed)
    res.on('error', markClientClosed)

    const canWrite = () => clientAlive && !res.destroyed && !res.writableEnded

    const heartbeat = setInterval(() => {
      if (!canWrite()) {
        clearInterval(heartbeat)
        return
      }
      res.write(': heartbeat\n\n')
    }, HEARTBEAT_INTERVAL_MS)

    const send: SendFn = async (type, data) => {
      if (!canWrite()) return
      try {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
      } catch {
        markClientClosed()
      }
    }

    try {
      await this.chatService.processMessage({
        supabase,
        conversationId: conversation_id,
        content,
        agentKey,
        userId: owner.actingUserId,
        accessToken: owner.accessToken,
        refreshToken: owner.refreshToken,
        orgId: owner.orgId ?? undefined,
        source: 'public_agent',
        channelUser: {
          platform_id: visitor_id,
          display_name: `Visitor ${visitor_id.slice(0, 8)}`,
        },
        timingSpans,
        send,
      })
    } catch (err) {
      this.logger.error(`Public chat error: ${err}`)
      if (canWrite()) {
        send('error', { message: 'Processing failed' })
      }
    } finally {
      clearInterval(heartbeat)
      if (canWrite()) {
        res.write('data: [DONE]\n\n')
      }
      res.end()
    }
  }

  @Post('prewarm')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async prewarm(
    @Body()
    body: {
      visitor_id: string
      conversation_id: string
    },
    @Req()
    req: Request & {
      publicAgent?: { userId: string | null; orgId: string | null; agentKey: string }
    },
  ) {
    const { visitor_id, conversation_id } = body
    if (!visitor_id || !conversation_id) {
      return { error: 'Missing visitor_id or conversation_id' }
    }

    const { userId, orgId, agentKey } = req.publicAgent!
    const { owner, supabase } = await this.publicAgentChatService.resolveChatRuntime({
      userId,
      orgId,
      agentKey,
    })
    await this.creditsService.assertHasAvailableCredits(owner.actingUserId, owner.orgId)
    return this.chatService.prewarmChatContext({
      supabase,
      conversationId: conversation_id,
      agentKey,
      userId: owner.actingUserId,
      accessToken: owner.accessToken,
      refreshToken: owner.refreshToken,
      orgId: owner.orgId ?? undefined,
      source: 'public_agent',
    })
  }

  @Post('prewarm-agent')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async prewarmAgent(
    @Req()
    req: Request & {
      publicAgent?: { userId: string | null; orgId: string | null; agentKey: string }
    },
  ) {
    const { userId, orgId, agentKey } = req.publicAgent!
    const { owner, supabase } = await this.publicAgentChatService.resolveChatRuntime({
      userId,
      orgId,
      agentKey,
    })
    await this.creditsService.assertHasAvailableCredits(owner.actingUserId, owner.orgId)
    return this.chatService.prewarmAgentChatContext({
      supabase,
      agentKey,
      userId: owner.actingUserId,
      accessToken: owner.accessToken,
      refreshToken: owner.refreshToken,
      orgId: owner.orgId ?? undefined,
      source: 'public_agent',
    })
  }

  @Post('identify')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async identifyVisitor(
    @Body()
    body: {
      visitor_id: string
      conversation_id: string
      email: string
      name?: string
      first_name?: string
      last_name?: string
    },
    @Req()
    req: Request & {
      publicAgent?: {
        userId: string | null
        orgId: string | null
        agentKey: string
        widgetCampaignId?: string | null
      }
    },
  ) {
    const { userId, orgId, agentKey, widgetCampaignId } = req.publicAgent!
    return this.publicAgentChatService.identifyVisitor(
      { userId, orgId, agentKey, widgetCampaignId },
      body,
    )
  }
}
