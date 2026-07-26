import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyMediaProviderService } from './artifact-legacy-media-provider.service'

function makeTarget() {
  return {
    OPENROUTER_BASE_URL: 'https://openrouter.test/api/v1',
    OPENROUTER_IMAGE_MODEL: 'google/gemini-3.1-flash-image',
    logger: { error: vi.fn(), log: vi.fn(), warn: vi.fn() },
    openRouterApiKey: 'openrouter-key',
    providerBillingAttempts: {
      recordAttempt: vi.fn(async () => undefined),
      recordOutputValidation: vi.fn(async () => undefined),
    },
  }
}

describe('ArtifactLegacyMediaProviderService OpenRouter image generation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the dedicated OpenRouter image API and validates returned image bytes', async () => {
    const imageData = Buffer.from('image-bytes').toString('base64')
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'google/gemini-3.1-flash-image',
          data: [{ b64_json: imageData, media_type: 'image/png' }],
          usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46, cost: 0.067 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const service = new ArtifactLegacyMediaProviderService()
    const target = makeTarget()
    const result = await service.generateImageViaOpenRouter(
      target,
      'Draw a clean icon',
      '1:1',
      'google/gemini-3.1-flash-image',
    )

    expect(result).toEqual({
      imageBytesB64: imageData,
      mimeType: 'image/png',
      usage: { input: 12, output: 34 },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.test/api/v1/images',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer openrouter-key',
          'Content-Type': 'application/json',
        }),
      }),
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body).toMatchObject({
      model: 'google/gemini-3.1-flash-image',
      prompt: 'Draw a clean icon',
      n: 1,
      aspect_ratio: '1:1',
      output_format: 'png',
    })
    expect(target.providerBillingAttempts.recordAttempt).toHaveBeenCalledTimes(2)
    expect(target.providerBillingAttempts.recordOutputValidation).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'validated' }),
    )
  })

  it('defaults the mime type when the dedicated response omits it', async () => {
    const imageData = Buffer.from('fallback-image').toString('base64')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: [{ b64_json: imageData }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )

    const service = new ArtifactLegacyMediaProviderService()
    await expect(
      service.generateImageViaOpenRouter(makeTarget(), 'Draw a clean icon', '16:9'),
    ).resolves.toEqual({
      imageBytesB64: imageData,
      mimeType: 'image/png',
      usage: undefined,
    })
  })

  it('uses Nano Banana 2 as the target default and sends input images to OpenRouter', async () => {
    const imageData = Buffer.from('edited-image').toString('base64')
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [{ b64_json: imageData, media_type: 'image/png' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const service = new ArtifactLegacyMediaProviderService()
    await expect(
      service.generateImageViaOpenRouter(makeTarget(), 'Retouch the portrait', '1:1', undefined, [
        { base64: 'input-bytes', mimeType: 'image/jpeg' },
      ]),
    ).resolves.toEqual({
      imageBytesB64: imageData,
      mimeType: 'image/png',
      usage: undefined,
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.model).toBe('google/gemini-3.1-flash-image')
    expect(body.prompt).toBe('Retouch the portrait')
    expect(body.input_references).toEqual([
      {
        type: 'image_url',
        image_url: { url: 'data:image/jpeg;base64,input-bytes' },
      },
    ])
  })

  it('marks an invalid 200 response as non-retryable output validation failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(' ', { status: 200 })),
    )

    const service = new ArtifactLegacyMediaProviderService()
    const target = makeTarget()
    await expect(
      service.generateImageViaOpenRouter(target, 'Draw a clean icon', '1:1'),
    ).rejects.toThrow('do not retry automatically')
    expect(target.providerBillingAttempts.recordOutputValidation).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'output_invalid' }),
    )
  })
})
