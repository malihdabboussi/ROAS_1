import { beforeEach, describe, expect, it, vi } from 'vitest'

const createClient = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient,
}))

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
  }
  return chain
}

describe('InternalService', () => {
  beforeEach(() => {
    vi.resetModules()
    createClient.mockReset()
    process.env.SUPABASE_URL = 'https://supabase.example'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  })

  it('returns an existing offer with the same campaign and name', async () => {
    const offer = { id: 'offer-1', name: 'Launch Offer' }
    const offerQuery = makeChain({ data: offer, error: null })
    createClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'offers') return offerQuery
        throw new Error(`unexpected table ${table}`)
      }),
    })
    const { InternalRepository } = await import('./repositories/internal.repository')
    const { InternalService } = await import('./services/internal.service')
    const service = new InternalService(new InternalRepository())

    await expect(
      service.createOffer({
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        name: 'Launch Offer',
      }),
    ).resolves.toEqual(offer)
    expect(offerQuery.insert).not.toHaveBeenCalled()
  })

  it('uploads base64 campaign files and returns a storage asset ref', async () => {
    const upload = vi.fn(async () => ({ error: null }))
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn.example/file.png' } }))
    createClient.mockReturnValue({
      storage: {
        from: vi.fn(() => ({ upload, getPublicUrl })),
      },
    })
    const { InternalRepository } = await import('./repositories/internal.repository')
    const { InternalService } = await import('./services/internal.service')
    const service = new InternalService(new InternalRepository())

    await expect(
      service.uploadFile({
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        file_path: 'file.png',
        content: Buffer.from('hello').toString('base64'),
        content_type: 'image/png',
      }),
    ).resolves.toEqual({
      asset_ref: {
        kind: 'storage_asset',
        bucket_name: 'campaigns',
        file_path: 'user-1/campaign-1/file.png',
        url: 'https://cdn.example/file.png',
        mime_type: 'image/png',
        asset_type: 'image',
        name: 'file.png',
        original_filename: 'file.png',
        file_size: 5,
        user_id: 'user-1',
        org_id: null,
        source: 'internal_upload',
        source_surface: 'internal_storage',
        metadata: { campaign_id: 'campaign-1' },
      },
      url: 'https://cdn.example/file.png',
      path: 'user-1/campaign-1/file.png',
    })
    expect(upload).toHaveBeenCalledWith('user-1/campaign-1/file.png', Buffer.from('hello'), {
      contentType: 'image/png',
      upsert: true,
    })
  })
})
