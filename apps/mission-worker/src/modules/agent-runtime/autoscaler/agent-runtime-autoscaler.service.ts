import { hostname } from 'os'
import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Job, Queue } from 'bullmq'
import Redis, { type RedisOptions } from 'ioredis'
import { WorkerLoggerService } from '../../logger'
import { getAgentRuntimeRedisConnection } from '../agent-runtime-redis.config'
import { AGENT_RUNTIME_CHAT_QUEUE } from '../types/agent-runtime.types'
import {
  createInitialAutoscalerState,
  decideAgentRuntimeReplicaTarget,
} from './agent-runtime-autoscaler-policy'
import type {
  AgentRuntimeAutoscalerMode,
  AgentRuntimeAutoscalerRuntimeConfig,
  AgentRuntimeAutoscalerState,
  QueuePressureSnapshot,
  RailwayApiTokenType,
} from './agent-runtime-autoscaler.types'
import { RailwayReplicaClient } from './railway-replica-client'

const LOCK_KEY = 'agent-runtime:autoscaler:railway-vibeyv2:lock'
const STATE_KEY = 'agent-runtime:autoscaler:railway-vibeyv2:state'
const DEFAULT_POLL_MS = 30000
const DEFAULT_LOCK_TTL_MS = 45000
const DEFAULT_SCALE_UP_WAIT_MS = 10000
const DEFAULT_SCALE_UP_CONSECUTIVE_SAMPLES = 2
const DEFAULT_SCALE_UP_COOLDOWN_MS = 120000
const DEFAULT_SCALE_DOWN_IDLE_MS = 900000
const DEFAULT_SCALE_DOWN_COOLDOWN_MS = 900000
const DEFAULT_MIN_REPLICAS = 2
const DEFAULT_MAX_REPLICAS = 4
const DEFAULT_REGION = 'europe-west4-drams3a'

