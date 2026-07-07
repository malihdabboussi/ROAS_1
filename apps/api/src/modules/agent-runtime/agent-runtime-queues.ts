import type { ConfigService } from '@nestjs/config'
import {
  AGENT_RUNTIME_AUTOMATION_QUEUE,
  AGENT_RUNTIME_BRAIN_IMPORT_QUEUE,
  AGENT_RUNTIME_REDIS_URL_ENV_KEYS,
  resolveAgentRuntimeRedisPrefix,
  resolveAgentRuntimeRedisUrl,
  type AgentRuntimeEnv,
} from '@vibey/api-shared'
import type { ConnectionOptions } from 'bullmq'

export { AGENT_RUNTIME_AUTOMATION_QUEUE, AGENT_RUNTIME_BRAIN_IMPORT_QUEUE }

function readEnv(configService: ConfigService, key: string): string {
  return configService.get<string>(key)?.trim() || process.env[key]?.trim() || ''
}

function createRetryStrategy(times: number): number {
  return Math.min(times * 500, 60000)
}

function shouldReconnectOnError(err: Error): boolean {
  const reconnectableErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'READONLY']
  return reconnectableErrors.some((code) => err.message?.includes(code))
}

export function getAgentRuntimeRedisConnection(configService: ConfigService): ConnectionOptions {
  const redisUrl = resolveAgentRuntimeRedisUrl(readAgentRuntimeEnv(configService))

  const resilienceOptions: Partial<ConnectionOptions> = {
    retryStrategy: createRetryStrategy,
    reconnectOnError: shouldReconnectOnError,
    keepAlive: 30000,
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
    lazyConnect: false,
    enableOfflineQueue: true,
  }

  if (redisUrl) {
    const url = new URL(redisUrl)
    return {
      host: url.hostname,
      port: Number.parseInt(url.port, 10) || 6379,
      username: url.username || undefined,
      password: url.password || undefined,
      ...resilienceOptions,
    }
  }

  return {
    host: readEnv(configService, 'REDIS_HOST') || 'localhost',
    port: Number.parseInt(readEnv(configService, 'REDIS_PORT'), 10) || 6379,
    password: readEnv(configService, 'REDIS_PASSWORD') || undefined,
    ...resilienceOptions,
  }
}

export function getAgentRuntimeRedisPrefix(configService: ConfigService): string {
  return resolveAgentRuntimeRedisPrefix(readAgentRuntimeEnv(configService))
}

function readAgentRuntimeEnv(configService: ConfigService): AgentRuntimeEnv {
  const env: AgentRuntimeEnv = {
    REDIS_QUEUE_PREFIX: readEnv(configService, 'REDIS_QUEUE_PREFIX'),
  }
  for (const key of AGENT_RUNTIME_REDIS_URL_ENV_KEYS) {
    env[key] = readEnv(configService, key)
  }
  return env
}
