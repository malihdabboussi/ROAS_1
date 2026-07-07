import { afterEach, describe, expect, it, vi } from 'vitest'
import { AGENT_RUNTIME_QUEUE_NAMES, AgentRuntimeQueueService } from './agent-runtime-queue.service'

const bullmqMock = vi.hoisted(() => {
  const queue = {
    add: vi.fn(async () => ({ id: 'job-1' })),
    close: vi.fn(async () => undefined),
  }
  return {
    queue,
    Queue: vi.fn(() => queue),
  }
})

vi.mock('bullmq', () => ({
  Queue: bullmqMock.Queue,
}))

describe('AgentRuntimeQueueService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('does not create a BullMQ queue when shadow enqueue is disabled', async () => {
    const service = new AgentRuntimeQueueService()

    const result = await service.enqueueChatShadowRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: null,
    })

    expect(result).toBeNull()
    expect(bullmqMock.Queue).not.toHaveBeenCalled()
  })

  it('returns null when shadow enqueue is enabled without Redis configuration', async () => {
    vi.stubEnv('AGENT_RUNTIME_QUEUE_SHADOW', '1')
    vi.stubEnv('REDIS_URL_AGENT_QUEUE', '')
    vi.stubEnv('REDIS_URL_AGENT_STREAM', '')
    vi.stubEnv('REDIS_URL_MISSIONS', '')
    vi.stubEnv('REDIS_URL', '')
    vi.stubEnv('REDIS_HOST', '')
    vi.stubEnv('REDIS_PORT', '')
    vi.stubEnv('REDIS_PASSWORD', '')
    const service = new AgentRuntimeQueueService()

    const result = await service.enqueueChatShadowRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: null,
    })

    expect(result).toBeNull()
    expect(bullmqMock.Queue).not.toHaveBeenCalled()
  })

  it('falls back to the agent stream Redis URL for shadow queue dispatch', async () => {
    vi.stubEnv('AGENT_RUNTIME_QUEUE_SHADOW', '1')
    vi.stubEnv('REDIS_URL_AGENT_QUEUE', '')
    vi.stubEnv('REDIS_URL_AGENT_STREAM', 'redis://stream-user:stream-pass@stream.redis.local:6381')
    vi.stubEnv('REDIS_QUEUE_PREFIX', 'runtime-bull')
    const service = new AgentRuntimeQueueService()

    await service.enqueueChatShadowRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: 'org-1',
    })

    expect(bullmqMock.Queue).toHaveBeenCalledWith(AGENT_RUNTIME_QUEUE_NAMES.chat, {
      connection: expect.objectContaining({
        host: 'stream.redis.local',
        port: 6381,
        username: 'stream-user',
        password: 'stream-pass',
      }),
      prefix: 'runtime-bull',
      defaultJobOptions: expect.objectContaining({
        attempts: 3,
        removeOnComplete: 1000,
        removeOnFail: 5000,
      }),
    })
  })

  it('adds deterministic chat shadow jobs to the chat runtime queue', async () => {
    vi.stubEnv('AGENT_RUNTIME_QUEUE_SHADOW', '1')
    vi.stubEnv('REDIS_URL_AGENT_QUEUE', 'redis://runtime-user:runtime-pass@redis.local:6380')
    vi.stubEnv('REDIS_QUEUE_PREFIX', 'runtime-bull')
    const service = new AgentRuntimeQueueService()

    const result = await service.enqueueChatShadowRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: 'org-1',
    })

    expect(bullmqMock.Queue).toHaveBeenCalledWith(AGENT_RUNTIME_QUEUE_NAMES.chat, {
      connection: expect.objectContaining({
        host: 'redis.local',
        port: 6380,
        username: 'runtime-user',
        password: 'runtime-pass',
      }),
      prefix: 'runtime-bull',
      defaultJobOptions: expect.objectContaining({
        attempts: 3,
        removeOnComplete: 1000,
        removeOnFail: 5000,
      }),
    })
    expect(bullmqMock.queue.add).toHaveBeenCalledWith(
      'shadow-chat-run',
      expect.objectContaining({
        runId: 'run-1',
        workload: 'chat',
        shadow: true,
        conversationId: 'conversation-1',
        messageId: 'message-1',
        userId: 'user-1',
        orgId: 'org-1',
        enqueuedAt: expect.any(String),
      }),
      expect.objectContaining({
        jobId: 'chat-run-1-shadow',
        attempts: 3,
        removeOnComplete: 1000,
        removeOnFail: 5000,
      }),
    )
    expect(result).toEqual({
      queueName: AGENT_RUNTIME_QUEUE_NAMES.chat,
      jobId: 'chat-run-1-shadow',
      enqueuedAt: expect.any(String),
    })
  })

  it('adds deterministic real chat jobs with single-attempt execution semantics', async () => {
    vi.stubEnv('AGENT_RUNTIME_QUEUE_EXECUTION', '1')
    vi.stubEnv('REDIS_URL_AGENT_STREAM', 'redis://runtime-user:runtime-pass@redis.local:6380')
    const service = new AgentRuntimeQueueService()

    const result = await service.enqueueChatRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: 'org-1',
      content: 'Hello',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      model: 'openclaw:test',
    })

    expect(service.isExecutionEnabled()).toBe(true)
    expect(bullmqMock.queue.add).toHaveBeenCalledWith(
      'chat-run',
      expect.objectContaining({
        runId: 'run-1',
        workload: 'chat',
        shadow: false,
        conversationId: 'conversation-1',
        messageId: 'message-1',
        userId: 'user-1',
        orgId: 'org-1',
        content: 'Hello',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        model: 'openclaw:test',
        enqueuedAt: expect.any(String),
      }),
      expect.objectContaining({
        jobId: 'chat-run-1',
        attempts: 1,
        backoff: undefined,
        removeOnComplete: 1000,
        removeOnFail: 5000,
      }),
    )
    expect(result).toEqual({
      queueName: AGENT_RUNTIME_QUEUE_NAMES.chat,
      jobId: 'chat-run-1',
      enqueuedAt: expect.any(String),
    })
  })
})
