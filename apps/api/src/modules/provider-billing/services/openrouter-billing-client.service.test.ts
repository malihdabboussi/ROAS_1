import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProviderOutputValidationError } from '@vibey/api-shared'
import { OpenRouterBillingClientService } from './openrouter-billing-client.service'

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'attempt-1',
    attempt_key: 'attempt-key',
    provider_generation_id: 'gen-1',
    provider_cost_usd: 0.067,
    metadata_json: {},
    ...overrides,
  }
}

function makeService() {
  const settlement = {
    recordAttempt: vi
      .fn()
      .mockResolvedValueOnce(attempt({ provider_generation_id: null, provider_cost_usd: null }))
      .mockResolvedValueOnce(attempt()),
    recordOutputValidation: vi.fn(async ({ state }) =>
      attempt({ metadata_json: { image_output_validation: { state } } }),
    ),
    settleByIdOrGeneration: vi.fn(async () => attempt({ status: 'settled' })),
  }
  const config = { get: vi.fn(() => 'openrouter-key') }
  return {
    service: new OpenRouterBillingClientService(config as never, settlement as never),
    settlement,
  }
}

describe('OpenRouterBillingClientService image output validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the dedicated image endpoint and validates output before settlement', async () => {
    const image = Buffer.from('image-bytes').toString('base64')
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'gen-1',
            model: 'google/gemini-3.1-flash-image',
            data: [{ b64_json: image, media_type: 'image/png' }],
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost: 0.067 },
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { service, settlement } = makeService()

    const result = await service.createImage({
      owner: { userId: 'user-1', billingOwnerType: 'platform' },
      feature: 'media',
      action: 'generate_image',
      sourcePath: 'media/test',
      model: 'google/gemini-3.1-flash-image',
      prompt: 'Draw a clean icon',
      aspectRatio: '1:1',
    })

    expect(result.buffer.toString()).toBe('image-bytes')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/images',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(settlement.recordOutputValidation).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'validated' }),
    )
    expect(settlement.recordOutputValidation.mock.invocationCallOrder[0]).toBeLessThan(
      settlement.settleByIdOrGeneration.mock.invocationCallOrder[0],
    )
  })

  it('records a paid invalid output and blocks automatic retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              id: 'gen-1',
              data: [],
              usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost: 0.067 },
            }),
            { status: 200 },
          ),
      ),
    )
    const { service, settlement } = makeService()

    await expect(
      service.createImage({
        owner: { userId: 'user-1', billingOwnerType: 'platform' },
        feature: 'media',
        action: 'generate_image',
        sourcePath: 'media/test',
        model: 'google/gemini-3.1-flash-image',
        prompt: 'Draw a clean icon',
        aspectRatio: '1:1',
      }),
    ).rejects.toBeInstanceOf(ProviderOutputValidationError)
    expect(settlement.recordOutputValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'paid_output_invalid',
        error: 'OpenRouter returned HTTP 200 without a valid image payload',
      }),
    )
    expect(settlement.settleByIdOrGeneration).toHaveBeenCalledTimes(1)
  })

  it('records a provider rejection as no-output without retrying settlement', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: 'Generation failed' } }), {
            status: 502,
          }),
      ),
    )
    const { service, settlement } = makeService()

    await expect(
      service.createImage({
        owner: { userId: 'user-1', billingOwnerType: 'platform' },
        feature: 'media',
        action: 'generate_image',
        sourcePath: 'media/test',
        model: 'google/gemini-3.1-flash-image',
        prompt: 'Draw a clean icon',
        aspectRatio: '1:1',
      }),
    ).rejects.toThrow('AI image provider failed')
    expect(settlement.recordOutputValidation).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'provider_failed' }),
    )
    expect(settlement.settleByIdOrGeneration).not.toHaveBeenCalled()
  })

  it('checks generation metadata when the invalid image response omits cost', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'gen-1', data: [], usage: { total_tokens: 30 } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: 'gen-1',
              model: 'google/gemini-3.1-flash-image',
              total_cost: 0.067,
              tokens_prompt: 10,
              tokens_completion: 20,
            },
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    const { service, settlement } = makeService()

    await expect(
      service.createImage({
        owner: { userId: 'user-1', billingOwnerType: 'platform' },
        feature: 'media',
        action: 'generate_image',
        sourcePath: 'media/test',
        model: 'google/gemini-3.1-flash-image',
        prompt: 'Draw a clean icon',
        aspectRatio: '1:1',
      }),
    ).rejects.toMatchObject({
      name: 'ProviderOutputValidationError',
      providerEffectConfirmed: true,
      providerCostUsd: 0.067,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      'https://openrouter.ai/api/v1/generation?id=gen-1',
    )
    expect(settlement.recordOutputValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'paid_output_invalid',
        metadata: {
          image_output_validation: expect.objectContaining({
            verification_source: 'generation_lookup',
          }),
        },
      }),
    )
  })
})
