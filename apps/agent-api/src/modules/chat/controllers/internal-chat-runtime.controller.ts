import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { SupabaseClientFactory, type ChatScopeKind } from '@vibey/api-shared'
import { RuntimeIdentityGuard } from '../../agent-sync/guards/runtime-identity.guard'
import type { AgentRuntimeChatRunInput } from '../services/agent-runtime-queue.service'
import { ChatRunEventStoreService } from '../services/chat-run-event-store.service'
import { ChatService } from '../services/chat.service'

const DEFAULT_CANCEL_POLL_MS = 1000

@Controller('internal/chat')
@UseGuards(RuntimeIdentityGuard)
export class InternalChatRuntimeController {
  private readonly logger = new Logger(InternalChatRuntimeController.name)
  private readonly cancelPollMs = this.readPositiveInt(
    process.env.AGENT_RUNTIME_CHAT_CANCEL_POLL_MS,
    DEFAULT_CANCEL_POLL_MS,
  )

  constructor(
    private readonly chatService: ChatService,
    private readonly clientFactory: SupabaseClientFactory,
    private readonly chatRunEvents: ChatRunEventStoreService,
  ) {}

  @Post('runs/:runId/execute')
  @HttpCode(200)
  async executeRun(
    @Param('runId') runId: string,
    @Body() body: AgentRuntimeChatRunInput,
    @Res() res: Response,
  ): Promise<void> {
    this.assertValidBody(runId, body)

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const writeLine = (payload: Record<string, unknown>) => {
      res.write(`${JSON.stringify(payload)}\n`)
    }
    const heartbeat = setInterval(() => writeLine({ type: 'heartbeat' }), 25_000)
    heartbeat.unref?.()

    const abortController = new AbortController()
    let checkingCancellation = false
    const cancelTimer = setInterval(() => {
      if (checkingCancellation || abortController.signal.aborted) return
      checkingCancellation = true
      void this.chatRunEvents
        .isRunCancelled(runId)
        .then((cancelled) => {
          if (cancelled) abortController.abort()
        })
        .finally(() => {
          checkingCancellation = false
        })
    }, this.cancelPollMs)
    cancelTimer.unref?.()

    try {
      if (await this.chatRunEvents.isRunCancelled(runId).catch(() => false)) {
        writeLine({ type: 'terminal', status: 'cancelled', run_id: runId })
        return
      }

      const supabase = this.clientFactory.createUserClient(body.accessToken)
      const result = await this.chatService.processMessage({
        supabase,
        runId,
        messageId: body.messageId,
        requestId: body.requestId ?? null,
        conversationId: body.conversationId,
        content: body.content,
        model: body.model,
        modelSettings: body.modelSettings as never,
        userId: body.userId,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        campaignId: body.campaignId,
        spaceId: body.spaceId,
        scopeKind: body.scopeKind as ChatScopeKind | undefined,
        orgId: body.orgId ?? undefined,
        orgMemberId: body.orgMemberId ?? null,
        organizationWideDataAccess: body.organizationWideDataAccess === true,
        source: body.source,
        previousResponseId: body.previousResponseId,
        documents: body.documents as never,
        highlightedArtifacts: body.highlightedArtifacts as never,
        messageReferences: body.messageReferences as never,
        uiSelectedArtifact: body.uiSelectedArtifact as never,
        hidden: body.hidden,
        systemContext: body.systemContext,
        signal: abortController.signal,
        send: async () => undefined,
      })

      if (await this.chatRunEvents.isRunCancelled(runId).catch(() => false)) {
        writeLine({ type: 'terminal', status: 'cancelled', run_id: runId })
        return
      }
      writeLine({
        type: 'terminal',
        status: result.status,
        run_id: runId,
        ...(result.message ? { message: result.message } : {}),
      })
    } catch (err) {
      if (await this.chatRunEvents.isRunCancelled(runId).catch(() => false)) {
        writeLine({ type: 'terminal', status: 'cancelled', run_id: runId })
        return
      }
      const message = err instanceof Error ? err.message : String(err)
      await this.chatRunEvents
        .appendEvent({ runId, type: 'error', payload: { message } })
        .catch(() => null)
      await this.chatRunEvents.markRunFailed(runId, message).catch(() => null)
      this.logger.error(`Queued chat run failed run=${runId}: ${message}`)
      writeLine({ type: 'terminal', status: 'failed', run_id: runId, message })
    } finally {
      clearInterval(heartbeat)
      clearInterval(cancelTimer)
      res.end()
    }
  }

  @Post('runs/:runId/fail')
  @HttpCode(200)
  async failRun(
    @Param('runId') runId: string,
    @Body() body: { message?: string },
  ): Promise<{ status: 'failed'; run_id: string }> {
    const message = body?.message || 'Queued chat execution failed before processing started'
    await this.chatRunEvents
      .appendEvent({ runId, type: 'error', payload: { message } })
      .catch(() => null)
    await this.chatRunEvents.markRunFailed(runId, message)
    return { status: 'failed', run_id: runId }
  }

  private assertValidBody(runId: string, body: AgentRuntimeChatRunInput): void {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException({ error: 'Missing queued chat payload' })
    }
    if (body.runId !== runId) {
      throw new BadRequestException({ error: 'Run id mismatch' })
    }
    if (!body.conversationId || !body.messageId || !body.userId || !body.content) {
      throw new BadRequestException({ error: 'Missing required queued chat fields' })
    }
    if (!body.accessToken) {
      throw new BadRequestException({ error: 'Missing access token' })
    }
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }
}
