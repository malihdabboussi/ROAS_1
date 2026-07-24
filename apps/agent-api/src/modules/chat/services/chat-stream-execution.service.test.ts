import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatModelInputService } from './chat-model-input.service'
import { ChatStreamExecutionService } from './chat-stream-execution.service'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'

function makeService(input?: {
  streamCompletion?: ReturnType<typeof vi.fn>
  recovery?: ChatStreamRecoveryService
}) {
  const openClaw = {
    streamCompletion:
      input?.streamCompletion ??
      vi.fn(async () => ({
        content: 'ok',
        toolSteps: [],
      })),
  }
  return new ChatStreamExecutionService(
    openClaw as any,
    input?.recovery ?? new ChatStreamRecoveryService(),
    {} as ChatModelInputService,
  )
}

function makeRunInput(overrides: Record<string, unknown> = {}) {
  return {
    chatDiag: 'test',
    chatTimingLogsEnabled: false,
    channel: 'studio' as const,
    conversationId: 'conversation-1',
    disabledNativeActions: [],
    gatewayAgentId: 'vibey',
    gatewayModelId: 'anthropic/claude-sonnet-4.6',
    getAccumulatedContent: () => '',
    inputArray: [{ type: 'message', role: 'user', content: 'Hi' }],
    instructions: 'Answer the user.',
    logChatFlow: vi.fn(),
    logger: { warn: vi.fn() },
    progressiveSend: vi.fn(async () => undefined),
    recordRunCheckpoint: vi.fn(async () => undefined),
    relaxedResponseFilter: false,
    selectedModelInput: null,
    selectedSettings: {
      requestedModelId: 'anthropic/claude-sonnet-4.6',
      resolvedModelId: 'anthropic/claude-sonnet-4.6',
      request: {},
      openClaw: {},
    },
    sessionKey: 'session-1',
    userContent: 'Hi',
    userId: 'user-1',
    ...overrides,
  }
}

describe('ChatStreamExecutionService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a no-answer failure when the empty response retry is still empty', async () => {
    vi.useFakeTimers()
    const streamCompletion = vi.fn(async () => ({
      content: '',
      toolSteps: [],
    }))
    const service = makeService({ streamCompletion })

    const resultPromise = service.run(makeRunInput())
    await vi.advanceTimersByTimeAsync(1500)
    const result = await resultPromise

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(result.failed).toBe('empty_agent_response')
    expect(result.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'empty_response_retry',
        status: 'failed',
      }),
    ])
  })

  it('keeps a successful retry when the second attempt returns content', async () => {
    vi.useFakeTimers()
    const streamCompletion = vi
      .fn()
      .mockResolvedValueOnce({ content: '', toolSteps: [] })
      .mockResolvedValueOnce({ content: 'Hello. How can I help?', toolSteps: [] })
    const service = makeService({ streamCompletion })

    const resultPromise = service.run(makeRunInput())
    await vi.advanceTimersByTimeAsync(1500)
    const result = await resultPromise

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(result.failed).toBeUndefined()
    expect(result.content).toBe('Hello. How can I help?')
    expect(result.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'empty_response_retry',
        status: 'recovered',
      }),
    ])
  })

  it('does not synthesize a compact prompt after context overflow', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: '',
      toolSteps: [],
      failed: 'context_window_exceeded: input is too long',
      truncated: true,
      lastCallInputTokens: 128000,
      contextWindowTokens: 128000,
    }))
    const service = makeService({ streamCompletion })

    const result = await service.run(makeRunInput())

    expect(streamCompletion).toHaveBeenCalledTimes(1)
    expect(result.failed).toBe('context_window_exceeded: input is too long')
  })

  it('waits and retries the selected model after a provider rate limit', async () => {
    vi.useFakeTimers()
    const streamCompletion = vi
      .fn()
      .mockResolvedValueOnce({
        content: '',
        toolSteps: [],
        failed: 'API rate limit reached. Please try again later.',
      })
      .mockResolvedValueOnce({
        content: 'Recovered after the provider throttle cleared.',
        toolSteps: [],
      })
    const service = makeService({ streamCompletion })

    const resultPromise = service.run(makeRunInput())
    await vi.advanceTimersByTimeAsync(5000)
    const result = await resultPromise

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(result.failed).toBeUndefined()
    expect(result.content).toBe('Recovered after the provider throttle cleared.')
    expect(result.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'provider_busy_retry',
        status: 'recovered',
      }),
    ])
  })
})
