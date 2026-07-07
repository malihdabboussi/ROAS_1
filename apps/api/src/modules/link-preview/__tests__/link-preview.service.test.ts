import { describe, expect, it, vi } from 'vitest'
import { LinkPreviewRepository } from '../repositories/link-preview.repository'
import { LinkPreviewService } from '../services/link-preview.service'

function createCacheMissQuery() {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  }
  return query
}

describe('LinkPreviewService', () => {
  it('resolves internal Vibey links without touching the shared preview cache', async () => {
    const supabase = { from: vi.fn(() => createCacheMissQuery()) }
    const service = new LinkPreviewService({} as never, new LinkPreviewRepository())

    await expect(
      service.resolveMany(['https://vibey.im/spaces/space-1/item-1'], {
        supabase: supabase as never,
        userId: 'user-1',
        orgId: 'org-1',
      }),
    ).resolves.toEqual([
      {
        url: 'https://vibey.im/spaces/space-1/item-1',
        provider: 'internal',
        title: null,
        description: null,
        imageUrl: null,
        iconUrl: null,
        siteName: 'Vibey',
        entityKind: 'space-item',
        entityId: 'item-1',
      },
    ])

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('uses the shared preview cache for non-private providers', async () => {
    const cachedPreview = {
      url: 'https://example.com',
      provider: 'generic',
      title: 'Cached',
      description: null,
      imageUrl: null,
      iconUrl: null,
      siteName: null,
    }
    const query = createCacheMissQuery()
    query.maybeSingle.mockResolvedValueOnce({
      data: {
        payload: cachedPreview,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      error: null,
    })
    const supabase = { from: vi.fn(() => query) }
    const service = new LinkPreviewService({} as never, new LinkPreviewRepository())

    await expect(
      service.resolveMany(['https://example.com'], {
        supabase: supabase as never,
        userId: 'user-1',
        orgId: null,
      }),
    ).resolves.toEqual([cachedPreview])

    expect(supabase.from).toHaveBeenCalledWith('link_preview_cache')
  })
})
