import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { ChatRunEventStoreService } from '../services/chat-run-event-store.service'
import { ChatService } from '../services/chat.service'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

@Controller('chat')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, CreditsGuard)
@UseInterceptors(SyncReadyInterceptor)
export class ChatStatusController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatRunEvents: ChatRunEventStoreService,
  ) {}

  @Get('conversations/:conversationId/context-baseline')
  async contextBaseline(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Res() res: Response,
  ) {
    const valid = await this.chatService.verifyConversationAccess(
      supabase,
      conversationId,
      user.id,
      scope.orgId,
      scope.orgRole,
      'view',
    )
    if (!valid) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const contextBreakdown = await this.chatService.getContextBaseline(supabase, conversationId)
    res.status(200).json({ context_breakdown: contextBreakdown })
  }

  @Get('status/:conversationId')
  async streamStatus(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Res() res: Response,
  ) {
    if (!UUID_RE.test(conversationId)) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const valid = await this.chatService.verifyConversationAccess(
      supabase,
      conversationId,
      user.id,
      scope.orgId,
      scope.orgRole,
      'view',
    )
    if (!valid) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }
    const snapshot = await this.chatService.getActiveTurnSnapshot(
      supabase,
      user.id,
      conversationId,
      scope.orgId,
      scope.orgRole,
    )
    res.status(200).json(snapshot)
  }

  @Get('runs/:runId/stream')
  async resumeRunStream(
    @Param('runId') runId: string,
    @Query('after') after: string | undefined,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Res() res: Response,
  ) {
    if (!UUID_RE.test(runId)) {
      res.status(404).json({ error: 'Run not found' })
      return
    }

    const meta = await this.chatRunEvents.getRunMeta(runId).catch(() => null)
    if (!meta) {
      res.status(404).json({ error: 'Run not found' })
      return
    }

    const valid = await this.chatService.verifyConversationAccess(
      supabase,
      meta.conversationId,
      user.id,
      scope.orgId,
      scope.orgRole,
      'view',
    )
    if (!valid) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let clientAlive = true
    let cursor = typeof after === 'string' && after.trim() ? after.trim() : '0-0'
    res.req.on('close', () => {
      clientAlive = false
    })

    const writeEvent = (type: string, payload: Record<string, unknown>, eventCursor: string) => {
      if (!clientAlive) return
      try {
        res.write(
          `data: ${JSON.stringify({ type, run_id: runId, cursor: eventCursor, ...payload })}\n\n`,
        )
      } catch {
        clientAlive = false
      }
    }

    const heartbeatId = setInterval(() => {
      if (!clientAlive) return
      try {
        res.write(': heartbeat\n\n')
      } catch {
        clientAlive = false
      }
    }, 25_000)

    try {
      while (clientAlive) {
        const events = await this.chatRunEvents.readAfter(runId, cursor, 25_000).catch(() => [])
        if (events.length === 0) {
          const latest = await this.chatRunEvents.getRunMeta(runId).catch(() => null)
          if (!latest || latest.status !== 'active') break
          continue
        }

        for (const event of events) {
          cursor = event.cursor
          writeEvent(event.type, event.payload, event.cursor)
          if (event.type === 'done' || event.type === 'error') {
            clientAlive = false
            break
          }
        }
      }
    } finally {
      clearInterval(heartbeatId)
      if (clientAlive) {
        try {
          res.write('data: [DONE]\n\n')
          res.end()
        } catch {
          // Client already gone
        }
      } else {
        try {
          res.end()
        } catch {
          // Client already gone
        }
      }
    }
  }
}
