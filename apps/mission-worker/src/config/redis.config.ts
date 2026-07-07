import type { ConfigService } from '@nestjs/config'
import type { ConnectionOptions } from 'bullmq'

function createRetryStrategy(times: number): number {
  return Math.min(times * 500, 60000)
}

function shouldReconnectOnError(err: Error): boolean {
  const reconnectableErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'READONLY']
  return reconnectableErrors.some((code) => err.message?.includes(code))
}

export function getRedisConnection(configService: ConfigService): ConnectionOptions {
  const redisUrl = configService.get<string>('redis.url')

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
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      username: url.username || undefined,
      ...resilienceOptions,
    }
  }

  return {
    host: configService.get<string>('redis.host') || 'localhost',
    port: configService.get<number>('redis.port') || 6379,
    password: configService.get<string>('redis.password') || undefined,
    ...resilienceOptions,
  }
}
