import { describe, expect, it, vi } from 'vitest'
import { OpenClawStreamLifecycleService } from './openclaw-stream-lifecycle.service'
import { createOpenClawStreamState, type OpenClawStreamContext } from './openclaw-stream-state'

function makeContext(): OpenClawStreamContext {
  return {
    agentId: 'employee',
    correlation: 'corr-1',
    logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() } as any,
    logStreamTiming: vi.fn(),
    options: {
      send: vi.fn(async () => undefined),
      input: [],
      conversationId: 'conversation-1',
    } as any,
    resolvedModel: 'anthropic/claude-sonnet-4.6',
    streamStartedAt: Date.now(),
    streamTimingLogsEnabled: false,
  }
}

describe('OpenClawStreamLifecycleService', () => {
  it('records every provider generation from a completed multi-generation response', async () => {
    const service = new OpenClawStreamLifecycleService({ report: vi.fn() } as any)
    const state = createOpenClawStreamState()
    const context = makeContext()
    context.options.generationStage = 'research'

    await service.handleEvent(
      'response.completed',
      {
        type: 'response.completed',
        response: {
          id: 'response-1',
          model: 'openrouter/openai/gpt-5.6-terra',
          metadata: {
            provider_generation_ids: ['gen_research_1', 'gen_research_2'],
            provider_generations: [
              {
                generationId: 'gen_research_1',
                model: 'openai/gpt-5.6-terra',
                usage: { input: 100, output: 10, cacheRead: 20, totalTokens: 110 },
                providerCost: 0.01,
              },
              {
                providerResponseId: 'gen_research_2',
                model: 'openai/gpt-5.6-terra',
                usage: { input: 200, output: 20, cacheWrite: 30, totalTokens: 220 },
                providerCost: 0.02,
              },
            ],
          },
          usage: { input_tokens: 300, output_tokens: 30, total_tokens: 330 },
        },
      },
      context,
      state,
    )

    expect(state.completedGenerations).toEqual([
      {
        generationId: 'gen_research_1',
        model: 'openai/gpt-5.6-terra',
        providerCost: 0.01,
        stage: 'research',
        usage: {
          input_tokens: 100,
          output_tokens: 10,
          cache_read_input_tokens: 20,
          cache_creation_input_tokens: 0,
          total_tokens: 110,
        },
      },
      {
        generationId: 'gen_research_2',
        model: 'openai/gpt-5.6-terra',
        providerCost: 0.02,
        stage: 'research',
        usage: {
          input_tokens: 200,
          output_tokens: 20,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 30,
          total_tokens: 220,
        },
      },
    ])
  })

  it('records OpenClaw compaction events as recovery events', async () => {
    const service = new OpenClawStreamLifecycleService({ report: vi.fn() } as any)
    const state = createOpenClawStreamState()
    const context = makeContext()

    await service.handleEvent(
      'response.compaction',
      {
        type: 'response.compaction',
        phase: 'end',
        trigger: 'overflow',
        outcome: 'compacted',
        attempt: 2,
        maxAttempts: 3,
        tokensBefore: 150000,
        tokensAfter: 70000,
      },
      context,
      state,
    )

    expect(state.compactionCount).toBe(2)
    expect(state.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'context_window_compaction',
        status: 'recovered',
        reason: 'compacted',
        metadata: expect.objectContaining({
          phase: 'end',
          trigger: 'overflow',
          attempt: 2,
          maxAttempts: 3,
          tokensBefore: 150000,
          tokensAfter: 70000,
        }),
      }),
    ])
  })
})
