import { hostname } from 'os'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Job } from 'bullmq'
import Redis, { type RedisOptions } from 'ioredis'
import { DatabaseService } from '../../../lib/services/database.service'
import { getAgentRuntimeRedisConnection } from '../agent-runtime-redis.config'
import {
  AGENT_RUNTIME_CHAT_QUEUE,
  type AgentRuntimeChatExecutionJobData,
  type AgentRuntimeChatJobData,
  type AgentRuntimeChatJobResult,
  type AgentRuntimeChatShadowJobResult,
} from '../types/agent-runtime.types'

const CHAT_CONCURRENCY = readPositiveInt(
  process.env.AGENT_RUNTIME_CHAT_CONCURRENCY || process.env.AGENT_RUNTIME_CHAT_SHADOW_CONCURRENCY,
  4,
)
const DEFAULT_CHAT_RUN_TTL_SECONDS = 7200
const DEFAULT_CHAT_RUN_RECOVERABLE_TTL_SECONDS = 300
const DEFAULT_CHAT_RUN_MAXLEN = 20000
type ChatTerminalStatus = 'done' | 'failed' | 'failed_recoverable' | 'cancelled' | 'continued'
const CHAT_TERMINAL_STATUSES = new Set<string>([
  'done',
  'failed',
  'failed_recoverable',
  'cancelled',
  'continued',
])

