import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatStatusController } from './chat-status.controller'
import { ChatStreamController } from './chat-stream.controller'
import { ChatController } from './chat.controller'
import { ChatStreamHttpService } from '../services/chat-stream-http.service'

function makeResponse() {
  return {
    req: { on: vi.fn() },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  }
}

function makeController(access = true) {
  const chatService = {
    verifyConversationAccess: vi.fn(async () => access),
    prewarmChatContext: vi.fn(async () => ({
      ok: true,
      cache_key: 'cache-key',
      reused: false,
      duration_ms: 12,
    })),
    processMessage: vi.fn(),
  }
  const streamRegistry = {
    isActive: vi.fn(() => false),
    getMessageId: vi.fn(() => null),
    setAbortController: vi.fn(),
    clearAbortController: vi.fn(),
    abort: vi.fn(),
    abortIfMessageId: vi.fn(),
  }
  const chatRunEvents = {
    tryAcquireConversationLock: vi.fn(async () => true),
    releaseConversationLock: vi.fn(async () => undefined),
    getRunMeta: vi.fn(async () => null),
    readAfter: vi.fn(async () => []),
    isRuntimeQueueExecutionEnabled: vi.fn(() => false),
    startRun: vi.fn(async () => true),
    enqueueChatRun: vi.fn(async () => null),
    getActiveRunForConversation: vi.fn(async () => null),
    cancelRun: vi.fn(async () => undefined),
  }
  const chatStreamHttp = new ChatStreamHttpService(
    chatService as never,
    streamRegistry as never,
    chatRunEvents as never,
  )
  return {
    controller: new ChatController(chatService as never),
    streamController: new ChatStreamController(chatStreamHttp),
    statusController: new ChatStatusController(chatService as never, chatRunEvents as never),
    chatService,
    streamRegistry,
    chatRunEvents,
  }
}

