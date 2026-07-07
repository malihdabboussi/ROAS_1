import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatRunEventStoreService } from './chat-run-event-store.service'

const flushPromises = () => new Promise((resolve) => setImmediate(resolve))

const redisMocks = vi.hoisted(() => {
  const instances: Array<any> = []
  const create = () => {
    const multi = {
      hset: vi.fn(() => multi),
      set: vi.fn(() => multi),
      expire: vi.fn(() => multi),
      del: vi.fn(() => multi),
      exec: vi.fn(async () => []),
    }
    const mock = {
      status: 'ready',
      on: vi.fn(),
      quit: vi.fn(async () => undefined),
      connect: vi.fn(async () => undefined),
      set: vi.fn(async () => 'OK'),
      get: vi.fn(async () => null),
      del: vi.fn(async () => 1),
      hgetall: vi.fn(async () => ({})),
      xadd: vi.fn(async () => '1-0'),
      xread: vi.fn(async () => [
        [
          'chat:run:run-1:events',
          [
            [
              '1-0',
              [
                'type',
                'content_delta',
                'payload',
                '{"content":"hello"}',
                'createdAt',
                '2026-06-08T10:00:00.000Z',
              ],
            ],
          ],
        ],
      ]),
      multi: vi.fn(() => multi),
      __multi: multi,
    }
    instances.push(mock)
    return mock
  }
  return { create, instances }
})

vi.mock('ioredis', () => ({
  default: vi.fn(() => redisMocks.create()),
}))

const redisWriter = () => redisMocks.instances[0]
const redisReader = () => redisMocks.instances[1]