@Processor(AGENT_RUNTIME_CHAT_QUEUE, {
  concurrency: CHAT_CONCURRENCY,
})
export class AgentRuntimeChatProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(AgentRuntimeChatProcessor.name)
  private readonly ttlSeconds = readPositiveInt(
    process.env.CHAT_RUN_REDIS_TTL_SECONDS,
    DEFAULT_CHAT_RUN_TTL_SECONDS,
  )
  private readonly maxLen = readPositiveInt(
    process.env.CHAT_RUN_REDIS_MAXLEN,
    DEFAULT_CHAT_RUN_MAXLEN,
  )
  private readonly recoverableTtlSeconds = readPositiveInt(
    process.env.CHAT_RUN_RECOVERABLE_TTL_SECONDS,
    DEFAULT_CHAT_RUN_RECOVERABLE_TTL_SECONDS,
  )
  private redis: Redis | null = null

  constructor(
    private readonly database: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    super()
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined)
  }

  async process(job: Job<AgentRuntimeChatJobData, AgentRuntimeChatJobResult>) {
    const claimedAtMs = Date.now()
    const claimedAt = new Date(claimedAtMs).toISOString()
    const claimLatencyMs = Math.max(0, claimedAtMs - (job.timestamp || claimedAtMs))
    const workerId = process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || hostname()

    await this.markClaimed(job, {
      claimedAt,
      claimLatencyMs,
      workerId,
    })

    if (job.data.shadow) {
      this.logger.debug(
        `Claimed shadow chat runtime job run=${job.data.runId} latencyMs=${claimLatencyMs}`,
      )
      return {
        success: true,
        runId: job.data.runId,
        shadow: true,
        claimLatencyMs,
      } satisfies AgentRuntimeChatShadowJobResult
    }

    if (job.name !== 'chat-run') {
      throw new Error(`Unsupported agent runtime chat job: ${job.name}`)
    }

    try {
      const terminal = await this.executeChatRun(job.data)
      return {
        success: terminal.status === 'done' || terminal.status === 'continued',
        runId: job.data.runId,
        shadow: false,
        claimLatencyMs,
        status: terminal.status,
      } satisfies AgentRuntimeChatJobResult
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isRecoverableChatBridgeError(message)) {
        try {
          await this.markRunInterruptedLocally(job.data, message)
        } catch (markErr) {
          this.logger.error(
            `Failed to mark queued chat run interrupted locally run=${job.data.runId}: ${String(
              markErr,
            )}`,
          )
          await this.markRunFailedLocally(job.data, message).catch((failErr) =>
            this.logger.error(
              `Failed to mark queued chat run failed locally run=${job.data.runId}: ${String(
                failErr,
              )}`,
            ),
          )
          await this.notifyAgentApiFailed(job.data.runId, message).catch((notifyErr) =>
            this.logger.warn(
              `Failed to notify Agent API of queued chat failure run=${job.data.runId}: ${String(
                notifyErr,
              )}`,
            ),
          )
          throw err
        }
        this.logger.warn(
          `Queued chat bridge interrupted run=${job.data.runId}: ${message}; preserving run for recovery`,
        )
        return {
          success: false,
          runId: job.data.runId,
          shadow: false,
          claimLatencyMs,
          status: 'interrupted',
        } satisfies AgentRuntimeChatJobResult
      }

      await this.markRunFailedLocally(job.data, message).catch((markErr) =>
        this.logger.error(
          `Failed to mark queued chat run failed locally run=${job.data.runId}: ${String(markErr)}`,
        ),
      )
      await this.notifyAgentApiFailed(job.data.runId, message).catch((notifyErr) =>
        this.logger.warn(
          `Failed to notify Agent API of queued chat failure run=${job.data.runId}: ${String(
            notifyErr,
          )}`,
        ),
      )
      throw err
    }
  }

  private async markClaimed(
    job: Job<AgentRuntimeChatJobData, AgentRuntimeChatJobResult>,
    claim: { claimedAt: string; claimLatencyMs: number; workerId: string },
  ): Promise<void> {
    const metadata = job.data.shadow
      ? {
          shadow_queue: true,
          shadow_enqueued_at: job.data.enqueuedAt,
          shadow_claimed_at: claim.claimedAt,
          shadow_claim_latency_ms: claim.claimLatencyMs,
        }
      : {
          execution_mode: 'queued',
          queue_enqueued_at: job.data.enqueuedAt,
          queue_claimed_at: claim.claimedAt,
          queue_claim_latency_ms: claim.claimLatencyMs,
        }

    const patch: Record<string, unknown> = {
      queue_name: AGENT_RUNTIME_CHAT_QUEUE,
      job_id: String(job.id ?? `chat-${job.data.runId}${job.data.shadow ? '-shadow' : ''}`),
      worker_id: claim.workerId,
      claimed_at: claim.claimedAt,
      heartbeat_at: claim.claimedAt,
      metadata,
    }
    if (!job.data.shadow) patch.status = 'running'

    const { error } = await this.database
      .getClient()
      .from('agent_runtime_runs')
      .update(patch)
      .eq('run_id', job.data.runId)

    if (error) {
      throw new Error(`Failed to mark chat runtime job claimed: ${error.message}`)
    }
  }

  private async executeChatRun(
    data: AgentRuntimeChatExecutionJobData,
  ): Promise<{ status: ChatTerminalStatus; message?: string }> {
    const agentApiUrl = this.agentApiUrl()
    const internalToken = this.internalToken()
    if (!internalToken) {
      throw new Error('INTERNAL_API_TOKEN is required for queued chat execution')
    }

    const response = await fetch(
      `${agentApiUrl}/api/internal/chat/runs/${encodeURIComponent(data.runId)}/execute`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': internalToken,
        },
        body: JSON.stringify(data),
      },
    )
    const text = await response.text()
    const terminal = this.parseTerminalLine(text)
    if (!response.ok) {
      throw new Error(
        `Agent API queued chat execution failed status=${response.status}: ${
          terminal?.message || text.slice(0, 500)
        }`,
      )
    }
    if (!terminal) {
      throw new Error('Agent API queued chat execution ended without terminal status')
    }
    if (terminal.status === 'failed') {
      throw new Error(terminal.message || 'Queued chat execution failed')
    }
    return terminal
  }

  private async notifyAgentApiFailed(runId: string, message: string): Promise<void> {
    const internalToken = this.internalToken()
    if (!internalToken) return

    await fetch(`${this.agentApiUrl()}/api/internal/chat/runs/${encodeURIComponent(runId)}/fail`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': internalToken,
      },
      body: JSON.stringify({ message }),
    })
  }

  private async markRunInterruptedLocally(
    data: AgentRuntimeChatExecutionJobData,
    message: string,
  ): Promise<void> {
    const interruptedAt = new Date().toISOString()
    const { error } = await this.database
      .getClient()
      .from('agent_runtime_runs')
      .update({
        status: 'running',
        heartbeat_at: interruptedAt,
        error: message,
      })
      .eq('run_id', data.runId)
    if (error) {
      throw new Error(`Failed to mark queued chat run interrupted: ${error.message}`)
    }

    const redis = await this.getRedis()
    if (!redis) return

    const streamKey = `chat:run:${data.runId}:events`
    const metaKey = `chat:run:${data.runId}:meta`
    const activeRunKey = `chat:conversation:${data.conversationId}:active_run`
    const lockKey = `chat:conversation:${data.conversationId}:lock`
    const cursor = await redis.xadd(
      streamKey,
      'MAXLEN',
      '~',
      String(this.maxLen),
      '*',
      'type',
      'error',
      'payload',
      JSON.stringify({
        code: 'stream_interrupted',
        message: 'response was interrupted',
        recoverable: true,
      }),
      'createdAt',
      interruptedAt,
    )
    await redis
      .multi()
      .hset(metaKey, {
        runId: data.runId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        userId: data.userId,
        orgId: data.orgId ?? '',
        status: 'active',
        lastCursor: cursor ?? '',
        endedAt: '',
        error: message,
        interruptedAt,
      })
      .set(activeRunKey, data.runId, 'EX', this.recoverableTtlSeconds)
      .set(lockKey, '1', 'EX', this.recoverableTtlSeconds)
      .expire(metaKey, this.recoverableTtlSeconds)
      .expire(streamKey, this.recoverableTtlSeconds)
      .exec()
  }

  private async markRunFailedLocally(
    data: AgentRuntimeChatExecutionJobData,
    message: string,
  ): Promise<void> {
    const failedAt = new Date().toISOString()
    const { error } = await this.database
      .getClient()
      .from('agent_runtime_runs')
      .update({
        status: 'failed',
        failed_at: failedAt,
        ended_at: failedAt,
        heartbeat_at: failedAt,
        error: message,
      })
      .eq('run_id', data.runId)
    if (error) {
      throw new Error(`Failed to mark queued chat run failed: ${error.message}`)
    }

    const redis = await this.getRedis()
    if (!redis) return

    const streamKey = `chat:run:${data.runId}:events`
    const metaKey = `chat:run:${data.runId}:meta`
    const cursor = await redis.xadd(
      streamKey,
      'MAXLEN',
      '~',
      String(this.maxLen),
      '*',
      'type',
      'error',
      'payload',
      JSON.stringify({ message }),
      'createdAt',
      failedAt,
    )
    await redis
      .multi()
      .hset(metaKey, {
        status: 'failed',
        lastCursor: cursor ?? '',
        endedAt: failedAt,
        error: message,
      })
      .expire(metaKey, this.ttlSeconds)
      .expire(streamKey, this.ttlSeconds)
      .del(`chat:conversation:${data.conversationId}:active_run`)
      .del(`chat:conversation:${data.conversationId}:lock`)
      .exec()
  }

  private parseTerminalLine(
    text: string,
  ): { status: ChatTerminalStatus; message?: string } | null {
    const lines = text.split('\n').filter((line) => line.trim())
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        const parsed = JSON.parse(lines[i] ?? '{}') as {
          type?: string
          status?: string
          message?: string
        }
        if (parsed.type === 'terminal' && this.isChatTerminalStatus(parsed.status)) {
          return { status: parsed.status, message: parsed.message }
        }
      } catch {
        continue
      }
    }
    return null
  }

  private isChatTerminalStatus(value: string | undefined): value is ChatTerminalStatus {
    return typeof value === 'string' && CHAT_TERMINAL_STATUSES.has(value)
  }

  private async getRedis(): Promise<Redis | null> {
    if (!this.redis) {
      this.redis = new Redis({
        ...(getAgentRuntimeRedisConnection(this.configService) as RedisOptions),
        lazyConnect: true,
      })
      this.redis.on('error', (err) => this.logger.warn(`Agent runtime Redis error: ${err.message}`))
    }
    if ((this.redis.status as string) === 'ready') return this.redis
    await this.redis.connect().catch(() => undefined)
    return (this.redis.status as string) === 'ready' ? this.redis : null
  }

  private agentApiUrl(): string {
    const configured =
      this.configService.get<string>('missionApi.agentApiUrl') ||
      process.env.AGENT_API_URL ||
      'http://localhost:3003'
    return configured.replace(/\/+$/, '')
  }

  private internalToken(): string {
    return (
      this.configService.get<string>('missionApi.internalToken') ||
      process.env.INTERNAL_API_TOKEN ||
      ''
    ).trim()
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function isRecoverableChatBridgeError(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  if (!normalized) return false
  return (
    normalized === 'terminated' ||
    normalized.includes('network stream interrupted') ||
    normalized.includes('response was interrupted') ||
    normalized.includes('socket hang up') ||
    normalized.includes('econnreset') ||
    normalized.includes('und_err_socket') ||
    normalized.includes('fetch failed')
  )
}