describe('ChatController prewarm', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 404 when edit access fails', async () => {
    const { controller, chatService } = makeController(false)
    const res = makeResponse()

    await controller.prewarm(
      { conversation_id: 'conversation-1' },
      { id: 'user-1', email: 'u@example.com' },
      {} as never,
      { orgId: 'org-1', orgRole: 'member' } as never,
      { token: 'token', headers: {} } as never,
      res as never,
    )

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Conversation not found' })
    expect(chatService.prewarmChatContext).not.toHaveBeenCalled()
    expect(res.setHeader).not.toHaveBeenCalled()
    expect(res.flushHeaders).not.toHaveBeenCalled()
  })

  it('returns JSON when edit access passes without opening SSE', async () => {
    const { controller, chatService } = makeController(true)
    const res = makeResponse()

    await controller.prewarm(
      {
        conversation_id: 'conversation-1',
        campaign_id: 'campaign-1',
        model: 'google/gemini-3.5-flash',
        model_settings: { reasoning_effort: 'none' },
      },
      { id: 'user-1', email: 'u@example.com' },
      {} as never,
      { orgId: 'org-1', orgRole: 'member' } as never,
      { token: 'token', headers: { 'x-supabase-refresh-token': 'refresh' } } as never,
      res as never,
    )

    expect(chatService.prewarmChatContext).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        userId: 'user-1',
        accessToken: 'token',
        refreshToken: 'refresh',
        campaignId: 'campaign-1',
        orgId: 'org-1',
        model: 'google/gemini-3.5-flash',
        modelSettings: { reasoning_effort: 'none' },
      }),
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      cache_key: 'cache-key',
      reused: false,
      duration_ms: 12,
    })
    expect(res.setHeader).not.toHaveBeenCalled()
    expect(res.flushHeaders).not.toHaveBeenCalled()
  })

  it('streams post-anchor events from Redis when the Redis reader flag is enabled', async () => {
    vi.stubEnv('CHAT_STREAM_REDIS_READER', '1')
    const chatService = {
      verifyConversationAccess: vi.fn(async () => true),
      prewarmChatContext: vi.fn(),
      processMessage: vi.fn(async ({ send }) => {
        await send('status', { phase: 'thinking', message: 'Preparing' })
        await send('message_start', {
          message_id: 'message-1',
          conversation_id: 'conversation-1',
          run_id: 'run-1',
          cursor: '1-0',
        })
        await send('content_delta', {
          content: 'direct should be suppressed',
          run_id: 'run-1',
          cursor: '2-0',
        })
        await send('done', { run_id: 'run-1', cursor: '3-0' })
      }),
    }
    const streamRegistry = {
      isActive: vi.fn(() => false),
      getMessageId: vi.fn(() => null),
      setAbortController: vi.fn(),
      clearAbortController: vi.fn(),
      abort: vi.fn(),
      abortIfMessageId: vi.fn(),
    }
    const chatRunEvents = {
      tryAcquireConversationLock: vi.fn(async () => true),
      releaseConversationLock: vi.fn(async () => undefined),
      getRunMeta: vi.fn(async () => ({ status: 'done' })),
      readAfter: vi.fn(async () => [
        {
          cursor: '2-0',
          type: 'content_delta',
          payload: { content: 'from redis' },
        },
        {
          cursor: '3-0',
          type: 'done',
          payload: {},
        },
      ]),
      isRuntimeQueueExecutionEnabled: vi.fn(() => false),
    }
    const streamController = new ChatStreamController(
      new ChatStreamHttpService(
        chatService as never,
        streamRegistry as never,
        chatRunEvents as never,
      ),
    )
    const res = makeResponse()

    await streamController.sendMessage(
      { conversation_id: 'conversation-1', content: 'Hello' },
      { id: 'user-1', email: 'u@example.com' },
      {} as never,
      { orgId: 'org-1', orgRole: 'member' } as never,
      { token: 'token', headers: {} } as never,
      res as never,
    )

    const writes = res.write.mock.calls.map(([chunk]) => String(chunk))
    expect(chatRunEvents.readAfter).toHaveBeenCalledWith('run-1', '1-0', 25_000)
    expect(writes.some((chunk) => chunk.includes('direct should be suppressed'))).toBe(false)
    expect(writes.some((chunk) => chunk.includes('from redis'))).toBe(true)
    expect(writes.some((chunk) => chunk.includes('"type":"done"'))).toBe(true)
  })

  it('enqueues queued chat execution and streams the run from Redis', async () => {
    const chatService = {
      verifyConversationAccess: vi.fn(async () => true),
      prewarmChatContext: vi.fn(),
      processMessage: vi.fn(),
    }
    const streamRegistry = {
      isActive: vi.fn(() => false),
      getMessageId: vi.fn(() => null),
      setAbortController: vi.fn(),
      clearAbortController: vi.fn(),
      abort: vi.fn(),
      abortIfMessageId: vi.fn(),
    }
    const chatRunEvents = {
      tryAcquireConversationLock: vi.fn(async () => true),
      releaseConversationLock: vi.fn(async () => undefined),
      isRuntimeQueueExecutionEnabled: vi.fn(() => true),
      startRun: vi.fn(async () => true),
      enqueueChatRun: vi.fn(async () => ({
        queueName: 'agent-runtime-queue-chat',
        jobId: 'chat-run-1',
        enqueuedAt: '2026-06-09T10:00:00.000Z',
      })),
      getRunMeta: vi.fn(async () => ({ status: 'done' })),
      readAfter: vi.fn(async () => [
        {
          cursor: '1-0',
          type: 'message_start',
          payload: { message_id: 'message-1', conversation_id: 'conversation-1' },
        },
        {
          cursor: '2-0',
          type: 'done',
          payload: {},
        },
      ]),
    }
    const streamController = new ChatStreamController(
      new ChatStreamHttpService(
        chatService as never,
        streamRegistry as never,
        chatRunEvents as never,
      ),
    )
    const res = makeResponse()

    await streamController.sendMessage(
      {
        conversation_id: 'conversation-1',
        content: 'Hello',
        model: 'openclaw:test',
        model_settings: { reasoning_effort: 'none' },
        campaign_id: 'campaign-1',
      },
      { id: 'user-1', email: 'u@example.com' },
      {} as never,
      { orgId: 'org-1', orgRole: 'member' } as never,
      { token: 'access-token', headers: { 'x-supabase-refresh-token': 'refresh-token' } } as never,
      res as never,
    )

    expect(chatService.processMessage).not.toHaveBeenCalled()
    expect(chatRunEvents.startRun).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        userId: 'user-1',
        orgId: 'org-1',
        executionMode: 'queued',
      }),
      { awaitPersist: true, skipShadowQueue: true },
    )
    expect(chatRunEvents.enqueueChatRun).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        userId: 'user-1',
        orgId: 'org-1',
        content: 'Hello',
        model: 'openclaw:test',
        modelSettings: { reasoning_effort: 'none' },
        campaignId: 'campaign-1',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    )
    expect(chatRunEvents.readAfter).toHaveBeenCalledWith(expect.any(String), '0-0', 25_000)
    expect(chatRunEvents.releaseConversationLock).not.toHaveBeenCalled()
    const writes = res.write.mock.calls.map(([chunk]) => String(chunk))
    expect(writes.some((chunk) => chunk.includes('"type":"message_start"'))).toBe(true)
    expect(writes.some((chunk) => chunk.includes('"type":"done"'))).toBe(true)
  })

  it('stops the active response and cancels the active runtime run', async () => {
    const { streamController, chatService, chatRunEvents, streamRegistry } = makeController(true)
    const res = makeResponse()
    const activeRun = { runId: 'run-1' }
    chatRunEvents.getActiveRunForConversation.mockResolvedValueOnce(activeRun)

    await streamController.stopStream(
      { conversation_id: ' conversation-1 ' },
      { id: 'user-1', email: 'u@example.com' },
      {} as never,
      { orgId: 'org-1', orgRole: 'member' } as never,
      res as never,
    )

    expect(chatService.verifyConversationAccess).toHaveBeenCalledWith(
      {},
      'conversation-1',
      'user-1',
      'org-1',
      'member',
      'edit',
    )
    expect(streamRegistry.abort).toHaveBeenCalledWith('conversation-1')
    expect(chatRunEvents.cancelRun).toHaveBeenCalledWith('run-1', 'cancelled by user')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ stopped: true })
  })

  it('ignores stale targeted stops when the active runtime run has changed', async () => {
    const { streamController, chatRunEvents, streamRegistry } = makeController(true)
    const res = makeResponse()
    chatRunEvents.getActiveRunForConversation.mockResolvedValueOnce({ runId: 'run-new' })

    await streamController.stopStream(
      { conversation_id: 'conversation-1', run_id: 'run-old' },
      { id: 'user-1', email: 'u@example.com' },
      {} as never,
      { orgId: 'org-1', orgRole: 'member' } as never,
      res as never,
    )

    expect(streamRegistry.abort).not.toHaveBeenCalled()
    expect(chatRunEvents.cancelRun).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ stopped: false })
  })

  it('uses the registry message id for targeted stops when active run metadata is missing', async () => {
    const { streamController, chatRunEvents, streamRegistry } = makeController(true)
    const res = makeResponse()
    chatRunEvents.getActiveRunForConversation.mockResolvedValueOnce(null)
    streamRegistry.abortIfMessageId.mockReturnValueOnce(true)

    await streamController.stopStream(
      { conversation_id: 'conversation-1', run_id: 'message-1' },
      { id: 'user-1', email: 'u@example.com' },
      {} as never,
      { orgId: 'org-1', orgRole: 'member' } as never,
      res as never,
    )

    expect(streamRegistry.abort).not.toHaveBeenCalled()
    expect(streamRegistry.abortIfMessageId).toHaveBeenCalledWith('conversation-1', 'message-1')
    expect(chatRunEvents.cancelRun).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ stopped: true })
  })

  it('resumes a runtime run stream from Redis events', async () => {
    const { statusController, chatService, chatRunEvents } = makeController(true)
    const res = makeResponse()
    const runId = '11111111-1111-4111-8111-111111111111'
    chatRunEvents.getRunMeta.mockResolvedValueOnce({
      runId,
      conversationId: 'conversation-1',
      status: 'active',
    })
    chatRunEvents.readAfter.mockResolvedValueOnce([
      {
        cursor: '2-0',
        type: 'content_delta',
        payload: { content: 'from redis' },
      },
      {
        cursor: '3-0',
        type: 'done',
        payload: {},
      },
    ])

    await statusController.resumeRunStream(
      runId,
      '1-0',
      { id: 'user-1' },
      {} as never,
      { orgId: 'org-1', orgRole: 'member' } as never,
      res as never,
    )

    expect(chatService.verifyConversationAccess).toHaveBeenCalledWith(
      {},
      'conversation-1',
      'user-1',
      'org-1',
      'member',
      'view',
    )
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream; charset=utf-8')
    expect(chatRunEvents.readAfter).toHaveBeenCalledWith(runId, '1-0', 25_000)
    const writes = res.write.mock.calls.map(([chunk]) => String(chunk))
    expect(writes.some((chunk) => chunk.includes('from redis'))).toBe(true)
    expect(writes.some((chunk) => chunk.includes('"type":"done"'))).toBe(true)
    expect(res.end).toHaveBeenCalled()
  })
})