describe('ChatRunEventStoreService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    redisMocks.instances.length = 0
  })

  it('stays unavailable when no Redis stream env is configured', async () => {
    vi.stubEnv('REDIS_URL_AGENT_STREAM', '')
    vi.stubEnv('REDIS_URL', '')
    vi.stubEnv('REDIS_HOST', '')
    vi.stubEnv('REDIS_PORT', '')
    vi.stubEnv('REDIS_PASSWORD', '')

    const service = new ChatRunEventStoreService()

    expect(service.isAvailable()).toBe(false)
    await expect(
      service.appendEvent({ runId: 'run-1', type: 'content_delta', payload: { content: 'x' } }),
    ).resolves.toBeNull()
  })

  it('appends and reads run events with Redis stream cursors', async () => {
    vi.stubEnv('REDIS_URL_AGENT_STREAM', 'redis://localhost:6379')
    const service = new ChatRunEventStoreService()

    await service.startRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: null,
    })
    const event = await service.appendEvent({
      runId: 'run-1',
      type: 'content_delta',
      payload: { content: 'hello' },
    })
    const events = await service.readAfter('run-1', '0-0', 10)

    expect(event?.cursor).toBe('1-0')
    expect(redisWriter().xadd).toHaveBeenCalledWith(
      'chat:run:run-1:events',
      'MAXLEN',
      '~',
      '20000',
      '*',
      'type',
      'content_delta',
      'payload',
      '{"content":"hello"}',
      'createdAt',
      expect.any(String),
    )
    expect(redisWriter().xread).not.toHaveBeenCalled()
    expect(redisReader().xadd).not.toHaveBeenCalled()
    expect(redisReader().xread).toHaveBeenCalledWith(
      'BLOCK',
      10,
      'STREAMS',
      'chat:run:run-1:events',
      '0-0',
    )
    expect(events[0]).toEqual({
      runId: 'run-1',
      cursor: '1-0',
      type: 'content_delta',
      payload: { content: 'hello' },
      createdAt: '2026-06-08T10:00:00.000Z',
    })
  })

  it('persists chat run lifecycle rows when a service client is available', async () => {
    const upsert = vi.fn(async () => ({ error: null }))
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ upsert, update }))
    const service = new ChatRunEventStoreService({ client: { from } } as any)

    await service.startRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: 'org-1',
    })
    await flushPromises()
    await service.markRunDone('run-1')

    expect(from).toHaveBeenCalledWith('agent_runtime_runs')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        run_id: 'run-1',
        idempotency_key: 'chat:run-1',
        workload_type: 'chat',
        status: 'active',
        conversation_id: 'conversation-1',
        message_id: 'message-1',
        user_id: 'user-1',
        org_id: 'org-1',
        priority: 100,
        completed_at: null,
        failed_at: null,
        cancelled_at: null,
        ended_at: null,
        error: null,
        observability: {},
        metadata: { execution_mode: 'direct', request_id: null },
      }),
      { onConflict: 'run_id' },
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'done',
        completed_at: expect.any(String),
        failed_at: null,
        ended_at: expect.any(String),
        error: null,
      }),
    )
    expect(eq).toHaveBeenCalledWith('run_id', 'run-1')
  })

  it('persists queued runs with a null message_id and backfills it via attachRunMessage', async () => {
    const upsert = vi.fn(async () => ({ error: null }))
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ upsert, update }))
    const service = new ChatRunEventStoreService({ client: { from } } as any)

    await service.startRun(
      {
        runId: 'run-1',
        conversationId: 'conversation-1',
        messageId: 'message-1',
        userId: 'user-1',
        orgId: null,
        executionMode: 'queued',
      },
      { awaitPersist: true, skipShadowQueue: true },
    )
    await service.attachRunMessage('run-1', 'message-1')

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        run_id: 'run-1',
        message_id: null,
        payload: {
          conversation_id: 'conversation-1',
          message_id: 'message-1',
          request_id: null,
        },
        observability: {},
        metadata: { execution_mode: 'queued', request_id: null },
      }),
      { onConflict: 'run_id' },
    )
    expect(update).toHaveBeenCalledWith({ message_id: 'message-1' })
    expect(eq).toHaveBeenCalledWith('run_id', 'run-1')
  })

  it('includes routing observability in the first direct run upsert', async () => {
    const upsert = vi.fn(async () => ({ error: null }))
    const from = vi.fn(() => ({ upsert }))
    const service = new ChatRunEventStoreService({ client: { from } } as any)

    await service.startRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'vibey',
      gatewayAgentId: 'org-1-vibey',
      observability: {
        chat_model_routing: {
          requested_model_id: 'anthropic-subscription/claude-sonnet-4-6',
          gateway_model_id: 'anthropic-subscription/claude-sonnet-4-6',
          subscription_provider: 'anthropic_claude',
        },
      },
    })
    await flushPromises()

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_key: 'vibey',
        gateway_agent_id: 'org-1-vibey',
        observability: {
          chat_model_routing: {
            requested_model_id: 'anthropic-subscription/claude-sonnet-4-6',
            gateway_model_id: 'anthropic-subscription/claude-sonnet-4-6',
            subscription_provider: 'anthropic_claude',
          },
        },
      }),
      { onConflict: 'run_id' },
    )
  })

  it('persists runtime routing observability for trace triage', async () => {
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const service = new ChatRunEventStoreService({ client: { from } } as any)

    await service.recordRunRouting({
      runId: 'run-1',
      agentKey: 'vibey',
      gatewayAgentId: 'org-1-vibey',
      observability: {
        chat_model_routing: {
          requested_model_id: 'openai-codex/gpt-5.5',
          gateway_model_id: 'openai-codex/gpt-5.5',
          subscription_provider: 'openai_codex',
        },
      },
    })

    expect(update).toHaveBeenCalledWith({
      agent_key: 'vibey',
      gateway_agent_id: 'org-1-vibey',
      observability: {
        chat_model_routing: {
          requested_model_id: 'openai-codex/gpt-5.5',
          gateway_model_id: 'openai-codex/gpt-5.5',
          subscription_provider: 'openai_codex',
        },
      },
    })
    expect(eq).toHaveBeenCalledWith('run_id', 'run-1')
  })

  it('persists recoverable failure terminal status', async () => {
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const service = new ChatRunEventStoreService({ client: { from } } as any)

    await service.markRunRecoverableFailed('run-1', 'context_window_exceeded')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed_recoverable',
        completed_at: null,
        failed_at: expect.any(String),
        cancelled_at: null,
        ended_at: expect.any(String),
        error: 'context_window_exceeded',
      }),
    )
    expect(eq).toHaveBeenCalledWith('run_id', 'run-1')
  })

  it('shadow-enqueues chat runtime jobs only after the durable start row is persisted', async () => {
    const upsert = vi.fn(async () => ({ error: null }))
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ upsert, update }))
    const enqueueChatShadowRun = vi.fn(async () => ({
      queueName: 'agent-runtime-queue-chat',
      jobId: 'chat-run-1-shadow',
      enqueuedAt: '2026-06-08T10:00:00.000Z',
    }))
    const service = new ChatRunEventStoreService(
      { client: { from } } as any,
      { enqueueChatShadowRun } as any,
    )

    await service.startRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: null,
    })
    await flushPromises()
    await flushPromises()

    expect(upsert).toHaveBeenCalled()
    expect(enqueueChatShadowRun).toHaveBeenCalledWith({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: null,
    })
    expect(update).toHaveBeenCalledWith({
      queue_name: 'agent-runtime-queue-chat',
      job_id: 'chat-run-1-shadow',
    })
    expect(eq).toHaveBeenCalledWith('run_id', 'run-1')
  })

  it('enqueues real chat runs and persists queue metadata', async () => {
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const enqueueChatRun = vi.fn(async () => ({
      queueName: 'agent-runtime-queue-chat',
      jobId: 'chat-run-1',
      enqueuedAt: '2026-06-08T10:00:00.000Z',
    }))
    const isExecutionEnabled = vi.fn(() => true)
    const service = new ChatRunEventStoreService(
      { client: { from } } as any,
      { enqueueChatRun, isExecutionEnabled } as any,
    )

    const result = await service.enqueueChatRun({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: null,
      content: 'Hello',
      accessToken: 'access-token',
    })

    expect(result).toEqual({
      queueName: 'agent-runtime-queue-chat',
      jobId: 'chat-run-1',
      enqueuedAt: '2026-06-08T10:00:00.000Z',
    })
    expect(service.isRuntimeQueueExecutionEnabled()).toBe(true)
    expect(enqueueChatRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        content: 'Hello',
        accessToken: 'access-token',
      }),
    )
    expect(update).toHaveBeenCalledWith({
      queue_name: 'agent-runtime-queue-chat',
      job_id: 'chat-run-1',
    })
    expect(eq).toHaveBeenCalledWith('run_id', 'run-1')
  })

  it('cancels active runs and releases Redis conversation gates', async () => {
    vi.stubEnv('REDIS_URL_AGENT_STREAM', 'redis://localhost:6379')
    const service = new ChatRunEventStoreService()
    redisWriter().hgetall.mockResolvedValueOnce({
      runId: 'run-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
      orgId: '',
      status: 'active',
      lastCursor: '',
      startedAt: '2026-06-08T10:00:00.000Z',
      endedAt: '',
      error: '',
    })

    await service.cancelRun('run-1', 'cancelled by user')

    expect(redisWriter().xadd).toHaveBeenCalledWith(
      'chat:run:run-1:events',
      'MAXLEN',
      '~',
      '20000',
      '*',
      'type',
      'error',
      'payload',
      '{"code":"cancelled","message":"cancelled by user"}',
      'createdAt',
      expect.any(String),
    )
    expect(redisWriter().__multi.hset).toHaveBeenCalledWith(
      'chat:run:run-1:meta',
      expect.objectContaining({
        status: 'cancelled',
        error: 'cancelled by user',
      }),
    )
    expect(redisWriter().__multi.del).toHaveBeenCalledWith(
      'chat:conversation:conversation-1:active_run',
    )
    expect(redisWriter().__multi.del).toHaveBeenCalledWith('chat:conversation:conversation-1:lock')
  })
})
