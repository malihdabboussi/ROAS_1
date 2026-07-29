import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatModelInputService } from './chat-model-input.service'
import { ChatStreamExecutionService } from './chat-stream-execution.service'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'

function makeService(input?: {
  streamCompletion?: ReturnType<typeof vi.fn>
  recovery?: ChatStreamRecoveryService
  validateModelSettings?: ReturnType<typeof vi.fn>
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
    {
      mergeResolvedModelSettings: vi.fn((resolved) => resolved.modelSettings),
      validateModelSettings:
        input?.validateModelSettings ??
        vi.fn(async (modelId, settings) => ({
          requestedModelId: modelId,
          resolvedModelId: modelId,
          request: {},
          openClaw: {
            contextWindowTokens: settings?.context_window_tokens,
            reasoningEffort: settings?.reasoning_effort,
          },
        })),
    } as unknown as ChatModelInputService,
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

  it('runs Auto retrieval on Terra and gives one bounded, tool-free writing pass to Sonnet', async () => {
    const streamCompletion = vi
      .fn()
      .mockImplementationOnce(async ({ send }) => {
        await send('content_delta', { delta: 'internal research text' })
        await send('tool_update', { tool: 'search_brain', status: 'completed' })
        return {
          content: `Research evidence ${'x'.repeat(30_000)}`,
          toolSteps: [{ name: 'search_brain', label: 'Search Brain', status: 'completed' }],
          completedGenerations: [{ generationId: 'gen-research', model: 'openai/gpt-5.6-terra' }],
        }
      })
      .mockResolvedValueOnce({
        content: 'Polished answer.',
        toolSteps: [],
        completedGenerations: [{ generationId: 'gen-write', model: 'anthropic/claude-sonnet-4.6' }],
      })
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ streamCompletion })

    const result = await service.run(
      makeRunInput({
        progressiveSend,
        selectedModelInput: 'auto',
      }),
    )

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(streamCompletion.mock.calls[0]?.[0]).toMatchObject({
      model: 'openai/gpt-5.6-terra',
      generationStage: 'research',
    })
    expect(streamCompletion.mock.calls[1]?.[0]).toMatchObject({
      model: 'anthropic/claude-sonnet-4.6',
      generationStage: 'write',
      toolChoice: 'none',
    })
    expect(streamCompletion.mock.calls[1]?.[0].sessionKey).toContain(':writer:')
    expect(JSON.stringify(streamCompletion.mock.calls[1]?.[0].input).length).toBeLessThan(25_000)
    expect(progressiveSend).not.toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ delta: 'internal research text' }),
    )
    expect(result.content).toBe('Polished answer.')
    expect(result.completedGenerations).toEqual([
      expect.objectContaining({ generationId: 'gen-research', stage: 'research' }),
      expect.objectContaining({ generationId: 'gen-write', stage: 'write' }),
    ])
  })

  it('shows the research answer when the single Sonnet writing pass fails', async () => {
    const streamCompletion = vi
      .fn()
      .mockResolvedValueOnce({
        content: 'Useful researched answer.',
        toolSteps: [],
        completedGenerations: [{ generationId: 'gen-research' }],
      })
      .mockResolvedValueOnce({
        content: '',
        toolSteps: [],
        failed: 'provider_busy',
        completedGenerations: [{ generationId: 'gen-write' }],
      })
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ streamCompletion })

    const result = await service.run(
      makeRunInput({
        progressiveSend,
        selectedModelInput: 'auto',
      }),
    )

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(result.content).toBe('Useful researched answer.')
    expect(progressiveSend).toHaveBeenCalledWith('content_delta', {
      delta: 'Useful researched answer.',
    })
    expect(result.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'writer_fallback_to_research',
        status: 'recovered',
      }),
    ])
  })
})
