import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common'
import Redis, { type RedisOptions } from 'ioredis'
import { SupabaseServiceClient } from '@vibey/api-shared'
import {
  AgentRuntimeQueueService,
  type AgentRuntimeChatRunInput,
  type AgentRuntimeEnqueueResult,
  type AgentRuntimeShadowEnqueueResult,
} from './agent-runtime-queue.service'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'
import {
  conversationActiveRunKey,
  conversationLockKey,
  readPositiveInt,
  runEventsKey,
  runMetaKey,
} from './chat-run-event-store-utils'

export type ChatRunStatus =
  | 'active'
  | 'done'
  | 'failed'
  | 'failed_recoverable'
  | 'cancelled'
  | 'continued'

export interface ChatRunMeta {
  runId: string
  requestId: string | null
  conversationId: string
  messageId: string
  userId: string
  orgId: string | null
  status: ChatRunStatus
  lastCursor: string | null
  startedAt: string
  endedAt: string | null
  error: string | null
}

export interface ChatRunEvent {
  runId: string
  cursor: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface StartRunInput {
  runId: string
  requestId?: string | null
  conversationId: string
  messageId: string
  userId: string
  orgId?: string | null
  executionMode?: 'direct' | 'queued' | 'shadow'
  agentKey?: string | null
  gatewayAgentId?: string | null
  observability?: Record<string, unknown>
}

export interface StartRunOptions {
  awaitPersist?: boolean
  skipShadowQueue?: boolean
}

export interface AppendRunEventInput {
  runId: string
  type: string
  payload: Record<string, unknown>
}

export interface RecordRunRoutingInput {
  runId: string
  agentKey?: string | null
  gatewayAgentId?: string | null
  observability?: Record<string, unknown>
}

const DEFAULT_TTL_SECONDS = 7200
const DEFAULT_MAXLEN = 20000

@Injectable()
export class ChatRunEventStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatRunEventStoreService.name)
  private readonly ttlSeconds = readPositiveInt(
    process.env.CHAT_RUN_REDIS_TTL_SECONDS,
    DEFAULT_TTL_SECONDS,
  )
  private readonly maxLen = readPositiveInt(process.env.CHAT_RUN_REDIS_MAXLEN, DEFAULT_MAXLEN)
  private readonly redis: Redis | null
  private readonly readerRedis: Redis | null
  private connectPromise: Promise<void> | null = null
  private readerConnectPromise: Promise<void> | null = null
  private unavailable = false
  private readerUnavailable = false
  private warnedUnavailable = false
  private warnedReaderUnavailable = false

  constructor(
    @Optional() private readonly svc?: SupabaseServiceClient,
    @Optional() private readonly runtimeQueue?: AgentRuntimeQueueService,
    @Optional()
    private readonly repository: ChatRuntimeRepository = new ChatRuntimeRepository(),
  ) {
    const redisUrl = process.env.REDIS_URL_AGENT_STREAM?.trim() || process.env.REDIS_URL?.trim()
    const redisHost = process.env.REDIS_HOST?.trim()
    const hasHostConfig = Boolean(
      redisHost || process.env.REDIS_PORT?.trim() || process.env.REDIS_PASSWORD?.trim(),
    )

    if (redisUrl) {
      this.redis = new Redis(redisUrl, this.redisOptions())
      this.readerRedis = new Redis(redisUrl, this.redisOptions())
    } else if (hasHostConfig) {
      this.redis = new Redis({
        host: redisHost || 'localhost',
        port: readPositiveInt(process.env.REDIS_PORT, 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        ...this.redisOptions(),
      })
      this.readerRedis = new Redis({
        host: redisHost || 'localhost',
        port: readPositiveInt(process.env.REDIS_PORT, 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        ...this.redisOptions(),
      })
    } else {
      this.redis = null
      this.readerRedis = null
      this.unavailable = true
      this.readerUnavailable = true
    }

    this.redis?.on('error', (err) => {
      this.unavailable = true
      this.warnUnavailable(`Redis stream connection error: ${err.message}`)
    })
    this.redis?.on('ready', () => {
      this.unavailable = false
      this.warnedUnavailable = false
      this.logger.log('[ChatRunRedis] ready')
    })
    this.readerRedis?.on('error', (err) => {
      this.readerUnavailable = true
      this.warnReaderUnavailable(`Redis stream reader connection error: ${err.message}`)
    })
    this.readerRedis?.on('ready', () => {
      this.readerUnavailable = false
      this.warnedReaderUnavailable = false
    })
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.redis?.quit().catch(() => undefined),
      this.readerRedis?.quit().catch(() => undefined),
    ])
  }

  isAvailable(): boolean {
    return Boolean(this.redis) && !this.unavailable
  }

  async tryAcquireConversationLock(conversationId: string): Promise<boolean> {
    const redis = await this.getRedis()
    if (!redis) return true

    const active = await this.getActiveRunForConversation(conversationId)
    if (active?.status === 'active') return false

    const result = await redis.set(
      conversationLockKey(conversationId),
      '1',
      'EX',
      this.ttlSeconds,
      'NX',
    )
    return result === 'OK'
  }

  async releaseConversationLock(conversationId: string): Promise<void> {
    const redis = await this.getRedis()
    if (!redis) return
    await redis.del(conversationLockKey(conversationId)).catch((err) => {
      this.warnUnavailable(`Redis release lock failed: ${String(err)}`)
    })
  }

  async startRun(input: StartRunInput, options: StartRunOptions = {}): Promise<boolean> {
    const now = new Date().toISOString()
    const persistPromise = this.persistRunStarted(input, now)
    let persisted = true

    if (options.awaitPersist) {
      persisted = await persistPromise
      if (persisted && !options.skipShadowQueue) {
        await this.enqueueShadowRun(input)
      }
    } else {
      void persistPromise
        .then((persisted) =>
          persisted && !options.skipShadowQueue ? this.enqueueShadowRun(input) : undefined,
        )
        .catch((err) => {
          this.logger.warn(
            `[ChatRuntimeRuns] async start failed run=${input.runId}: ${String(err)}`,
          )
        })
    }

    const redis = await this.getRedis()
    if (!redis) return persisted

    const metaKey = runMetaKey(input.runId)
    const streamKey = runEventsKey(input.runId)
    const activeKey = conversationActiveRunKey(input.conversationId)
    await redis
      .multi()
      .hset(metaKey, {
        runId: input.runId,
        requestId: input.requestId ?? '',
        conversationId: input.conversationId,
        messageId: input.messageId,
        userId: input.userId,
        orgId: input.orgId ?? '',
        status: 'active',
        lastCursor: '',
        startedAt: now,
        endedAt: '',
        error: '',
      })
      .set(activeKey, input.runId, 'EX', this.ttlSeconds)
      .expire(metaKey, this.ttlSeconds)
      .expire(streamKey, this.ttlSeconds)
      .exec()
    this.logger.log(
      `[ChatRunRedis] started run=${input.runId} conversation=${input.conversationId}`,
    )
    return persisted
  }

  async appendEvent(input: AppendRunEventInput): Promise<ChatRunEvent | null> {
    const redis = await this.getRedis()
    if (!redis) return null

    const createdAt = new Date().toISOString()
    const streamKey = runEventsKey(input.runId)
    const payloadJson = JSON.stringify(input.payload ?? {})
    const cursor = await redis.xadd(
      streamKey,
      'MAXLEN',
      '~',
      String(this.maxLen),
      '*',
      'type',
      input.type,
      'payload',
      payloadJson,
      'createdAt',
      createdAt,
    )
    if (!cursor) return null
    await redis
      .multi()
      .hset(runMetaKey(input.runId), { lastCursor: cursor })
      .expire(streamKey, this.ttlSeconds)
      .expire(runMetaKey(input.runId), this.ttlSeconds)
      .exec()

    return {
      runId: input.runId,
      cursor,
      type: input.type,
      payload: input.payload,
      createdAt,
    }
  }

  async readAfter(runId: string, cursor: string, blockMs: number): Promise<ChatRunEvent[]> {
    const redis = await this.getReaderRedis()
    if (!redis) return []

    const result = await redis.xread(
      'BLOCK',
      Math.max(1, blockMs),
      'STREAMS',
      runEventsKey(runId),
      cursor || '0-0',
    )
    const stream = result?.[0]
    const entries = stream?.[1] ?? []
    return entries.map(([entryCursor, fields]) =>
      this.decodeEvent(runId, entryCursor, fields as string[]),
    )
  }

  async getActiveRunForConversation(conversationId: string): Promise<ChatRunMeta | null> {
    const redis = await this.getRedis()
    if (!redis) return null

    const runId = await redis.get(conversationActiveRunKey(conversationId))
    if (!runId) return null
    const meta = await this.getRunMeta(runId)
    if (!meta || meta.status !== 'active') {
      await redis.del(conversationActiveRunKey(conversationId)).catch(() => undefined)
      return null
    }
    return meta
  }

  async getRunMeta(runId: string): Promise<ChatRunMeta | null> {
    const redis = await this.getRedis()
    if (!redis) return null

    const raw = await redis.hgetall(runMetaKey(runId))
    if (!raw.runId) return null
    return this.decodeMeta(raw)
  }

  async markRunDone(runId: string): Promise<void> {
    await this.markTerminal(runId, 'done', null)
  }

  async markRunFailed(runId: string, error: string): Promise<void> {
    await this.markTerminal(runId, 'failed', error)
  }

  async markRunRecoverableFailed(runId: string, error: string): Promise<void> {
    await this.markTerminal(runId, 'failed_recoverable', error)
  }

  async markRunContinued(runId: string, continuationId: string): Promise<void> {
    await this.markTerminal(runId, 'continued', continuationId)
  }

  async cancelRun(runId: string, reason = 'cancelled'): Promise<void> {
    await this.appendEvent({
      runId,
      type: 'error',
      payload: { code: 'cancelled', message: reason },
    }).catch(() => null)
    await this.markTerminal(runId, 'cancelled', reason)
  }

  async isRunCancelled(runId: string): Promise<boolean> {
    const meta = await this.getRunMeta(runId).catch(() => null)
    return meta?.status === 'cancelled'
  }

  async enqueueChatRun(input: AgentRuntimeChatRunInput): Promise<AgentRuntimeEnqueueResult | null> {
    if (!this.runtimeQueue) return null

    const result = await this.runtimeQueue.enqueueChatRun(input)
    if (!result) return null
    await this.persistQueueMetadata(input.runId, result)
    return result
  }

  isRuntimeQueueExecutionEnabled(): boolean {
    return this.runtimeQueue?.isExecutionEnabled() ?? false
  }

  /** Backfills the FK-constrained message_id once the assistant message row exists. */
  async attachRunMessage(runId: string, messageId: string): Promise<void> {
    if (!this.svc) return

    const error = await this.repository.updateRuntimeRun(this.svc.client, runId, {
      message_id: messageId,
    })
    if (error) {
      this.logger.warn(
        `[ChatRuntimeRuns] message attach failed run=${runId} message=${messageId}: ${error.message}`,
      )
    }
  }

  async recordRunRouting(input: RecordRunRoutingInput): Promise<void> {
    if (!this.svc) return

    const payload: Record<string, unknown> = {}
    if (input.agentKey !== undefined) payload.agent_key = input.agentKey
    if (input.gatewayAgentId !== undefined) payload.gateway_agent_id = input.gatewayAgentId
    if (input.observability) payload.observability = input.observability
    if (Object.keys(payload).length === 0) return

    const error = await this.repository.updateRuntimeRun(this.svc.client, input.runId, payload)
    if (error) {
      this.logger.warn(
        `[ChatRuntimeRuns] routing persist failed run=${input.runId}: ${error.message}`,
      )
    }
  }

  private async markTerminal(
    runId: string,
    status: Exclude<ChatRunStatus, 'active'>,
    error: string | null,
  ): Promise<void> {
    await this.persistRunTerminal(runId, status, error)

    const redis = await this.getRedis()
    if (!redis) return

    const meta = await this.getRunMeta(runId)
    const multi = redis
      .multi()
      .hset(runMetaKey(runId), {
        status,
        endedAt: new Date().toISOString(),
        error: error ?? '',
      })
      .expire(runMetaKey(runId), this.ttlSeconds)
      .expire(runEventsKey(runId), this.ttlSeconds)
    if (meta?.conversationId) {
      multi.del(conversationActiveRunKey(meta.conversationId))
      multi.del(conversationLockKey(meta.conversationId))
    }
    await multi.exec()
  }

  private async persistRunStarted(input: StartRunInput, startedAt: string): Promise<boolean> {
    if (!this.svc) return false

    // Queued runs persist before the assistant message row exists; the FK column is
    // backfilled via attachRunMessage() once processMessage() creates the message.
    const messageRowExists = input.executionMode !== 'queued'

    const error = await this.repository.upsertRuntimeRun(this.svc.client, {
        run_id: input.runId,
        idempotency_key: `chat:${input.runId}`,
        workload_type: 'chat',
        status: 'active',
        conversation_id: input.conversationId,
        message_id: messageRowExists ? input.messageId : null,
        user_id: input.userId,
        org_id: input.orgId ?? null,
        agent_key: input.agentKey ?? null,
        gateway_agent_id: input.gatewayAgentId ?? null,
        priority: 100,
        started_at: startedAt,
        completed_at: null,
        failed_at: null,
        cancelled_at: null,
        ended_at: null,
        error: null,
        payload: {
          conversation_id: input.conversationId,
          message_id: input.messageId,
          request_id: input.requestId ?? null,
        },
        result: {},
        observability: input.observability ?? {},
        metadata: {
          execution_mode: input.executionMode ?? 'direct',
          request_id: input.requestId ?? null,
        },
      })
    if (error) {
      this.logger.warn(
        `[ChatRuntimeRuns] start persist failed run=${input.runId}: ${error.message}`,
      )
      return false
    }
    return true
  }

  private async persistRunTerminal(
    runId: string,
    status: Exclude<ChatRunStatus, 'active'>,
    errorMessage: string | null,
  ): Promise<void> {
    if (!this.svc) return

    const terminalAt = new Date().toISOString()
    const error = await this.repository.updateRuntimeRun(this.svc.client, runId, {
        status,
        completed_at: status === 'done' ? terminalAt : null,
        failed_at: status === 'failed' || status === 'failed_recoverable' ? terminalAt : null,
        cancelled_at: status === 'cancelled' ? terminalAt : null,
        ended_at: terminalAt,
        error: errorMessage,
      })
    if (error) {
      this.logger.warn(`[ChatRuntimeRuns] terminal persist failed run=${runId}: ${error.message}`)
    }
  }

  private async enqueueShadowRun(input: StartRunInput): Promise<void> {
    if (!this.runtimeQueue) return

    const result = await this.runtimeQueue.enqueueChatShadowRun(input)
    if (!result) return
    await this.persistShadowQueueMetadata(input.runId, result)
  }

  private async persistQueueMetadata(
    runId: string,
    result: AgentRuntimeEnqueueResult,
  ): Promise<void> {
    if (!this.svc) return

    const error = await this.repository.updateRuntimeRun(this.svc.client, runId, {
        queue_name: result.queueName,
        job_id: result.jobId,
      })
    if (error) {
      this.logger.warn(
        `[ChatRuntimeRuns] queue metadata persist failed run=${runId}: ${error.message}`,
      )
    }
  }

  private async persistShadowQueueMetadata(
    runId: string,
    result: AgentRuntimeShadowEnqueueResult,
  ): Promise<void> {
    await this.persistQueueMetadata(runId, result)
  }

  private async getRedis(): Promise<Redis | null> {
    if (!this.redis) return null
    if (this.unavailable && this.redis.status !== 'ready') return null
    if (this.redis.status === 'ready') return this.redis
    if (!this.connectPromise) {
      this.connectPromise = this.redis
        .connect()
        .then(() => undefined)
        .catch((err) => {
          this.unavailable = true
          this.warnUnavailable(`Redis stream unavailable: ${String(err)}`)
        })
        .finally(() => {
          this.connectPromise = null
        })
    }
    await this.connectPromise
    const status = this.redis.status as string
    return status === 'ready' ? this.redis : null
  }

  private async getReaderRedis(): Promise<Redis | null> {
    if (!this.readerRedis) return null
    if (this.readerUnavailable && this.readerRedis.status !== 'ready') return null
    if (this.readerRedis.status === 'ready') return this.readerRedis
    if (!this.readerConnectPromise) {
      this.readerConnectPromise = this.readerRedis
        .connect()
        .then(() => undefined)
        .catch((err) => {
          this.readerUnavailable = true
          this.warnReaderUnavailable(`Redis stream reader unavailable: ${String(err)}`)
        })
        .finally(() => {
          this.readerConnectPromise = null
        })
    }
    await this.readerConnectPromise
    const status = this.readerRedis.status as string
    return status === 'ready' ? this.readerRedis : null
  }

  private redisOptions(): RedisOptions {
    return {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: null,
      connectTimeout: 10000,
      keepAlive: 30000,
      retryStrategy: (times) => Math.min(times * 500, 30000),
      reconnectOnError: (err) =>
        ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'READONLY'].some((code) =>
          err.message?.includes(code),
        ),
    }
  }

  private decodeEvent(runId: string, cursor: string, fields: string[]): ChatRunEvent {
    const record: Record<string, string> = {}
    for (let i = 0; i < fields.length; i += 2) {
      record[fields[i] ?? ''] = fields[i + 1] ?? ''
    }
    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(record.payload || '{}') as Record<string, unknown>
    } catch {
      payload = {}
    }
    return {
      runId,
      cursor,
      type: record.type || 'status',
      payload,
      createdAt: record.createdAt || new Date().toISOString(),
    }
  }

  private decodeMeta(raw: Record<string, string>): ChatRunMeta {
    const status =
      raw.status === 'done' ||
      raw.status === 'failed' ||
      raw.status === 'failed_recoverable' ||
      raw.status === 'cancelled' ||
      raw.status === 'continued' ||
      raw.status === 'active'
        ? raw.status
        : 'active'
    return {
      runId: raw.runId,
      requestId: raw.requestId || null,
      conversationId: raw.conversationId,
      messageId: raw.messageId,
      userId: raw.userId,
      orgId: raw.orgId || null,
      status,
      lastCursor: raw.lastCursor || null,
      startedAt: raw.startedAt,
      endedAt: raw.endedAt || null,
      error: raw.error || null,
    }
  }

  private warnUnavailable(message: string): void {
    if (this.warnedUnavailable) return
    this.warnedUnavailable = true
    this.logger.warn(`[ChatRunRedis] ${message}`)
  }

  private warnReaderUnavailable(message: string): void {
    if (this.warnedReaderUnavailable) return
    this.warnedReaderUnavailable = true
    this.logger.warn(`[ChatRunRedisReader] ${message}`)
  }

}
