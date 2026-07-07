import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaAssetRow } from '../../dto'
import { MediaRepository } from '../../repositories/media.repository'
import { MediaUploadRepository } from '../../repositories/media-upload.repository'
import { MediaService } from '../media.service'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mocks.from,
    storage: {
      from: mocks.storageFrom,
    },
  }),
}))

function query(result: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const promise = Promise.resolve(result)
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  ;(q as unknown as PromiseLike<typeof result>).then = promise.then.bind(promise)
  ;(q as unknown as Promise<typeof result>).catch = promise.catch.bind(promise)
  ;(q as unknown as Promise<typeof result>).finally = promise.finally.bind(promise)
  return q
}

function asset(overrides: Partial<MediaAssetRow> = {}): MediaAssetRow {
  return {
    id: 'asset-1',
    user_id: 'user-1',
    name: 'Asset',
    original_filename: 'asset.png',
    file_path: 'user-1/images/asset.png',
    bucket_name: 'media',
    file_size: 123,
    mime_type: 'image/png',
    width: null,
    height: null,
    asset_type: 'image',
    category: 'product',
    subcategory: null,
    campaign_id: null,
    tags: [],
    description: null,
    is_public: false,
    public_url: 'https://storage.example.com/asset.png',
    source: 'upload',
    source_model: null,
    source_prompt: null,
    usage_count: 0,
    last_used_at: null,
    created_at: '2026-06-17T07:00:00.000Z',
    updated_at: '2026-06-17T07:00:00.000Z',
    ...overrides,
  }
}

function createService() {
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
    {
      deleteSource: vi.fn().mockResolvedValue(undefined),
      indexSource: vi.fn().mockResolvedValue(undefined),
    } as never,
  )
}

describe('MediaService asset library behavior', () => {
  beforeEach(() => {
    mocks.from.mockReset()
    mocks.storageFrom.mockReset()
  })

  it('lists personal library assets while preserving hidden-category filtering', async () => {
    const listQuery = query({ data: [asset()], count: 1, error: null })
    mocks.from.mockReturnValueOnce(listQuery)
    const service = createService()

    await expect(
      service.listAssets(
        { limit: 20, offset: 0, campaign_id: undefined, asset_type: undefined, category: undefined },
        { id: 'user-1' },
        null,
      ),
    ).resolves.toEqual({ assets: [asset()], total: 1 })

    expect(mocks.from).toHaveBeenCalledWith('media_assets')
    expect(listQuery.or).toHaveBeenCalledWith(
      'category.is.null,category.not.in.(instagram_research,tiktok_research,youtube_research,twitter_research,agent-avatar,brain_import,theme-logo)',
    )
    expect(listQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(listQuery.is).toHaveBeenCalledWith('org_id', null)
    expect(listQuery.range).toHaveBeenCalledWith(0, 19)
  })

  it('updates owner assets and reindexes the updated row', async () => {
    const existing = asset()
    const updated = asset({ name: 'Updated' })
    const findQuery = query({ data: existing, error: null })
    const updateQuery = query({ data: updated, error: null })
    mocks.from.mockReturnValueOnce(findQuery).mockReturnValueOnce(updateQuery)
    const service = createService()

    await expect(
      service.updateAsset('asset-1', { name: 'Updated' }, { id: 'user-1' }, null),
    ).resolves.toEqual(updated)

    expect(updateQuery.update).toHaveBeenCalledWith({ name: 'Updated' })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'asset-1')
  })

  it('deletes owner assets from storage and marks the asset row deleted', async () => {
    const findQuery = query({ data: asset(), error: null })
    const deleteQuery = query({ error: null })
    const remove = vi.fn().mockResolvedValue({ error: null })
    mocks.from.mockReturnValueOnce(findQuery).mockReturnValueOnce(deleteQuery)
    mocks.storageFrom.mockReturnValueOnce({ remove })
    const service = createService()

    await expect(service.deleteAsset('asset-1', { id: 'user-1' }, null)).resolves.toBe(true)

    expect(remove).toHaveBeenCalledWith(['user-1/images/asset.png'])
    expect(deleteQuery.delete).toHaveBeenCalled()
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'asset-1')
  })

  it('refreshes an accessible asset signed URL and stores the refreshed URL', async () => {
    const findQuery = query({ data: asset(), error: null })
    const updateQuery = query({ error: null })
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/refreshed.png' },
    })
    mocks.from.mockReturnValueOnce(findQuery).mockReturnValueOnce(updateQuery)
    mocks.storageFrom.mockReturnValueOnce({ createSignedUrl })
    const service = createService()

    await expect(service.refreshUrl('asset-1', { id: 'user-1' }, null)).resolves.toBe(
      'https://storage.example.com/refreshed.png',
    )

    expect(createSignedUrl).toHaveBeenCalledWith('user-1/images/asset.png', 365 * 24 * 60 * 60)
    expect(updateQuery.update).toHaveBeenCalledWith({
      public_url: 'https://storage.example.com/refreshed.png',
    })
  })

  it('registers campaign uploads as media assets and returns a normalized asset ref', async () => {
    const uploadedAsset = asset({
      id: 'campaign-asset-1',
      name: 'deck.png',
      original_filename: 'deck.png',
      file_path: 'user-1/campaign-1/exports/file.png',
      bucket_name: 'campaigns',
      file_size: 3,
      mime_type: 'image/png',
      category: 'campaign_upload',
      campaign_id: 'campaign-1',
      public_url: 'https://cdn.example.com/campaign.png',
      org_id: null,
      source: 'upload',
      source_surface: 'campaign',
    })
    const insertQuery = query({ data: uploadedAsset, error: null })
    mocks.from.mockReturnValueOnce(insertQuery)
    mocks.storageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'https://cdn.example.com/campaign.png' },
      })),
    })
    const service = createService()

    const result = await service.uploadCampaignAsset(
      Buffer.from('png'),
      'image/png',
      'user-1',
      'campaign-1',
      'deck.png',
      'exports',
    )

    expect(mocks.from).toHaveBeenCalledWith('media_assets')
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        name: 'deck.png',
        original_filename: 'deck.png',
        bucket_name: 'campaigns',
        asset_type: 'image',
        category: 'campaign_upload',
        source: 'upload',
        source_surface: 'campaign',
        status: 'ready',
      }),
    )
    expect(result.assetId).toBe('campaign-asset-1')
    expect(result.asset_ref).toEqual({
      kind: 'vibey_asset',
      asset_id: 'campaign-asset-1',
      bucket_name: 'campaigns',
      file_path: 'user-1/campaign-1/exports/file.png',
      url: 'https://cdn.example.com/campaign.png',
      mime_type: 'image/png',
      asset_type: 'image',
      name: 'deck.png',
      original_filename: 'deck.png',
      file_size: 3,
      campaign_id: 'campaign-1',
      space_id: null,
      org_id: null,
      source: 'upload',
      source_surface: 'campaign',
    })
  })
})
