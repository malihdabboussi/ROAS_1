import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { MediaSocialCacheController } from '../media-social-cache.controller'
import { MediaUploadController } from '../media-upload.controller'

function createController() {
  const mediaService = {
    cacheSocialImage: vi.fn(async (_platform: string, sourceUrl: string, cacheKey: string) => ({
      cacheKey,
      ok: sourceUrl.includes('ok'),
      assetId: sourceUrl.includes('ok') ? 'asset-1' : undefined,
      url: sourceUrl.includes('ok') ? 'https://storage.example.com/thumb.jpg' : undefined,
      filePath: sourceUrl.includes('ok') ? 'user-1/external/instagram/thumb.jpg' : undefined,
      cachedAt: sourceUrl.includes('ok') ? '2026-05-09T12:00:00.000Z' : undefined,
      error: sourceUrl.includes('ok') ? undefined : 'Upstream 403',
    })),
    importFromUrl: vi.fn(async () => ({
      success: true,
      asset: {
        id: 'asset-1',
        name: 'remote.jpg',
      },
    })),
  }
  const socialController = new MediaSocialCacheController(mediaService as never)
  const uploadController = new MediaUploadController(mediaService as never)
  return { socialController, uploadController, mediaService }
}

describe('MediaController.cacheInstagramImages', () => {
  it('returns per-image cache results', async () => {
    const { socialController, mediaService } = createController()

    const result = await socialController.cacheInstagramImages(
      { id: 'user-1', email: 'user@example.com' },
      { orgId: null } as never,
      {
        images: [
          {
            sourceUrl: 'https://instagram.fadd2-1.fna.fbcdn.net/ok.jpg',
            cacheKey: 'ig/user/ok/thumbnail',
          },
          {
            sourceUrl: 'https://instagram.fadd2-1.fna.fbcdn.net/fail.jpg',
            cacheKey: 'ig/user/fail/thumbnail',
          },
        ],
      },
    )

    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(2)
    expect(result.results[0].ok).toBe(true)
    expect(result.results[1].ok).toBe(false)
    expect(mediaService.cacheSocialImage).toHaveBeenCalledTimes(2)
    expect(mediaService.cacheSocialImage).toHaveBeenCalledWith(
      'instagram',
      'https://instagram.fadd2-1.fna.fbcdn.net/ok.jpg',
      'ig/user/ok/thumbnail',
      { id: 'user-1', email: 'user@example.com' },
      null,
      { name: undefined },
    )
  })

  it('rejects invalid cache payloads', async () => {
    const { socialController } = createController()

    await expect(
      socialController.cacheInstagramImages(
        { id: 'user-1', email: 'user@example.com' },
        { orgId: null } as never,
        { images: [] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})

describe('MediaController.importFromUrl', () => {
  it('imports a remote media URL through the media service with org scope', async () => {
    const { uploadController, mediaService } = createController()

    const result = await uploadController.importFromUrl(
      { id: 'user-1', email: 'user@example.com' },
      { orgId: 'org-1' } as never,
      {
        url: 'https://cdn.example.com/remote.jpg',
        campaign_id: '00000000-0000-4000-8000-000000000001',
        category: 'product',
      },
    )

    expect(result.success).toBe(true)
    expect(mediaService.importFromUrl).toHaveBeenCalledWith(
      {
        url: 'https://cdn.example.com/remote.jpg',
        campaign_id: '00000000-0000-4000-8000-000000000001',
        category: 'product',
      },
      { id: 'user-1', email: 'user@example.com' },
      'org-1',
    )
  })

  it('rejects invalid import payloads before calling the media service', async () => {
    const { uploadController, mediaService } = createController()

    await expect(
      uploadController.importFromUrl(
        { id: 'user-1', email: 'user@example.com' },
        { orgId: null } as never,
        { url: 'not-a-url' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(mediaService.importFromUrl).not.toHaveBeenCalled()
  })

  it('returns bad request when the media service rejects a remote URL', async () => {
    const { uploadController, mediaService } = createController()
    mediaService.importFromUrl.mockResolvedValueOnce({
      success: false,
      error: 'URL is not allowed',
    })

    await expect(
      uploadController.importFromUrl(
        { id: 'user-1', email: 'user@example.com' },
        { orgId: null } as never,
        { url: 'https://cdn.example.com/remote.jpg' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
