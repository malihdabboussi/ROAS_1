import { describe, expect, it } from 'vitest'
import {
  normalizeOpenRouterGenerationPayload,
  readOpenRouterGenerationId,
  validateOpenRouterSettledCost,
} from './openrouter-metadata'

describe('OpenRouter provider billing metadata', () => {
  it('reads the generation id from OpenRouter response headers', () => {
    const headers = new Headers({
      'x-generation-id': 'gen-abc123',
      'x-request-id': 'req-123',
    })

    expect(readOpenRouterGenerationId(headers)).toBe('gen-abc123')
  })

  it('normalizes generation API cost and usage fields', () => {
    const settlement = normalizeOpenRouterGenerationPayload({
      data: {
        id: 'gen-abc123',
        model: 'anthropic/claude-sonnet-4.6',
        total_cost: '0.012345',
        tokens_prompt: 1000,
        tokens_completion: 250,
      },
    })

    expect(settlement).toMatchObject({
      generationId: 'gen-abc123',
      costUsd: 0.012345,
      usage: {
        input: 1000,
        output: 250,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 1250,
      },
    })
  })

  it('keeps zero-cost paid models pending unless provider marks no-charge', () => {
    const settlement = normalizeOpenRouterGenerationPayload({
      data: {
        id: 'gen-zero',
        model: 'anthropic/claude-sonnet-4.6',
        total_cost: 0,
      },
    })

    expect(validateOpenRouterSettledCost(settlement).acceptable).toBe(false)
    expect(
      validateOpenRouterSettledCost({
        ...settlement,
        noCharge: true,
      }).acceptable,
    ).toBe(true)
  })

  it('does not treat provider error finishes as no-charge cancellations', () => {
    const settlement = normalizeOpenRouterGenerationPayload({
      data: {
        id: 'gen-error',
        model: 'anthropic/claude-sonnet-4.6',
        total_cost: 0,
        finish_reason: 'error',
      },
    })

    expect(settlement.cancelled).toBe(false)
    expect(validateOpenRouterSettledCost(settlement).acceptable).toBe(false)
  })
})
