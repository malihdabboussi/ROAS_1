import { describe, expect, it, vi } from 'vitest'
import { fetchModel, searchModels } from './model-catalog.js'

const MODELS_RESPONSE = {
  data: [
    {
      id: 'openai/gpt-5.6-luna',
      name: 'OpenAI: GPT-5.6 Luna',
      context_length: 1_050_000,
      pricing: { prompt: '0.0000001', completion: '0.0000006' },
      supported_parameters: ['tools', 'structured_outputs', 'reasoning_effort'],
      architecture: { input_modalities: ['text'], output_modalities: ['text'] },
    },
  ],
}

describe('OpenRouter model catalog', () => {
  it('queries the live catalog with server-side filters and normalizes per-million pricing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(MODELS_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await searchModels(
      {
        query: 'luna',
        requireTools: true,
        sort: 'pricing-low-to-high',
        limit: 5,
      },
      { apiKey: 'key', fetchImpl },
    )

    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('supported_parameters=tools')
    expect(result.models[0]).toMatchObject({
      id: 'openai/gpt-5.6-luna',
      promptPricePerMillion: 0.1,
      completionPricePerMillion: 0.6,
      supportsTools: true,
      supportsStructuredOutputs: true,
    })
  })

  it('uses the canonical single-model lookup endpoint for an exact model id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: MODELS_RESPONSE.data[0] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const model = await fetchModel('openai/gpt-5.6-luna', {
      apiKey: 'key',
      fetchImpl,
    })

    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      'https://openrouter.ai/api/v1/model/openai/gpt-5.6-luna',
    )
    expect(model.id).toBe('openai/gpt-5.6-luna')
  })
})
