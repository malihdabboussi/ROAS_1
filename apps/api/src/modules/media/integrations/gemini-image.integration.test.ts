import type { ConfigService } from '@nestjs/config'
import { describe, expect, it, vi } from 'vitest'
import type { OpenRouterBillingClientService } from '../../provider-billing/services/openrouter-billing-client.service'
import { GeminiImageIntegration } from './gemini-image.integration'

describe('GeminiImageIntegration image editing', () => {
  it('routes GPT Image edits through OpenRouter with the source images attached', async () => {
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'OPENROUTER_MEDIA_API_KEY') return 'media-key'
        if (key === 'GEMINI_API_KEY') return 'gemini-key'
        return undefined
      }),
    } as unknown as ConfigService
    const createImage = vi.fn().mockResolvedValue({
      buffer: Buffer.from('output'),
      mimeType: 'image/png',
    })
    const billing = {
      createImage,
    } as unknown as OpenRouterBillingClientService
    const integration = new GeminiImageIntegration(config, billing)

    const result = await integration.editImage(
      [
        { buffer: Buffer.from('parent'), mimeType: 'image/png' },
        { buffer: Buffer.from('reference'), mimeType: 'image/jpeg' },
      ],
      'Make the background blue',
      '4:5',
      {
        model: 'gpt-5.4-image-2',
        userId: 'user-1',
        orgId: 'org-1',
        campaignId: 'campaign-1',
      },
    )

    expect(result.buffer.toString()).toBe('output')
    expect(createImage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-5.4-image-2',
        aspectRatio: '4:5',
        prompt: 'Make the background blue',
        inputReferences: [
          {
            base64: 'cGFyZW50',
            mimeType: 'image/png',
          },
          {
            base64: 'cmVmZXJlbmNl',
            mimeType: 'image/jpeg',
          },
        ],
      }),
    )
  })
})
