import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyMediaProviderService } from './artifact-legacy-media-provider.service'

function makeTarget() {
  return {
    OPENROUTER_BASE_URL: 'https://openrouter.test/api/v1',
    OPENROUTER_IMAGE_MODEL: 'google/gemini-3.1-flash-image',
    logger: { error: vi.fn(), log: vi.fn() },
    openRouterApiKey: 'openrouter-key',
    providerBillingAttempts: { recordAttempt: vi.fn(async () => undefined) },
  }
}

describe('ArtifactLegacyMediaProviderService OpenRouter image generation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses OpenRouter image modalities and reads image bytes from message.images', async () => {
    const imageData = Buffer.from('image-bytes').toString('base64')
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                images: [{ image_url: { url: `data:image/png;base64,${imageData}` } }],
              },
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 34 },
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
      'https://openrouter.test/api/v1/chat/completions',
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
      messages: [{ role: 'user', content: 'Draw a clean icon' }],
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: '1:1' },
      stream: false,
    })
    expect(target.providerBillingAttempts.recordAttempt).toHaveBeenCalledTimes(2)
  })

  it('keeps the legacy content-array data URL parser as a fallback', async () => {
    const imageData = Buffer.from('fallback-image').toString('base64')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: [
                    {
                      type: 'image_url',
                      image_url: { url: `data:image/webp;base64,${imageData}` },
                    },
                  ],
                },
              },
            ],
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
      mimeType: 'image/webp',
      usage: undefined,
    })
  })

  it('uses Nano Banana 2 as the target default and sends input images to OpenRouter', async () => {
    const imageData = Buffer.from('edited-image').toString('base64')
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                images: [{ image_url: { url: `data:image/png;base64,${imageData}` } }],
              },
            },
          ],
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
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Retouch the portrait' },
      {
        type: 'image_url',
        image_url: { url: 'data:image/jpeg;base64,input-bytes' },
      },
    ])
  })

  it('fails clearly when OpenRouter returns HTTP 200 with non-JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(' ', { status: 200 })),
    )

    const service = new ArtifactLegacyMediaProviderService()
    await expect(
      service.generateImageViaOpenRouter(makeTarget(), 'Draw a clean icon', '1:1'),
    ).rejects.toThrow('Invalid JSON in OpenRouter image response')
  })
})
