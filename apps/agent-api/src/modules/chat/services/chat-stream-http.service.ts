import { randomUUID } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request, Response } from 'express'
import type { ChatScopeKind, RequestScope } from '@vibey/api-shared'
import { classifyChatStreamError, isChatStreamRateLimitMessage } from '../chat-stream-errors'
import { ChatRunEventStoreService } from './chat-run-event-store.service'
import { ChatService } from './chat.service'
import { StreamRegistryService } from './stream-registry.service'

const REDIS_READER_ENABLED_VALUES = new Set(['1', 'true', 'on', 'yes'])

export interface ChatMessageBody {
  conversation_id: string
  content: string
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
  previous_response_id?: string
  documents?: Array<{
    filename: string
    type: 'text' | 'image' | 'video' | 'audio'
    text?: string
    dataUrl?: string
    fileUrl?: string
    mimeType?: string
    mediaAssetId?: string
    sizeBytes?: number
    pageCount?: number
    preview?: string
  }>
  highlighted_artifacts?: Array<{
    id: string
    type: string
    label: string
  }>
  message_references?: Array<{
    kind: 'artifact' | 'media' | 'mission' | 'conversation' | 'person'
    id: string
    label: string
    type?: string
    campaign_id?: string
    brain_id?: string
  }>
  ui_selected_artifact?: {
    id: string
    type: string
    label?: string
    campaign_id?: string | null
    parent?: {
      type: string
      id: string
    } | null
  }
  hidden?: boolean
  system_context?: string
}

export interface ChatStopBody {
  conversation_id: string
  run_id?: string | null
}

@Injectable()
export class ChatStreamHttpService {
  private readonly logger = new Logger(ChatStreamHttpService.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly streamRegistry: StreamRegistryService,
    private readonly chatRunEvents: ChatRunEventStoreService,
  ) {}

