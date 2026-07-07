import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentRuntimeChatProcessor } from './agent-runtime-chat-shadow.processor'

function makeDatabase() {
  const eq = vi.fn(async () => ({ error: null }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return {
    database: {
      getClient: vi.fn(() => ({ from })),
    },
    from,
    update,
    eq,
  }
}

function makeConfig() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'missionApi.agentApiUrl') return 'http://agent-api.local/'
      if (key === 'missionApi.internalToken') return 'internal-token'
      return undefined
    }),
  }
}

function makeRedis() {
  const multi = {
    hset: vi.fn(() => multi),
    set: vi.fn(() => multi),
    expire: vi.fn(() => multi),
    exec: vi.fn(async () => []),
  }
  const redis = {
    xadd: vi.fn(async () => '2-0'),
    multi: vi.fn(() => multi),
  }
  return { redis, multi }
}

describe('AgentRuntimeChatProcessor', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('keeps shadow jobs as claim-only proof jobs', async () => {
    const { database, update } = makeDatabase()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const processor = new AgentRuntimeChatProcessor(database as never, makeConfig() as never)

    const result = await processor.process({
      id: 'chat-run-1-shadow',
      name: 'shadow-chat-run',
      timestamp: Date.now(),
      data: {
        runId: 'run-1',
        conversationId: 'conversation-1',
        messageId: 'message-1',
        userId: 'user-1',
        orgId: null,
        workload: 'chat',
        shadow: true,
        enqueuedAt: '2026-06-09T10:00:00.000Z',
      },
    } as never)

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        runId: 'run-1',
        shadow: true,
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.not.objectContaining({
        status: 'running',
      }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('claims and executes real chat jobs through the internal Agent API', async () => {
    const { database, update } = makeDatabase()
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: vi.fn(async () =>
        [
          JSON.stringify({ type: 'heartbeat' }),
          JSON.stringify({ type: 'terminal', status: 'done', run_id: 'run-1' }),
        ].join('\n'),
      ),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const processor = new AgentRuntimeChatProcessor(database as never, makeConfig() as never)

    const result = await processor.process({
      id: 'chat-run-1',
      name: 'chat-run',
      timestamp: Date.now(),
      data: {
        runId: 'run-1',
        conversationId: 'conversation-1',
        messageId: 'message-1',
        userId: 'user-1',
        orgId: 'org-1',
        workload: 'chat',
        shadow: false,
        enqueuedAt: '2026-06-09T10:00:00.000Z',
        content: 'Hello',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    } as never)

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        runId: 'run-1',
        shadow: false,
        status: 'done',
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'running',
        queue_name: 'agent-runtime-queue-chat',
        job_id: 'chat-run-1',
        worker_id: expect.any(String),
        claimed_at: expect.any(String),
        heartbeat_at: expect.any(String),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://agent-api.local/api/internal/chat/runs/run-1/execute',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-token': 'internal-token',
        }),
        body: expect.any(String),
      }),
    )
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as Record<string, unknown>
    expect(body).toEqual(
      expect.objectContaining({
        runId: 'run-1',
        conversationId: 'conversation-1',
        content: 'Hello',
        accessToken: 'access-token',
      }),
    )
  })

  it('preserves queued chat runs for recovery when the internal bridge is terminated', async () => {
    const { database, update } = makeDatabase()
    const { redis, multi } = makeRedis()
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: vi.fn(async () => {
        throw new TypeError('terminated')
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const processor = new AgentRuntimeChatProcessor(database as never, makeConfig() as never)
    vi.spyOn(
      processor as unknown as { getRedis: () => Promise<unknown> },
      'getRedis',
    ).mockResolvedValue(redis)

    const result = await processor.process({
      id: 'chat-run-1',
      name: 'chat-run',
      timestamp: Date.now(),
      data: {
        runId: 'run-1',
        conversationId: 'conversation-1',
        messageId: 'message-1',
        userId: 'user-1',
        orgId: 'org-1',
        workload: 'chat',
        shadow: false,
        enqueuedAt: '2026-06-09T10:00:00.000Z',
        content: 'Hello',
        accessToken: 'access-token',
      },
    } as never)

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        runId: 'run-1',
        shadow: false,
        status: 'interrupted',
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'running',
        heartbeat_at: expect.any(String),
        error: 'terminated',
      }),
    )
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(redis.xadd).toHaveBeenCalledWith(
      'chat:run:run-1:events',
      'MAXLEN',
      '~',
      expect.any(String),
      '*',
      'type',
      'error',
      'payload',
      expect.stringContaining('stream_interrupted'),
      'createdAt',
      expect.any(String),
    )
    expect(multi.hset).toHaveBeenCalledWith(
      'chat:run:run-1:meta',
      expect.objectContaining({
        status: 'active',
        lastCursor: '2-0',
        error: 'terminated',
      }),
    )
    expect(multi.set).toHaveBeenCalledWith(
      'chat:conversation:conversation-1:active_run',
      'run-1',
      'EX',
      expect.any(Number),
    )
    expect(multi.set).toHaveBeenCalledWith(
      'chat:conversation:conversation-1:lock',
      '1',
      'EX',
      expect.any(Number),
    )
  })
})
