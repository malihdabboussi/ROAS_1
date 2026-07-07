import { lookup } from 'node:dns/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaAssetRow } from '../../dto'
import { MediaRepository } from '../../repositories/media.repository'
import { MediaUploadRepository } from '../../repositories/media-upload.repository'
import { MediaService } from '../media.service'

const mocks = vi.hoisted(() => ({
  insertedAsset: null as MediaAssetRow | null,
  createSignedUrl: vi.fn(),
  upload: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        createSignedUrl: mocks.createSignedUrl,
      }),
    },
    from: () => ({
      insert: mocks.insert,
    }),
  }),
}))

function baseAsset(overrides: Partial<MediaAssetRow> = {}): MediaAssetRow {
  return {
    id: 'asset-1',
    user_id: 'user-1',
    name: 'Imported image',
    original_filename: 'good.gif',
    file_path: 'user-1/images/good.gif',
    bucket_name: 'media',
    file_size: 4,
    mime_type: 'image/gif',
    width: null,
    height: null,
    asset_type: 'image',
    category: 'product',
    subcategory: null,
    campaign_id: 'campaign-1',
    tags: [],
    description: null,
    is_public: false,
    public_url: 'https://storage.example.com/good.gif',
    source: 'upload',
    source_model: null,
    source_prompt: null,
    usage_count: 0,
    last_used_at: null,
    created_at: '2026-06-07T12:00:00.000Z',
    updated_at: '2026-06-07T12:00:00.000Z',
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
    { indexAsset: vi.fn().mockResolvedValue(undefined) } as never,
    new MediaRepository(config),
    new MediaUploadRepository(config),
    {} as never,
  )
}

describe('MediaService.importFromUrl', () => {
  beforeEach(() => {
    mocks.insertedAsset = baseAsset()
    mocks.createSignedUrl.mockReset()
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed.gif' },
    })
    mocks.upload.mockReset()
    mocks.upload.mockResolvedValue({ error: null })
    mocks.insert.mockReset()
    mocks.insert.mockReturnValue({
      select: () => ({
        single: async () => ({ data: mocks.insertedAsset, error: null }),
      }),
    })
    vi.mocked(lookup).mockReset()
    vi.mocked(lookup).mockImplementation(async (hostname: string) => {
      if (hostname === 'cdn.example.com') {
        return [{ address: '93.184.216.34', family: 4 }]
      }
      return [{ address: '127.0.0.1', family: 4 }]
    })
    vi.stubGlobal('fetch', vi.fn())
  })

  it('blocks private network URLs before fetching or uploading', async () => {
    const service = createService()

    const result = await service.importFromUrl(
      { url: 'http://127.0.0.1/private.gif', campaign_id: 'campaign-1', category: 'product' },
      { id: 'user-1' },
      null,
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('URL is not allowed')
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('blocks redirects to private metadata hosts before following them', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      }) as never,
    )
    const service = createService()

    const result = await service.importFromUrl(
      { url: 'https://cdn.example.com/redirect.gif', campaign_id: 'campaign-1' },
      { id: 'user-1' },
      null,
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('URL is not allowed')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('rejects non-media responses', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }) as never,
    )
    const service = createService()

    const result = await service.importFromUrl(
      { url: 'https://cdn.example.com/page.html' },
      { id: 'user-1' },
      null,
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('URL does not point to a supported image or video')
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('rejects oversized responses before buffering', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('too big', {
        status: 200,
        headers: {
          'content-type': 'image/gif',
          'content-length': String(50 * 1024 * 1024 + 1),
        },
      }) as never,
    )
    const service = createService()

    const result = await service.importFromUrl(
      { url: 'https://cdn.example.com/huge.gif' },
      { id: 'user-1' },
      null,
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Remote file is too large')
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('imports a valid public image through the media upload path', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: {
          'content-type': 'image/gif',
          'content-length': '4',
        },
      }) as never,
    )
    const service = createService()

    const result = await service.importFromUrl(
      {
        url: 'https://cdn.example.com/path/good.gif',
        campaign_id: 'campaign-1',
        category: 'product',
      },
      { id: 'user-1' },
      'org-1',
    )

    expect(result.success).toBe(true)
    expect(result.asset_ref).toEqual({
      kind: 'vibey_asset',
      asset_id: 'asset-1',
      bucket_name: 'media',
      file_path: 'user-1/images/good.gif',
      url: 'https://storage.example.com/signed.gif',
      mime_type: 'image/gif',
      asset_type: 'image',
      name: 'Imported image',
      original_filename: 'good.gif',
      file_size: 4,
      campaign_id: 'campaign-1',
      space_id: null,
      org_id: null,
      source: 'upload',
      source_surface: null,
    })
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/images\/.+\.gif$/),
      Buffer.from([1, 2, 3, 4]),
      { contentType: 'image/gif', upsert: false },
    )
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        name: 'good.gif',
        original_filename: 'good.gif',
        mime_type: 'image/gif',
        asset_type: 'image',
        category: 'product',
        campaign_id: 'campaign-1',
        org_id: 'org-1',
      }),
    )
  })
})
