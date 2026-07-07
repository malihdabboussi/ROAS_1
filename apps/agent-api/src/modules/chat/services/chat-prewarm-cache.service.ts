import { createHash } from 'node:crypto'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import Redis, { type RedisOptions } from 'ioredis'
import { resolveAgentRuntimeRedisUrl } from '@vibey/api-shared'
import { readPositiveInt } from './chat-run-event-store-utils'

export interface ChatPrewarmCacheKeyParts {
  kind?: 'agent' | 'conversation'
  userId: string
  orgId?: string | null
  conversationId?: string | null
  agentKey?: string | null
  campaignId?: string | null
  spaceId?: string | null
  scopeKind?: string | null
  model?: string | null
  modelSettings?: unknown
  source?: string | null
}

interface ChatPrewarmCacheOptions {
  ttlMs?: number
  maxEntries?: number
  now?: () => number
  redis?: ChatPrewarmRedisClient | null
  redisEnabled?: boolean
  redisWaitMs?: number
  redisPollMs?: number
  redisLockTtlMs?: number
}

interface CompletedCacheEntry {
  value: unknown
  expiresAt: number
}

interface InFlightCacheEntry {
  promise: Promise<ChatPrewarmCacheResult<unknown>>
}

interface ChatPrewarmRedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: unknown[]): Promise<string | null>
  del(key: string): Promise<number>
  quit?: () => Promise<unknown>
  on?: (event: string, handler: (err?: Error) => void) => unknown
}

export interface ChatPrewarmCacheCodec<T> {
  serialize(value: T): string
  deserialize(value: string): T
}

export type ChatPrewarmCacheStatus = 'hit_completed' | 'joined_in_flight' | 'built_on_send'
export type ChatPrewarmCacheStore = 'memory' | 'redis'

export interface ChatPrewarmCacheResult<T> {
  cacheKey: string
  reused: boolean
  cacheStatus: ChatPrewarmCacheStatus
  store: ChatPrewarmCacheStore
  value: T
}

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stableJson(item))
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    out[key] = stableJson((value as Record<string, unknown>)[key])
  }
  return out
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

