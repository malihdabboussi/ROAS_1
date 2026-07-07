import { describe, expect, it, vi } from 'vitest'
import { WordpressMediaController } from './wordpress-media.controller'

describe('WordpressMediaController upload asset refs', () => {
  it('returns an external asset_ref for uploaded WordPress media', async () => {
    const wordpress = {
      uploadMedia: vi.fn().mockResolvedValue({
        id: 44,
        source_url: 'https://wp.example/uploads/hero.png',
        mime_type: 'image/png',
        media_type: 'image',
        title: { rendered: 'Hero' },
      }),
    }
    const controller = new WordpressMediaController(wordpress as never)

    await expect(
      controller.uploadMedia(
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
        {
          content_base64: Buffer.from('image').toString('base64'),
          filename: 'hero.png',
          mime_type: 'image/png',
          title: 'Hero',
        },
      ),
    ).resolves.toMatchObject({
      success: true,
      asset_ref: {
        kind: 'external_asset',
        provider: 'wordpress',
        external_id: '44',
        name: 'Hero',
        original_filename: 'hero.png',
        mime_type: 'image/png',
        asset_type: 'image',
        url: 'https://wp.example/uploads/hero.png',
        org_id: 'org-1',
      },
    })
  })
})
