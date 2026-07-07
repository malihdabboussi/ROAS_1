import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  fetchFunnelPage,
  fetchFunnelPageBundle,
  fetchFunnelPageBundleCached,
  fetchFunnelPageCached,
  fetchFunnelWithPages,
  fetchFunnelWithPagesCached,
  invalidateFunnelPreviewCache,
  connectFunnelCustomDomain,
  deleteFunnel,
  publishFunnel,
  unpublishFunnel,
  updateFunnel,
} from './funnel-preview-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  invalidateCachedFetch: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)
const backendDeleteMock = vi.mocked(backendDelete)
const cachedFetchMock = vi.mocked(cachedFetch)
const invalidateCachedFetchMock = vi.mocked(invalidateCachedFetch)

describe('funnel preview API', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
    backendDeleteMock.mockReset()
    cachedFetchMock.mockReset()
    invalidateCachedFetchMock.mockReset()
    cachedFetchMock.mockImplementation((_key: string, fetcher: () => Promise<unknown>) =>
      fetcher(),
    )
  })

  it('fetches funnel preview routes from the backend API', async () => {
    backendGetMock.mockResolvedValueOnce({ id: 'funnel-1', pages: [] })
    backendGetMock.mockResolvedValueOnce({ id: 'page-1', generated_html: '<main />' })
    backendGetMock.mockResolvedValueOnce({ page: { id: 'page-1' }, files: [] })

    await expect(fetchFunnelWithPages('funnel-1')).resolves.toEqual({
      id: 'funnel-1',
      pages: [],
    })
    await expect(fetchFunnelPage('funnel-1', 'page-1')).resolves.toEqual({
      id: 'page-1',
      generated_html: '<main />',
    })
    await expect(fetchFunnelPageBundle('funnel-1', 'page-1')).resolves.toEqual({
      page: { id: 'page-1' },
      files: [],
    })

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/funnels/funnel-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/funnels/funnel-1/pages/page-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(
      3,
      '/api/funnels/funnel-1/pages/page-1/bundle',
    )
  })

  it('uses existing funnel preview cache keys and invalidation prefixes', async () => {
    backendGetMock.mockResolvedValue({})

    await fetchFunnelWithPagesCached('funnel-1')
    await fetchFunnelPageCached('funnel-1', 'page-1')
    await fetchFunnelPageBundleCached('funnel-1', 'page-1')
    invalidateFunnelPreviewCache('funnel-1')
    invalidateFunnelPreviewCache()

    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      1,
      'funnel-with-pages:funnel-1',
      expect.any(Function),
      { ttlMs: 60_000 },
    )
    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      2,
      'funnel-page:funnel-1:page-1:page',
      expect.any(Function),
      { ttlMs: 60_000 },
    )
    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      3,
      'funnel-page:funnel-1:page-1:bundle',
      expect.any(Function),
      { ttlMs: 60_000 },
    )
    expect(invalidateCachedFetchMock).toHaveBeenNthCalledWith(1, 'funnel-with-pages:funnel-1')
    expect(invalidateCachedFetchMock).toHaveBeenNthCalledWith(2, 'funnel-page:funnel-1:')
    expect(invalidateCachedFetchMock).toHaveBeenNthCalledWith(3, 'funnel-with-pages:')
    expect(invalidateCachedFetchMock).toHaveBeenNthCalledWith(4, 'funnel-page:')
  })

  it('mutates funnel menu routes and invalidates preview caches', async () => {
    backendPatchMock.mockResolvedValueOnce({ id: 'funnel-1', name: 'Launch v2' })
    backendPostMock.mockResolvedValueOnce({ status: 'published', slug: 'launch' })
    backendPostMock.mockResolvedValueOnce({ status: 'draft', slug: 'launch' })
    backendPostMock.mockResolvedValueOnce({ success: true, published_url: 'https://launch.test' })
    backendDeleteMock.mockResolvedValueOnce(undefined)

    await expect(updateFunnel('funnel-1', { name: 'Launch v2' })).resolves.toEqual({
      id: 'funnel-1',
      name: 'Launch v2',
    })
    await expect(publishFunnel('funnel-1')).resolves.toEqual({
      status: 'published',
      slug: 'launch',
    })
    await expect(unpublishFunnel('funnel-1')).resolves.toEqual({
      status: 'draft',
      slug: 'launch',
    })
    await expect(connectFunnelCustomDomain('funnel-1', 'domain-1')).resolves.toEqual({
      success: true,
      published_url: 'https://launch.test',
    })
    await deleteFunnel('funnel-1')

    expect(backendPatchMock).toHaveBeenCalledWith('/api/funnels/funnel-1', { name: 'Launch v2' })
    expect(backendPostMock).toHaveBeenNthCalledWith(1, '/api/funnels/funnel-1/publish', {})
    expect(backendPostMock).toHaveBeenNthCalledWith(2, '/api/funnels/funnel-1/unpublish', {})
    expect(backendPostMock).toHaveBeenNthCalledWith(3, '/api/domains/connect-funnel', {
      domain_id: 'domain-1',
      funnel_id: 'funnel-1',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith('/api/funnels/funnel-1')
    expect(invalidateCachedFetchMock).toHaveBeenCalledTimes(10)
  })
})
