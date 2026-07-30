import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenRouterCostService } from './openrouter-cost.service'

describe('OpenRouterCostService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('finds generation cost across workload-specific OpenRouter keys', async () => {
    vi.stubEnv('OPENROUTER_INTERACTIVE_API_KEY', 'interactive-key')
    vi.stubEnv('OPENROUTER_BACKGROUND_API_KEY', 'background-key')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { total_cost: 0.42 } }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const service = new OpenRouterCostService()

    await expect(service.fetchGenerationCost('gen-background')).resolves.toBe(0.42)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer interactive-key' },
    })
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer background-key' },
    })
  })

  it('uses provider-reported cost without requiring a generation id', async () => {
    const service = new OpenRouterCostService()

    const result = await service.sumGenerationCosts([
      {
        providerCost: 0.123456,
        usage: {
          inputTokens: 100,
          outputTokens: 10,
        },
      },
    ])

    expect(result).toEqual({
      totalUsd: 0.123456,
      costSource: 'provider_direct',
      generationIds: [],
    })
  })

  it('does not preserve internal response ids as OpenRouter generation ids', async () => {
    const service = new OpenRouterCostService()

    const result = await service.sumGenerationCosts([
      {
        generationId: 'resp_internal',
        providerCost: 0.5,
      },
      {
        generationId: 'gen-real',
        providerCost: 0.25,
      },
    ])

    expect(result).toEqual({
      totalUsd: 0.75,
      costSource: 'provider_direct',
      generationIds: ['gen-real'],
    })
  })

  it('does not treat zero provider cost for paid models as actual cost', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'anthropic/claude-sonnet-4.6',
              pricing: {
                prompt: '0.000003',
                completion: '0.000015',
                input_cache_read: '0.0000003',
                input_cache_write: '0.00000375',
              },
            },
          ],
        }),
      })),
    )
    const service = new OpenRouterCostService()

    const result = await service.sumGenerationCosts([
      {
        modelId: 'anthropic/claude-sonnet-4.6',
        providerCost: 0,
        usage: {
          inputTokens: 1000,
          outputTokens: 100,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
      },
    ])

    expect(result).toEqual({
      totalUsd: 0.0045,
      costSource: 'openrouter_calc',
      generationIds: [],
    })
  })
})
