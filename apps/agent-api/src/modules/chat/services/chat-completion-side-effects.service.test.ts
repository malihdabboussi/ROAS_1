import { describe, expect, it, vi } from 'vitest'
import { ChatCompletionSideEffectsService } from './chat-completion-side-effects.service'

function makeService() {
  const costService = {
    sumGenerationCosts: vi
      .fn()
      .mockResolvedValueOnce({
        totalUsd: 0.03,
        costSource: 'provider_direct',
        generationIds: ['gen-research', 'gen-write'],
      })
      .mockResolvedValueOnce({
        totalUsd: 0.02,
        costSource: 'provider_direct',
        generationIds: ['gen-write'],
      }),
  }
  const tracing = { completeTrace: vi.fn(async () => undefined) }
  const skillEvents = { recordCompletion: vi.fn(async () => undefined) }
  const credits = {
    processUsage: vi.fn(async () => undefined),
    processDirectTextUsage: vi.fn(async () => undefined),
  }
  return {
    costService,
    credits,
    service: new ChatCompletionSideEffectsService(
      costService as never,
      tracing as never,
      skillEvents as never,
      credits as never,
    ),
  }
}

function makeInput() {
  return {
    agentKey: 'pixel',
    channel: 'studio' as const,
    conversationId: 'conversation-1',
    defaultModelId: 'anthropic/claude-opus-5',
    durationMs: 100,
    hasOutput: () => true,
    logger: { log: vi.fn(), error: vi.fn() },
    prompt: 'Help me',
    requestedModelId: 'auto',
    resolvedCommands: [],
    resolvedModelId: 'anthropic/claude-opus-5',
    result: {
      content: 'Answer',
      toolSteps: [],
      completedGenerations: [
        {
          generationId: 'gen-research',
          model: 'openai/gpt-5.6-terra',
          usage: { input_tokens: 100, output_tokens: 10, total_tokens: 110 },
        },
        {
          generationId: 'gen-write',
          model: 'anthropic/claude-opus-5',
          usage: { input_tokens: 200, output_tokens: 20, total_tokens: 220 },
        },
      ],
      providerBillingAttempts: [
        {
          provider_generation_id: 'gen-research',
          recorded: true,
        },
      ],
    },
    sendCreditUpdate: vi.fn(),
    sessionKey: 'session-1',
    toolSteps: [],
    traceId: null,
    userId: 'user-1',
  }
}

describe('ChatCompletionSideEffectsService', () => {
  it('charges only generations not already settled by provider billing', async () => {
    const { costService, credits, service } = makeService()
    const input = makeInput()

    service.runDetached(input as never)

    await vi.waitFor(() => expect(credits.processUsage).toHaveBeenCalledTimes(1))
    expect(input.logger.log).toHaveBeenCalledWith(
      expect.stringContaining('"total_cost_usd":0.03'),
    )
    expect(input.logger.log).toHaveBeenCalledWith(
      expect.stringContaining('"priced_generation_ids":["gen-research","gen-write"]'),
    )
    expect(costService.sumGenerationCosts).toHaveBeenNthCalledWith(
      2,
      [
        expect.objectContaining({
          generationId: 'gen-write',
          modelId: 'anthropic/claude-opus-5',
        }),
      ],
      'anthropic/claude-opus-5',
    )
    expect(credits.processUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        preComputedCost: 0.02,
        generationIds: ['gen-write'],
      }),
    )
    expect(credits.processDirectTextUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        usage: expect.objectContaining({
          input: 200,
          output: 20,
          totalTokens: 220,
        }),
      }),
    )
  })

  it('does not charge again when provider billing settled every generation', async () => {
    const { credits, service } = makeService()
    const input = makeInput()
    input.result.providerBillingAttempts.push({
      provider_generation_id: 'gen-write',
      recorded: true,
    })

    service.runDetached(input as never)

    await vi.waitFor(() =>
      expect(input.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('provider billing settlement owns every generation'),
      ),
    )
    expect(credits.processUsage).not.toHaveBeenCalled()
    expect(credits.processDirectTextUsage).not.toHaveBeenCalled()
  })
})