  async sendMessage(
    body: ChatMessageBody,
    user: { id: string; email: string },
    supabase: SupabaseClient,
    scope: RequestScope,
    req: Request & { token?: string },
    res: Response,
  ): Promise<void> {
    const {
      conversation_id,
      content,
      model,
      model_settings,
      campaign_id,
      space_id,
      scope_kind,
      source,
      previous_response_id,
      documents,
      highlighted_artifacts,
      message_references,
      ui_selected_artifact,
      hidden,
      system_context,
    } = body

    if (!conversation_id || !content) {
      res.status(400).json({ error: 'Missing conversation_id or content' })
      return
    }
    const requestId = this.resolveRequestId(req)

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

    const redisLockAcquired = await this.chatRunEvents
      .tryAcquireConversationLock(conversation_id)
      .catch(() => true)
    if (!redisLockAcquired || this.streamRegistry.isActive(conversation_id)) {
      if (redisLockAcquired) {
        await this.chatRunEvents.releaseConversationLock(conversation_id).catch(() => null)
      }
      res
        .status(409)
        .json({ error: 'A generation is already in progress. Please wait for it to complete.' })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.setHeader('x-vibey-request-id', requestId)
    res.flushHeaders()

    const generationAbort = new AbortController()
    this.streamRegistry.setAbortController(conversation_id, generationAbort)

    let clientAlive = true
    res.req.on('close', () => {
      clientAlive = false
    })

    const heartbeatId = setInterval(() => {
      if (!clientAlive) return
      try {
        res.write(': heartbeat\n\n')
      } catch {
        clientAlive = false
      }
    }, 25_000)

    const debugCounts: Record<string, number> = Object.create(null) as Record<string, number>
    const redisReaderEnabled = REDIS_READER_ENABLED_VALUES.has(
      (process.env.CHAT_STREAM_REDIS_READER ?? '').toLowerCase(),
    )
    let directSseForwarding = true
    let redisReaderPromise: Promise<void> | null = null
    let releaseConversationLockInFinally = true

    const writeSse = async (type: string, data: Record<string, unknown>) => {
      if (!clientAlive) return
      try {
        debugCounts[type] = (debugCounts[type] ?? 0) + 1
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
      } catch {
        clientAlive = false
      }
    }

    const startRedisReader = (runId: string, afterCursor: string) => {
      redisReaderPromise = (async () => {
        let cursor = afterCursor
        while (clientAlive) {
          const events = await this.chatRunEvents.readAfter(runId, cursor, 25_000).catch((err) => {
            this.logger.warn(`Redis reader failed for run ${runId}: ${String(err)}`)
            return []
          })
          if (events.length === 0) {
            const latest = await this.chatRunEvents.getRunMeta(runId).catch(() => null)
            if (!latest || latest.status !== 'active') break
            continue
          }

          for (const event of events) {
            cursor = event.cursor
            await writeSse(event.type, { run_id: runId, cursor: event.cursor, ...event.payload })
            if (event.type === 'done' || event.type === 'error') return
          }
        }
      })()
    }

    try {
      const refreshTokenRaw = req.headers['x-supabase-refresh-token']
      const refreshToken =
        typeof refreshTokenRaw === 'string'
          ? refreshTokenRaw
          : Array.isArray(refreshTokenRaw)
            ? refreshTokenRaw[0]
            : undefined
      const orgId = scope.orgId ?? undefined

      if (this.chatRunEvents.isRuntimeQueueExecutionEnabled()) {
        const messageId = randomUUID()
        const runId = messageId
        const started = await this.chatRunEvents.startRun(
          {
            runId,
            requestId,
            conversationId: conversation_id,
            messageId,
            userId: user.id,
            orgId: orgId ?? null,
            executionMode: 'queued',
          },
          { awaitPersist: true, skipShadowQueue: true },
        )
        if (!started) {
          throw new Error('Failed to persist queued chat run before enqueue')
        }

        try {
          const enqueued = await this.chatRunEvents.enqueueChatRun({
            runId,
            requestId,
            conversationId: conversation_id,
            messageId,
            userId: user.id,
            orgId: orgId ?? null,
            content,
            model,
            modelSettings: model_settings,
            accessToken: req.token ?? '',
            refreshToken,
            campaignId: campaign_id ?? undefined,
            spaceId: space_id ?? undefined,
            scopeKind: scope_kind,
            source,
            previousResponseId: previous_response_id,
            documents,
            highlightedArtifacts: highlighted_artifacts,
            messageReferences: message_references,
            uiSelectedArtifact: ui_selected_artifact,
            hidden,
            systemContext: system_context,
          })
          if (!enqueued) {
            throw new Error('Runtime queue execution is enabled but the chat queue is unavailable')
          }
        } catch (err) {
          await this.chatRunEvents
            .markRunFailed(runId, err instanceof Error ? err.message : String(err))
            .catch(() => null)
          throw err
        }

        releaseConversationLockInFinally = false
        directSseForwarding = false
        startRedisReader(runId, '0-0')
        const readerPromise = redisReaderPromise as unknown as Promise<void> | null
        if (readerPromise) await readerPromise
        return
      }

      await this.chatService.processMessage({
        supabase,
        conversationId: conversation_id,
        requestId,
        content,
        model,
        modelSettings: model_settings,
        userId: user.id,
        accessToken: req.token ?? '',
        refreshToken,
        campaignId: campaign_id,
        spaceId: space_id,
        scopeKind: scope_kind,
        orgId,
        source,
        previousResponseId: previous_response_id,
        documents,
        highlightedArtifacts: highlighted_artifacts,
        messageReferences: message_references,
        uiSelectedArtifact: ui_selected_artifact,
        hidden,
        systemContext: system_context,
        signal: generationAbort.signal,
        send: async (type: string, data: Record<string, unknown>) => {
          const runId = typeof data.run_id === 'string' ? data.run_id : null
          const cursor = typeof data.cursor === 'string' ? data.cursor : null
          if (redisReaderEnabled && runId && cursor && !redisReaderPromise) {
            await writeSse(type, data)
            directSseForwarding = false
            startRedisReader(runId, cursor)
            return
          }
          if (!redisReaderEnabled || directSseForwarding) await writeSse(type, data)
        },
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      const message = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Chat stream error: ${message}`)
      if (clientAlive) {
        try {
          if (isChatStreamRateLimitMessage(message)) {
            res.write(
              `data: ${JSON.stringify({ type: 'rate_limit_notice', message: 'The model is in high demand right now. You can try again shortly or switch to a different model.', reason: 'overloaded' })}\n\n`,
            )
          } else {
            const code = classifyChatStreamError(message)
            res.write(`data: ${JSON.stringify({ type: 'error', code })}\n\n`)
          }
        } catch {
          clientAlive = false
        }
      }
    } finally {
      clearInterval(heartbeatId)
      this.streamRegistry.clearAbortController(conversation_id, generationAbort)
      const readerPromise = redisReaderPromise as unknown as Promise<void> | null
      if (readerPromise) {
        await readerPromise.catch((err) =>
          this.logger.warn(`Redis reader ended with error: ${String(err)}`),
        )
      }
      if (releaseConversationLockInFinally) {
        await this.chatRunEvents.releaseConversationLock(conversation_id).catch(() => null)
      }
      if (clientAlive) {
        try {
          res.write('data: [DONE]\n\n')
          res.end()
        } catch {
          // Client already gone
        }
      }
    }
  }

  async stopStream(
    body: ChatStopBody,
    user: { id: string; email: string },
    supabase: SupabaseClient,
    scope: RequestScope,
    res: Response,
  ): Promise<void> {
    const conversationId = body?.conversation_id?.trim()
    if (!conversationId) {
      res.status(400).json({ error: 'Missing conversation_id' })
      return
    }
    const requestedRunId = typeof body?.run_id === 'string' ? body.run_id.trim() : ''

    const valid = await this.chatService.verifyConversationAccess(
      supabase,
      conversationId,
      user.id,
      scope.orgId,
      scope.orgRole,
      'edit',
    )
    if (!valid) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }

    const activeRun = await this.chatRunEvents
      .getActiveRunForConversation(conversationId)
      .catch(() => null)
    const matchesRequestedRun = !requestedRunId || activeRun?.runId === requestedRunId
    let stopped = false
    if (!requestedRunId || matchesRequestedRun) {
      stopped = this.streamRegistry.abort(conversationId)
    } else if (!activeRun) {
      stopped = this.streamRegistry.abortIfMessageId(conversationId, requestedRunId)
    }
    if (activeRun && matchesRequestedRun) {
      await this.chatRunEvents.cancelRun(activeRun.runId, 'cancelled by user').catch(() => null)
    }
    res.status(200).json({ stopped: stopped || Boolean(activeRun && matchesRequestedRun) })
  }

  private resolveRequestId(req: Request): string {
    const raw =
      req.headers['x-vibey-request-id'] ?? req.headers['x-request-id'] ?? req.headers['x-vercel-id']
    const value = Array.isArray(raw) ? raw[0] : raw
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim().slice(0, 256)
      : randomUUID()
  }
}
