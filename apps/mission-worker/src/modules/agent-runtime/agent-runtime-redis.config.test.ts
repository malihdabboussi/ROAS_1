import type { ConfigService } from '@nestjs/config'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAgentRuntimeRedisConnection,
  getAgentRuntimeRedisPrefix,
} from './agent-runtime-redis.config'

function config(values: Record<string, string | undefined>): ConfigService {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService
}

describe('agent runtime Redis config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers the dedicated runtime queue Redis URL', () => {
    const connection = getAgentRuntimeRedisConnection(
      config({
        REDIS_URL_AGENT_QUEUE: 'redis://queue-user:queue-pass@queue.redis.local:6380',
        REDIS_URL_AGENT_STREAM: 'redis://stream-user:stream-pass@stream.redis.local:6381',
      }),
    )

    expect(connection).toEqual(
      expect.objectContaining({
        host: 'queue.redis.local',
        port: 6380,
        username: 'queue-user',
        password: 'queue-pass',
      }),
    )
  })

  it('falls back to the agent stream Redis URL', () => {
    const connection = getAgentRuntimeRedisConnection(
      config({
        REDIS_URL_AGENT_QUEUE: '',
        REDIS_URL_AGENT_STREAM: 'redis://stream-user:stream-pass@stream.redis.local:6381',
      }),
    )

    expect(connection).toEqual(
      expect.objectContaining({
        host: 'stream.redis.local',
        port: 6381,
        username: 'stream-user',
        password: 'stream-pass',
      }),
    )
  })

  it('keeps mission Redis as the next fallback after agent runtime URLs', () => {
    const connection = getAgentRuntimeRedisConnection(
      config({
        REDIS_URL_AGENT_QUEUE: '',
        REDIS_URL_AGENT_STREAM: '',
        REDIS_URL_MISSIONS: 'redis://mission-user:mission-pass@missions.redis.local:6382',
      }),
    )

    expect(connection).toEqual(
      expect.objectContaining({
        host: 'missions.redis.local',
        port: 6382,
        username: 'mission-user',
        password: 'mission-pass',
      }),
    )
  })

  it('uses the shared BullMQ prefix for runtime queues', () => {
    expect(getAgentRuntimeRedisPrefix(config({ REDIS_QUEUE_PREFIX: 'runtime-bull' }))).toBe(
      'runtime-bull',
    )
    expect(getAgentRuntimeRedisPrefix(config({ REDIS_QUEUE_PREFIX: '' }))).toBe('bull')
  })
})
