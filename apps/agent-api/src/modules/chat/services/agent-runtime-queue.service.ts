import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import {
  AGENT_RUNTIME_QUEUE_NAMES,
  resolveAgentRuntimeRedisPrefix,
  resolveAgentRuntimeRedisUrl,
  type AgentRuntimeWorkload,
} from '@vibey/api-shared'
import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq'
import type { RedisOptions } from 'ioredis'

export interface AgentRuntimeShadowRunInput {
  runId: string
  requestId?: string | null
  conversationId: string
  messageId: string
  userId: string
  orgId?: string | null
}

export interface AgentRuntimeShadowJobData extends AgentRuntimeShadowRunInput {
  workload: 'chat'
  shadow: true
  enqueuedAt: string
}

export interface AgentRuntimeChatRunInput extends AgentRuntimeShadowRunInput {
  content: string
  model?: string
  modelSettings?: Record<string, unknown>
  accessToken: string
  refreshToken?: string
  campaignId?: string
  spaceId?: string
  scopeKind?: string
  source?: string
  orgMemberId?: string | null
  organizationWideDataAccess?: boolean
  previousResponseId?: string
  documents?: unknown[]
  highlightedArtifacts?: unknown[]
  messageReferences?: unknown[]
  uiSelectedArtifact?: unknown
  hidden?: boolean
  systemContext?: string
}

export interface AgentRuntimeChatJobData extends AgentRuntimeChatRunInput {
  workload: 'chat'
  shadow?: false
  enqueuedAt: string
}

export type AgentRuntimeJobData = AgentRuntimeShadowJobData | AgentRuntimeChatJobData

export interface AgentRuntimeEnqueueResult {
  queueName: string
  jobId: string
  enqueuedAt: string
}

export type AgentRuntimeShadowEnqueueResult = AgentRuntimeEnqueueResult

export { AGENT_RUNTIME_QUEUE_NAMES }

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
}

@Injectable()
export class AgentRuntimeQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(AgentRuntimeQueueService.name)
  private readonly queues = new Map<AgentRuntimeWorkload, Queue<AgentRuntimeJobData>>()
  private warnedUnavailable = false

  async onModuleDestroy(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()))
  }

  async enqueueChatShadowRun(
    input: AgentRuntimeShadowRunInput,
  ): Promise<AgentRuntimeShadowEnqueueResult | null> {
    if (!this.shadowEnabled()) return null

    const queue = this.getQueue('chat')
    if (!queue) return null

    const enqueuedAt = new Date().toISOString()
    const jobId = `chat-${input.runId}-shadow`
    await queue.add(
      'shadow-chat-run',
      {
        ...input,
        orgId: input.orgId ?? null,
        workload: 'chat',
        shadow: true,
        enqueuedAt,
      },
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId,
      },
    )

    return {
      queueName: AGENT_RUNTIME_QUEUE_NAMES.chat,
      jobId,
      enqueuedAt,
    }
  }

  async enqueueChatRun(input: AgentRuntimeChatRunInput): Promise<AgentRuntimeEnqueueResult | null> {
    if (!this.executionEnabled()) return null

    const queue = this.getQueue('chat')
    if (!queue) return null

    const enqueuedAt = new Date().toISOString()
    const jobId = `chat-${input.runId}`
    await queue.add(
      'chat-run',
      {
        ...input,
        orgId: input.orgId ?? null,
        workload: 'chat',
        shadow: false,
        enqueuedAt,
      },
      {
        ...DEFAULT_JOB_OPTIONS,
        attempts: 1,
        backoff: undefined,
        jobId,
      },
    )

    return {
      queueName: AGENT_RUNTIME_QUEUE_NAMES.chat,
      jobId,
      enqueuedAt,
    }
  }

  isExecutionEnabled(): boolean {
    return this.executionEnabled()
  }

  private getQueue(workload: AgentRuntimeWorkload): Queue<AgentRuntimeJobData> | null {
    const existing = this.queues.get(workload)
    if (existing) return existing

    const connection = this.redisConnection()
    if (!connection) {
      this.warnUnavailable('Redis queue connection is not configured')
      return null
    }

    const queue = new Queue<AgentRuntimeJobData>(AGENT_RUNTIME_QUEUE_NAMES[workload], {
      connection,
      prefix: resolveAgentRuntimeRedisPrefix(process.env),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    })
    this.queues.set(workload, queue)
    return queue
  }

  private redisConnection(): RedisOptions | null {
    const redisUrl = resolveAgentRuntimeRedisUrl(process.env)
    if (redisUrl) {
      const url = new URL(redisUrl)
      return {
        host: url.hostname,
        port: Number.parseInt(url.port, 10) || 6379,
        username: url.username || undefined,
        password: url.password || undefined,
        ...this.redisResilienceOptions(),
      }
    }

    const redisHost = process.env.REDIS_HOST?.trim()
    const hasHostConfig = Boolean(
      redisHost || process.env.REDIS_PORT?.trim() || process.env.REDIS_PASSWORD?.trim(),
    )
    if (!hasHostConfig) return null

    return {
      host: redisHost || 'localhost',
      port: this.readPositiveInt(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      ...this.redisResilienceOptions(),
    }
  }

  private redisResilienceOptions(): Partial<RedisOptions> {
    return {
      retryStrategy: (times) => {
        if (times > 20) return null
        return Math.min(times * 50, 30000)
      },
      reconnectOnError: (err) =>
        ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'READONLY'].some((code) =>
          err.message?.includes(code),
        ),
      keepAlive: 30000,
      enableReadyCheck: true,
      maxRetriesPerRequest: null,
      connectTimeout: 10000,
      lazyConnect: false,
      enableOfflineQueue: true,
    }
  }

  private shadowEnabled(): boolean {
    return ['1', 'true', 'on', 'yes'].includes(
      (process.env.AGENT_RUNTIME_QUEUE_SHADOW ?? '').toLowerCase(),
    )
  }

  private executionEnabled(): boolean {
    return ['1', 'true', 'on', 'yes'].includes(
      (process.env.AGENT_RUNTIME_QUEUE_EXECUTION ?? '').toLowerCase(),
    )
  }

  private warnUnavailable(message: string): void {
    if (this.warnedUnavailable) return
    this.warnedUnavailable = true
    this.logger.warn(`[AgentRuntimeQueue] ${message}`)
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }
}
