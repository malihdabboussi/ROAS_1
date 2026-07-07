import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaAssetRow } from '../../dto'
import { MediaRepository } from '../../repositories/media.repository'
import { MediaUploadRepository } from '../../repositories/media-upload.repository'
import { MediaService } from '../media.service'

const mocks = vi.hoisted(() => ({
  existingAsset: null as MediaAssetRow | null,
  insertedAsset: null as MediaAssetRow | null,
  createSignedUrl: vi.fn(),
  upload: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        createSignedUrl: mocks.createSignedUrl,
      }),
    },
    from: () => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        neq: vi.fn(() => query),
        is: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data: mocks.existingAsset, error: null })),
        insert: mocks.insert,
        update: mocks.update,
      }
      return query
    },
  }),
}))

function baseAsset(overrides: Partial<MediaAssetRow> = {}): MediaAssetRow {
  return {
    id: 'asset-1',
    user_id: 'user-1',
    name: 'Cached IG',
    original_filename: 'cached.jpg',
    file_path: 'user-1/external/instagram/cache.jpg',
    bucket_name: 'media',
    file_size: 100,
    mime_type: 'image/jpeg',
    width: 100,
    height: 100,
    asset_type: 'image',
    category: 'instagram_research',
    subcategory: null,
    campaign_id: null,
    tags: [],
    description: null,
    is_public: false,
    public_url: 'https://old.example.com/signed.jpg',
    source: 'imported',
    source_model: null,
    source_prompt: null,
    usage_count: 0,
    last_used_at: null,
    created_at: '2026-05-09T12:00:00.000Z',
    updated_at: '2026-05-09T12:00:00.000Z',
    ...overrides,
  }
}

function createService(): MediaService {
  const config = {
    get: vi.fn((key: string) =>
      key === 'SUPABASE_URL' ? 'https://supabase.example.com' : 'service-role',
    ),
  } as never
  return new MediaService(
    {} as never,
    config,
    { indexAsset: vi.fn() } as never,
    new MediaRepository(config),
    new MediaUploadRepository(config),
    {} as never,
  )
}

describe('MediaService.cacheInstagramImage', () => {
  beforeEach(() => {
    mocks.existingAsset = null
    mocks.insertedAsset = baseAsset({
      id: 'asset-new',
      public_url: 'https://storage.example.com/new.jpg',
    })
    mocks.createSignedUrl.mockReset()
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed.jpg' },
    })
    mocks.upload.mockReset()
    mocks.upload.mockResolvedValue({ error: null })
    mocks.insert.mockReset()
    mocks.insert.mockReturnValue({
      select: () => ({
        single: async () => ({ data: mocks.insertedAsset, error: null }),
      }),
    })
    mocks.update.mockReset()
    mocks.update.mockReturnValue({
      eq: async () => ({ data: null, error: null }),
    })
    vi.stubGlobal('fetch', vi.fn())
  })

  it('rejects non-Instagram hosts before fetching', async () => {
    const service = createService()

    const result = await service.cacheInstagramImage(
      'https://example.com/image.jpg',
      'ig/user/media/thumbnail',
      { id: 'user-1' },
      null,
    )

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid Instagram media URL')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns an existing cached asset without refetching Instagram', async () => {
    mocks.existingAsset = baseAsset()
    const service = createService()

    const result = await service.cacheInstagramImage(
      'https://instagram.fadd2-1.fna.fbcdn.net/v/t51.71878-15/example.jpg',
      'ig/user/media/thumbnail',
      { id: 'user-1' },
      null,
    )

    expect(result).toMatchObject({
      cacheKey: 'ig/user/media/thumbnail',
      ok: true,
      assetId: 'asset-1',
      url: 'https://storage.example.com/signed.jpg',
      filePath: 'user-1/external/instagram/cache.jpg',
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      'user-1/external/instagram/cache.jpg',
      365 * 24 * 60 * 60,
    )
  })

  it('rejects non-image upstream responses', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response('not image', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }) as never,
    )
    const service = createService()

    const result = await service.cacheInstagramImage(
      'https://instagram.fadd2-1.fna.fbcdn.net/v/t51.71878-15/example.jpg',
      'ig/user/media/thumbnail',
      { id: 'user-1' },
      null,
    )

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Upstream is not an image')
    expect(mocks.upload).not.toHaveBeenCalled()
  })
})