@Injectable()
export class ChatPrewarmCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatPrewarmCacheService.name)
  private ttlMs = readPositiveInt(process.env.CHAT_PREWARM_CACHE_TTL_MS, 60_000)
  private maxEntries = readPositiveInt(process.env.CHAT_PREWARM_CACHE_MAX_ENTRIES, 200)
  private redisWaitMs = readPositiveInt(process.env.CHAT_PREWARM_REDIS_WAIT_MS, 5_000)
  private redisPollMs = readPositiveInt(process.env.CHAT_PREWARM_REDIS_POLL_MS, 100)
  private redisLockTtlMs = readPositiveInt(process.env.CHAT_PREWARM_REDIS_LOCK_TTL_MS, 10_000)
  private now: () => number = () => Date.now()
  private readonly completed = new Map<string, CompletedCacheEntry>()
  private readonly inFlight = new Map<string, InFlightCacheEntry>()
  private redis: ChatPrewarmRedisClient | null = null
  private redisUnavailable = false
  private warnedRedisUnavailable = false
  private redisPrefix = process.env.CHAT_PREWARM_REDIS_PREFIX?.trim() || 'chat:prewarm:v1'

  constructor() {
    const driver = (process.env.CHAT_PREWARM_CACHE_DRIVER ?? '').trim().toLowerCase()
    if (driver === 'memory') return

    const redisUrl = resolveAgentRuntimeRedisUrl(process.env)
    const redisHost = process.env.REDIS_HOST?.trim()
    const hasHostConfig = Boolean(
      redisHost || process.env.REDIS_PORT?.trim() || process.env.REDIS_PASSWORD?.trim(),
    )
    if (redisUrl) {
      this.redis = new Redis(redisUrl, this.redisOptions())
    } else if (driver === 'redis' || hasHostConfig) {
      this.redis = new Redis({
        host: redisHost || 'localhost',
        port: readPositiveInt(process.env.REDIS_PORT, 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        ...this.redisOptions(),
      })
    }

    this.redis?.on?.('error', (err) => {
      this.redisUnavailable = true
      this.warnRedisUnavailable(`Redis prewarm cache connection error: ${err?.message ?? err}`)
    })
    this.redis?.on?.('ready', () => {
      this.redisUnavailable = false
      this.warnedRedisUnavailable = false
      this.logger.log('[ChatPrewarmRedis] ready')
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit?.().catch(() => undefined)
  }

  configureForTests(options: ChatPrewarmCacheOptions = {}): this {
    this.ttlMs = options.ttlMs ?? 60_000
    this.maxEntries = options.maxEntries ?? 200
    this.redisWaitMs = options.redisWaitMs ?? 5_000
    this.redisPollMs = options.redisPollMs ?? 100
    this.redisLockTtlMs = options.redisLockTtlMs ?? 10_000
    this.now = options.now ?? (() => Date.now())
    this.redis = options.redis ?? null
    this.redisUnavailable = options.redisEnabled === false
    this.warnedRedisUnavailable = false
    this.clear()
    return this
  }

  createKey(parts: ChatPrewarmCacheKeyParts): string {
    return JSON.stringify({
      kind: parts.kind ?? 'conversation',
      userId: normalizeString(parts.userId),
      orgId: normalizeString(parts.orgId),
      conversationId: normalizeString(parts.conversationId),
      agentKey: normalizeString(parts.agentKey),
      campaignId: normalizeString(parts.campaignId),
      spaceId: normalizeString(parts.spaceId),
      scopeKind: normalizeString(parts.scopeKind),
      model: normalizeString(parts.model),
      modelSettings: stableJson(parts.modelSettings ?? null),
      source: normalizeString(parts.source),
    })
  }

  get<T>(cacheKey: string): T | null {
    const entry = this.completed.get(cacheKey)
    if (!entry) return null
    if (entry.expiresAt <= this.now()) {
      this.completed.delete(cacheKey)
      return null
    }
    this.completed.delete(cacheKey)
    this.completed.set(cacheKey, entry)
    return entry.value as T
  }

  set<T>(cacheKey: string, value: T): void {
    this.completed.set(cacheKey, { value, expiresAt: this.now() + this.ttlMs })
    this.evictOverflow()
  }

  clear(cacheKey?: string): void {
    if (cacheKey) {
      this.completed.delete(cacheKey)
      this.inFlight.delete(cacheKey)
      return
    }
    this.completed.clear()
    this.inFlight.clear()
  }

  async getOrBuild<T>(
    cacheKey: string,
    builder: () => Promise<T>,
    codec?: ChatPrewarmCacheCodec<T>,
  ): Promise<ChatPrewarmCacheResult<T>> {
    return this.getOrBuildDetailed(cacheKey, builder, codec)
  }

  async getOrBuildDetailed<T>(
    cacheKey: string,
    builder: () => Promise<T>,
    codec?: ChatPrewarmCacheCodec<T>,
  ): Promise<ChatPrewarmCacheResult<T>> {
    const cached = this.get<T>(cacheKey)
    if (cached !== null) {
      return {
        cacheKey,
        reused: true,
        cacheStatus: 'hit_completed',
        store: 'memory',
        value: cached,
      }
    }

    const existing = this.inFlight.get(cacheKey)
    if (existing) {
      const result = (await existing.promise) as ChatPrewarmCacheResult<T>
      return {
        ...result,
        reused: true,
        cacheStatus: 'joined_in_flight',
      }
    }

    const promise = this.buildOrJoinDistributed(cacheKey, builder, codec)
    this.inFlight.set(cacheKey, { promise: promise as Promise<ChatPrewarmCacheResult<unknown>> })
    try {
      return await promise
    } finally {
      this.inFlight.delete(cacheKey)
    }
  }

  private async buildOrJoinDistributed<T>(
    cacheKey: string,
    builder: () => Promise<T>,
    codec?: ChatPrewarmCacheCodec<T>,
  ): Promise<ChatPrewarmCacheResult<T>> {
    const redis = this.getRedis()
    if (redis && codec) {
      const redisHit = await this.readRedisValue(cacheKey, codec)
      if (redisHit !== null) {
        this.set(cacheKey, redisHit)
        return {
          cacheKey,
          reused: true,
          cacheStatus: 'hit_completed',
          store: 'redis',
          value: redisHit,
        }
      }

      const lockKey = this.redisLockKey(cacheKey)
      const lockToken = `${process.pid}:${this.now()}:${Math.random()}`
      const lockAcquired = await redis
        .set(lockKey, lockToken, 'PX', this.redisLockTtlMs, 'NX')
        .catch((err) => {
          this.markRedisUnavailable(`Redis prewarm lock failed: ${String(err)}`)
          return null
        })
      if (lockAcquired === 'OK') {
        try {
          const value = await builder()
          this.set(cacheKey, value)
          await this.writeRedisValue(cacheKey, value, codec)
          return {
            cacheKey,
            reused: false,
            cacheStatus: 'built_on_send',
            store: 'redis',
            value,
          }
        } finally {
          const currentLock = await redis.get(lockKey).catch((err) => {
            this.markRedisUnavailable(`Redis prewarm lock read failed: ${String(err)}`)
            return null
          })
          if (currentLock === lockToken) {
            await redis.del(lockKey).catch((err) => {
              this.markRedisUnavailable(`Redis prewarm lock release failed: ${String(err)}`)
            })
          }
        }
      }

      const joined = await this.waitForRedisValue(cacheKey, codec)
      if (joined !== null) {
        this.set(cacheKey, joined)
        return {
          cacheKey,
          reused: true,
          cacheStatus: 'joined_in_flight',
          store: 'redis',
          value: joined,
        }
      }
    }

    const value = await builder()
    this.set(cacheKey, value)
    if (redis && codec) await this.writeRedisValue(cacheKey, value, codec)
    return {
      cacheKey,
      reused: false,
      cacheStatus: 'built_on_send',
      store: redis && codec ? 'redis' : 'memory',
      value,
    }
  }

  private async readRedisValue<T>(
    cacheKey: string,
    codec: ChatPrewarmCacheCodec<T>,
  ): Promise<T | null> {
    const redis = this.getRedis()
    if (!redis) return null
    const raw = await redis.get(this.redisValueKey(cacheKey)).catch((err) => {
      this.markRedisUnavailable(`Redis prewarm read failed: ${String(err)}`)
      return null
    })
    if (!raw) return null
    try {
      return codec.deserialize(raw)
    } catch (err) {
      this.logger.warn(`[ChatPrewarmRedis] cached value decode failed: ${String(err)}`)
      return null
    }
  }

  private async writeRedisValue<T>(
    cacheKey: string,
    value: T,
    codec: ChatPrewarmCacheCodec<T>,
  ): Promise<void> {
    const redis = this.getRedis()
    if (!redis) return
    await redis
      .set(this.redisValueKey(cacheKey), codec.serialize(value), 'PX', this.ttlMs)
      .catch((err) => {
        this.markRedisUnavailable(`Redis prewarm write failed: ${String(err)}`)
      })
  }

  private async waitForRedisValue<T>(
    cacheKey: string,
    codec: ChatPrewarmCacheCodec<T>,
  ): Promise<T | null> {
    const startedAt = this.now()
    while (this.now() - startedAt < this.redisWaitMs) {
      await sleep(this.redisPollMs)
      const value = await this.readRedisValue(cacheKey, codec)
      if (value !== null) return value
    }
    return null
  }

  private getRedis(): ChatPrewarmRedisClient | null {
    return this.redis && !this.redisUnavailable ? this.redis : null
  }

  private redisValueKey(cacheKey: string): string {
    return `${this.redisPrefix}:${this.hashKey(cacheKey)}`
  }

  private redisLockKey(cacheKey: string): string {
    return `${this.redisValueKey(cacheKey)}:lock`
  }

  private hashKey(cacheKey: string): string {
    return createHash('sha256').update(cacheKey).digest('hex')
  }

  private evictOverflow(): void {
    while (this.completed.size > this.maxEntries) {
      const oldest = this.completed.keys().next().value as string | undefined
      if (!oldest) return
      this.completed.delete(oldest)
    }
  }

  private redisOptions(): RedisOptions {
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

  private markRedisUnavailable(message: string): void {
    this.redisUnavailable = true
    this.warnRedisUnavailable(message)
  }

  private warnRedisUnavailable(message: string): void {
    if (this.warnedRedisUnavailable) return
    this.warnedRedisUnavailable = true
    this.logger.warn(`[ChatPrewarmRedis] ${message}`)
  }
}
