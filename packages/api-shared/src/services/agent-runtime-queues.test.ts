import { describe, expect, it } from 'vitest'
import {
  AGENT_RUNTIME_BRAIN_IMPORT_QUEUE,
  AGENT_RUNTIME_QUEUE_NAMES,
  resolveAgentRuntimeRedisPrefix,
  resolveAgentRuntimeRedisUrl,
} from './agent-runtime-queues'

describe('agent runtime queues', () => {
  it('keeps canonical queue names stable', () => {
    expect(AGENT_RUNTIME_QUEUE_NAMES).toMatchObject({
      chat: 'agent-runtime-queue-chat',
      brain: 'agent-runtime-queue-brain',
      brain_import: 'agent-runtime-queue-brain-import',
      mission: 'agent-runtime-queue-mission',
      artifact: 'agent-runtime-queue-artifact',
      automation: 'agent-runtime-queue-automation',
      sub_agent: 'agent-runtime-queue-subagent',
    })
    expect(AGENT_RUNTIME_BRAIN_IMPORT_QUEUE).toBe('agent-runtime-queue-brain-import')
  })

  it('resolves runtime Redis URL by production precedence', () => {
    expect(
      resolveAgentRuntimeRedisUrl({
        REDIS_URL_AGENT_QUEUE: ' redis://queue.redis.local ',
        REDIS_URL_AGENT_STREAM: 'redis://stream.redis.local',
        REDIS_URL_MISSIONS: 'redis://missions.redis.local',
        REDIS_URL: 'redis://default.redis.local',
      }),
    ).toBe('redis://queue.redis.local')

    expect(
      resolveAgentRuntimeRedisUrl({
        REDIS_URL_AGENT_QUEUE: '',
        REDIS_URL_AGENT_STREAM: 'redis://stream.redis.local',
        REDIS_URL_MISSIONS: 'redis://missions.redis.local',
        REDIS_URL: 'redis://default.redis.local',
      }),
    ).toBe('redis://stream.redis.local')

    expect(
      resolveAgentRuntimeRedisUrl({
        REDIS_URL_AGENT_QUEUE: '',
        REDIS_URL_AGENT_STREAM: '',
        REDIS_URL_MISSIONS: 'redis://missions.redis.local',
        REDIS_URL: 'redis://default.redis.local',
      }),
    ).toBe('redis://missions.redis.local')
  })

  it('uses the shared BullMQ prefix fallback', () => {
    expect(resolveAgentRuntimeRedisPrefix({ REDIS_QUEUE_PREFIX: ' runtime-bull ' })).toBe(
      'runtime-bull',
    )
    expect(resolveAgentRuntimeRedisPrefix({ REDIS_QUEUE_PREFIX: '' })).toBe('bull')
  })
})