@Injectable()
export class AgentRuntimeAutoscalerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentRuntimeAutoscalerService.name)
  private readonly instanceId = process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || hostname()
  private pollTimer: NodeJS.Timeout | null = null
  private redis: Redis | null = null

  constructor(
    @InjectQueue(AGENT_RUNTIME_CHAT_QUEUE) private readonly chatQueue: Queue,
    private readonly configService: ConfigService,
    private readonly railwayReplicaClient: RailwayReplicaClient,
    @Optional() private readonly workerLogger?: WorkerLoggerService,
  ) {}

  onModuleInit(): void {
    const config = this.readConfig()
    if (!config.enabled || config.mode === 'off') {
      this.logger.log('Agent runtime autoscaler disabled')
      return
    }

    this.pollTimer = setInterval(() => {
      this.pollOnce().catch((error) => {
        this.reportAutoscalerError(
          'AGENT_RUNTIME_AUTOSCALER_POLL_FAILED',
          'Agent runtime autoscaler poll failed',
          error,
        )
      })
    }, config.pollMs)
    this.logger.log(
      `Agent runtime autoscaler started mode=${config.mode} pollMs=${config.pollMs} min=${config.minReplicas} max=${config.maxReplicas}`,
    )
    this.pollOnce().catch((error) => {
      this.reportAutoscalerError(
        'AGENT_RUNTIME_AUTOSCALER_INITIAL_POLL_FAILED',
        'Agent runtime autoscaler initial poll failed',
        error,
      )
    })
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    await this.redis?.quit().catch(() => undefined)
    this.redis = null
  }

  async pollOnce(): Promise<void> {
    const config = this.readConfig()
    if (!config.enabled || config.mode === 'off') return

    const missing = this.missingConfig(config)
    if (missing.length) {
      this.logger.warn(`Agent runtime autoscaler missing config: ${missing.join(', ')}`)
      return
    }

    const redis = await this.getRedis()
    if (!redis) {
      this.logger.warn('Agent runtime autoscaler skipped: Redis unavailable')
      return
    }

    const lockAcquired = await this.acquireLock(redis, config)
    if (!lockAcquired) return

    try {
      await this.runLockedPoll(redis, config)
    } finally {
      await this.releaseLock(redis).catch((error) => {
        this.logger.warn(`Agent runtime autoscaler lock release failed: ${formatError(error)}`)
      })
    }
  }

  private async runLockedPoll(
    redis: Redis,
    config: AgentRuntimeAutoscalerRuntimeConfig,
  ): Promise<void> {
    const snapshot = await this.readQueuePressure()
    const state = await this.readState(redis)
    const currentReplicas = await this.railwayReplicaClient.readCurrentReplicas(config)
    const decision = decideAgentRuntimeReplicaTarget({
      config,
      currentReplicas,
      snapshot,
      state,
    })

    this.logger.log(
      `Agent runtime autoscaler snapshot mode=${config.mode} current=${currentReplicas} target=${decision.targetReplicas} action=${decision.action} waiting=${snapshot.waiting} prioritized=${snapshot.prioritized} active=${snapshot.active} delayed=${snapshot.delayed} oldestWaitingMs=${snapshot.oldestWaitingMs} reason="${decision.reason}"`,
    )

    if (decision.action === 'none') {
      await this.writeState(redis, decision.nextState)
      return
    }

    if (config.mode === 'dry_run') {
      this.logger.warn(
        `Agent runtime autoscaler dry_run target=${decision.targetReplicas} action=${decision.action} reason="${decision.reason}"`,
      )
      await this.writeState(redis, {
        ...decision.nextState,
        lastScaleAtMs: snapshot.sampledAtMs,
      })
      return
    }

    await this.railwayReplicaClient.setReplicas(config, decision.targetReplicas)
    await this.writeState(redis, {
      ...decision.nextState,
      lastScaleAtMs: snapshot.sampledAtMs,
    })
    this.logger.log(
      `Agent runtime autoscaler applied action=${decision.action} target=${decision.targetReplicas} reason="${decision.reason}"`,
    )
  }

  private async readQueuePressure(): Promise<QueuePressureSnapshot> {
    const sampledAtMs = Date.now()
    const counts = await this.chatQueue.getJobCounts('waiting', 'prioritized', 'delayed', 'active')
    const oldestJob = await this.readOldestReadyJob()

    return {
      waiting: readCount(counts.waiting),
      prioritized: readCount(counts.prioritized),
      delayed: readCount(counts.delayed),
      active: readCount(counts.active),
      oldestWaitingMs: oldestJob?.timestamp ? Math.max(0, sampledAtMs - oldestJob.timestamp) : 0,
      sampledAtMs,
    }
  }

  private async readOldestReadyJob(): Promise<Job | undefined> {
    const jobs = await this.chatQueue.getJobs(['waiting', 'prioritized'], 0, 0, true)
    return jobs[0]
  }

  private async getRedis(): Promise<Redis | null> {
    if (!this.redis) {
      this.redis = new Redis({
        ...(getAgentRuntimeRedisConnection(this.configService) as RedisOptions),
        lazyConnect: true,
      })
      this.redis.on('error', (error) =>
        this.logger.warn(`Agent runtime autoscaler Redis error: ${error.message}`),
      )
    }
    if ((this.redis.status as string) === 'ready') return this.redis
    await this.redis.connect().catch(() => undefined)
    return (this.redis.status as string) === 'ready' ? this.redis : null
  }

  private async acquireLock(
    redis: Redis,
    config: AgentRuntimeAutoscalerRuntimeConfig,
  ): Promise<boolean> {
    const result = await redis.set(LOCK_KEY, this.instanceId, 'PX', config.lockTtlMs, 'NX')
    return result === 'OK'
  }

  private async releaseLock(redis: Redis): Promise<void> {
    await redis.eval(
      'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end',
      1,
      LOCK_KEY,
      this.instanceId,
    )
  }

  private async readState(redis: Redis): Promise<AgentRuntimeAutoscalerState> {
    const raw = await redis.get(STATE_KEY)
    if (!raw) return createInitialAutoscalerState()

    try {
      const parsed = JSON.parse(raw) as Partial<AgentRuntimeAutoscalerState>
      return {
        consecutiveScaleUpSamples: readPositiveNumber(parsed.consecutiveScaleUpSamples, 0),
        idleSinceMs:
          typeof parsed.idleSinceMs === 'number' && Number.isFinite(parsed.idleSinceMs)
            ? parsed.idleSinceMs
            : null,
        lastScaleAtMs: readPositiveNumber(parsed.lastScaleAtMs, 0),
      }
    } catch {
      return createInitialAutoscalerState()
    }
  }

  private async writeState(redis: Redis, state: AgentRuntimeAutoscalerState): Promise<void> {
    await redis.set(STATE_KEY, JSON.stringify(state))
  }

  private readConfig(): AgentRuntimeAutoscalerRuntimeConfig {
    const apiToken =
      this.readString('agentRuntimeAutoscaler.apiToken') ||
      process.env.RAILWAY_PROJECT_TOKEN ||
      process.env.RAILWAY_API_TOKEN ||
      ''
    const tokenType =
      this.readString('agentRuntimeAutoscaler.apiTokenType') ||
      (process.env.RAILWAY_PROJECT_TOKEN ? 'project' : 'bearer')

    return {
      enabled: this.readBoolean('agentRuntimeAutoscaler.enabled', false),
      mode: this.readMode('agentRuntimeAutoscaler.mode', 'active'),
      pollMs: this.readPositiveInteger('agentRuntimeAutoscaler.pollMs', DEFAULT_POLL_MS),
      lockTtlMs: this.readPositiveInteger('agentRuntimeAutoscaler.lockTtlMs', DEFAULT_LOCK_TTL_MS),
      minReplicas: this.readPositiveInteger(
        'agentRuntimeAutoscaler.minReplicas',
        DEFAULT_MIN_REPLICAS,
      ),
      maxReplicas: this.readPositiveInteger(
        'agentRuntimeAutoscaler.maxReplicas',
        DEFAULT_MAX_REPLICAS,
      ),
      scaleUpWaitMs: this.readPositiveInteger(
        'agentRuntimeAutoscaler.scaleUpWaitMs',
        DEFAULT_SCALE_UP_WAIT_MS,
      ),
      scaleUpConsecutiveSamples: this.readPositiveInteger(
        'agentRuntimeAutoscaler.scaleUpConsecutiveSamples',
        DEFAULT_SCALE_UP_CONSECUTIVE_SAMPLES,
      ),
      scaleUpCooldownMs: this.readPositiveInteger(
        'agentRuntimeAutoscaler.scaleUpCooldownMs',
        DEFAULT_SCALE_UP_COOLDOWN_MS,
      ),
      scaleDownIdleMs: this.readPositiveInteger(
        'agentRuntimeAutoscaler.scaleDownIdleMs',
        DEFAULT_SCALE_DOWN_IDLE_MS,
      ),
      scaleDownCooldownMs: this.readPositiveInteger(
        'agentRuntimeAutoscaler.scaleDownCooldownMs',
        DEFAULT_SCALE_DOWN_COOLDOWN_MS,
      ),
      projectId: this.readString('agentRuntimeAutoscaler.projectId'),
      environmentId: this.readString('agentRuntimeAutoscaler.environmentId'),
      serviceId: this.readString('agentRuntimeAutoscaler.serviceId'),
      region: this.readString('agentRuntimeAutoscaler.region') || DEFAULT_REGION,
      apiToken,
      apiTokenType: tokenType === 'project' ? 'project' : 'bearer',
    }
  }

  private missingConfig(config: AgentRuntimeAutoscalerRuntimeConfig): string[] {
    const missing: string[] = []
    if (!config.projectId) missing.push('RAILWAY_AUTOSCALER_PROJECT_ID')
    if (!config.environmentId) missing.push('RAILWAY_AUTOSCALER_ENVIRONMENT_ID')
    if (!config.serviceId) missing.push('RAILWAY_AUTOSCALER_SERVICE_ID')
    if (!config.region) missing.push('RAILWAY_AUTOSCALER_REGION')
    if (!config.apiToken) missing.push('RAILWAY_PROJECT_TOKEN or RAILWAY_API_TOKEN')
    return missing
  }

  private readString(key: string): string {
    return String(this.configService.get<string>(key) || '').trim()
  }

  private readBoolean(key: string, fallback: boolean): boolean {
    const value = this.configService.get<boolean | string>(key)
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value.toLowerCase() === 'true'
    return fallback
  }

  private readMode(key: string, fallback: AgentRuntimeAutoscalerMode): AgentRuntimeAutoscalerMode {
    const value = this.readString(key)
    return value === 'active' || value === 'dry_run' || value === 'off' ? value : fallback
  }

  private readPositiveInteger(key: string, fallback: number): number {
    return readPositiveNumber(this.configService.get<number | string>(key), fallback)
  }

  private reportAutoscalerError(errorCode: string, label: string, error: unknown): void {
    const message = formatError(error)
    this.logger.error(`${label}: ${message}`)
    void this.workerLogger?.logError({
      app: 'mission-worker',
      severity: 'error',
      feature: 'agent_runtime_autoscaler',
      error_code: errorCode,
      message: `${label}: ${message}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { instance_id: this.instanceId },
    })
  }
}

function readCount(value: number | undefined): number {
  return Number.isFinite(value) && value ? value : 0
}

function readPositiveNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
