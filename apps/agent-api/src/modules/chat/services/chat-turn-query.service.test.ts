import { describe, expect, it, vi } from 'vitest'
import { ChatTurnQueryService } from './chat-turn-query.service'

function createService(
  activeRun: Record<string, unknown> | null,
  durableFailure: Record<string, unknown> | null = null,
) {
  const messages = {
    findById: vi.fn(async () => null),
  }
  const permissions = {
    resolveEffectiveLevel: vi.fn(async () => 'edit'),
  }
  const runEvents = {
    getActiveRunForConversation: vi.fn(async () => activeRun),
  }
  const streamRegistry = {
    isActive: vi.fn(() => false),
    getMessageId: vi.fn(() => null),
  }
  const timeline = {
    listEventsForMessage: vi.fn(async () => []),
  }

  return new ChatTurnQueryService(
    messages as never,
    permissions as never,
    runEvents as never,
    streamRegistry as never,
    timeline as never,
    { client: {} } as never,
    {
      findLatestRuntimeRunForConversation: vi.fn(async () =>
        durableFailure
          ? {
              run_id: durableFailure.runId,
              message_id: durableFailure.messageId,
              status: 'failed_recoverable',
              error: durableFailure.error,
              created_at: '2026-07-28T18:00:00.000Z',
            }
          : null,
      ),
    } as never,
  )
}

describe('ChatTurnQueryService', () => {
  it('reports an interrupted active bridge without exposing its internal error', async () => {
    const service = createService({
      runId: 'run-1',
      messageId: 'message-1',
      lastCursor: '2-0',
      error: 'TypeError: terminated',
    })

    const result = await service.getActiveTurnSnapshot(
      {} as never,
      'user-1',
      'conversation-1',
      'org-1',
      'owner',
    )

    expect(result).toMatchObject({
      active: true,
      runId: 'run-1',
      messageId: 'message-1',
      failureCode: 'stream_interrupted',
    })
    expect(result).not.toHaveProperty('error')
  })

  it('does not report interruption for a healthy active run', async () => {
    const service = createService({
      runId: 'run-1',
      messageId: 'message-1',
      lastCursor: '1-0',
      lastEventAt: '2026-07-29T18:00:01.000Z',
      error: null,
    })

    const result = await service.getActiveTurnSnapshot(
      {} as never,
      'user-1',
      'conversation-1',
      'org-1',
      'owner',
    )

    expect(result).toMatchObject({
      failureCode: undefined,
      lastEventAt: '2026-07-29T18:00:01.000Z',
    })
  })

  it('preserves an active context-window recovery reason', async () => {
    const service = createService({
      runId: 'run-1',
      messageId: 'message-1',
      lastCursor: '2-0',
      error: 'context_window_exceeded',
    })

    const result = await service.getActiveTurnSnapshot(
      {} as never,
      'user-1',
      'conversation-1',
      'org-1',
      'owner',
    )

    expect(result.failureCode).toBe('context_window_exceeded')
  })

  it('reports a durable interruption after the live recovery window expires', async () => {
    const service = createService(null, {
      runId: 'run-1',
      messageId: 'message-1',
      lastCursor: null,
      error: 'TypeError: terminated',
    })

    const result = await service.getActiveTurnSnapshot(
      {} as never,
      'user-1',
      'conversation-1',
      'org-1',
      'owner',
    )

    expect(result).toMatchObject({
      active: false,
      runId: 'run-1',
      messageId: 'message-1',
      failureCode: 'stream_interrupted',
    })
  })

  it('preserves a durable context-window recovery reason', async () => {
    const service = createService(null, {
      runId: 'run-1',
      messageId: 'message-1',
      lastCursor: null,
      error: 'context_window_exceeded',
    })

    const result = await service.getActiveTurnSnapshot(
      {} as never,
      'user-1',
      'conversation-1',
      'org-1',
      'owner',
    )

    expect(result.failureCode).toBe('context_window_exceeded')
  })
})
