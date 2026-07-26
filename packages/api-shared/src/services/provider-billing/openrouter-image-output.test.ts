import { describe, expect, it } from 'vitest'
import {
  parseOpenRouterImageOutput,
  summarizeOpenRouterImageResponse,
} from './openrouter-image-output'

describe('OpenRouter image output validation', () => {
  it('accepts the dedicated image API response and normalizes billing data', () => {
    expect(
      parseOpenRouterImageOutput({
        model: 'google/gemini-3.1-flash-image',
        data: [{ b64_json: 'aW1hZ2U=', media_type: 'image/webp' }],
        usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46, cost: 0.067 },
      }),
    ).toEqual({
      imageBytesB64: 'aW1hZ2U=',
      mimeType: 'image/webp',
      resolvedModel: 'google/gemini-3.1-flash-image',
      providerCostUsd: 0.067,
      usage: { input: 12, output: 34, cacheRead: 0, cacheWrite: 0, totalTokens: 46 },
    })
  })

  it('rejects a successful-looking response without image bytes', () => {
    const payload = { id: 'gen-paid', data: [], usage: { cost: 0.067 } }
    expect(parseOpenRouterImageOutput(payload)).toBeNull()
    expect(summarizeOpenRouterImageResponse(payload)).toEqual({
      topLevelKeys: ['data', 'id', 'usage'],
      dataCount: 0,
      hasImageBytes: false,
      hasUsage: true,
      hasResponseId: true,
    })
  })
})
