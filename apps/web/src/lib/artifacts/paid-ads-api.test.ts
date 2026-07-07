import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  createAdCampaign,
  createAdSet,
  deleteAdCampaign,
  deleteAdSet,
  deleteUngroupedAds,
  duplicateAdCampaign,
  duplicateAdSet,
  fetchAdCampaign,
  fetchAdSet,
  fetchCampaignAdCampaigns,
  fetchCampaignAds,
  getAdSetDeliveryEstimate,
  refreshAdCampaignMetaStatus,
  refreshAdSetMetaStatus,
  setAdCampaignMetaStatus,
  setAdSetMetaStatus,
  updateAdCampaign,
  updateAdSet,
} from './paid-ads-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
}))

const backendDeleteMock = vi.mocked(backendDelete)
const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)
const cachedFetchMock = vi.mocked(cachedFetch)

describe('paid ads API', () => {
  beforeEach(() => {
    backendDeleteMock.mockReset()
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
    cachedFetchMock.mockReset()
    cachedFetchMock.mockImplementation((_key: string, fetcher: () => Promise<unknown>) =>
      fetcher(),
    )
  })

  it('fetches campaign-scoped paid ads through cached backend routes', async () => {
    backendGetMock.mockResolvedValueOnce([{ id: 'ad-1' }]).mockResolvedValueOnce([
      { id: 'ad-campaign-1' },
    ])

    await expect(fetchCampaignAds('campaign-1', 'space-1')).resolves.toEqual([{ id: 'ad-1' }])
    await expect(
      fetchCampaignAdCampaigns('campaign-1', 'space-1', { summary: true }),
    ).resolves.toEqual([{ id: 'ad-campaign-1' }])

    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      1,
      'artifact-list:/api/campaigns/campaign-1/ads?space_id=space-1',
      expect.any(Function),
    )
    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      2,
      'artifact-list:/api/campaigns/campaign-1/ad-campaigns?space_id=space-1&fields=summary',
      expect.any(Function),
    )
  })

  it('maps ad campaign mutations to the existing backend routes', async () => {
    backendGetMock.mockResolvedValueOnce({ id: 'ad-campaign-1' })
    backendPostMock
      .mockResolvedValueOnce({ id: 'created-campaign' })
      .mockResolvedValueOnce({ id: 'duplicated-campaign' })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
    backendPatchMock.mockResolvedValueOnce({ id: 'ad-campaign-1', name: 'Renamed' })
    backendDeleteMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ deleted: 2 })

    await fetchAdCampaign('ad-campaign-1')
    await createAdCampaign('campaign-1', undefined, 'space-1')
    await updateAdCampaign('ad-campaign-1', { name: 'Renamed' })
    await deleteAdCampaign('ad-campaign-1', 'delete_all')
    await deleteUngroupedAds('campaign-1')
    await duplicateAdCampaign('ad-campaign-1')
    await setAdCampaignMetaStatus('ad-campaign-1', 'ACTIVE')
    await refreshAdCampaignMetaStatus('ad-campaign-1')

    expect(backendGetMock).toHaveBeenCalledWith('/api/ad-campaigns/ad-campaign-1')
    expect(backendPostMock).toHaveBeenNthCalledWith(1, '/api/campaigns/campaign-1/ad-campaigns', {
      name: 'Untitled Campaign',
      space_id: 'space-1',
    })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/ad-campaigns/ad-campaign-1', {
      name: 'Renamed',
    })
    expect(backendDeleteMock).toHaveBeenNthCalledWith(
      1,
      '/api/ad-campaigns/ad-campaign-1?delete_mode=delete_all',
    )
    expect(backendDeleteMock).toHaveBeenNthCalledWith(
      2,
      '/api/campaigns/campaign-1/ungrouped-ads',
    )
    expect(backendPostMock).toHaveBeenNthCalledWith(
      2,
      '/api/ad-campaigns/ad-campaign-1/duplicate',
      {},
    )
    expect(backendPostMock).toHaveBeenNthCalledWith(
      3,
      '/api/ad-campaigns/ad-campaign-1/set-meta-status',
      { status: 'ACTIVE' },
    )
    expect(backendPostMock).toHaveBeenNthCalledWith(
      4,
      '/api/ad-campaigns/ad-campaign-1/refresh-meta-status',
      {},
    )
  })

  it('maps ad set mutations to the existing backend routes', async () => {
    backendGetMock
      .mockResolvedValueOnce({ id: 'ad-set-1' })
      .mockResolvedValueOnce({ estimate_ready: true })
    backendPostMock
      .mockResolvedValueOnce({ id: 'created-ad-set' })
      .mockResolvedValueOnce({ id: 'duplicated-ad-set' })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
    backendPatchMock.mockResolvedValueOnce({ id: 'ad-set-1', name: 'Retargeting' })
    backendDeleteMock.mockResolvedValueOnce(undefined)

    await createAdSet('ad-campaign-1', undefined, 'space-1')
    await fetchAdSet('ad-set-1')
    await updateAdSet('ad-set-1', { name: 'Retargeting' })
    await deleteAdSet('ad-set-1', 'keep_ads')
    await duplicateAdSet('ad-set-1')
    await getAdSetDeliveryEstimate('ad-set-1')
    await setAdSetMetaStatus('ad-set-1', 'PAUSED')
    await refreshAdSetMetaStatus('ad-set-1')

    expect(backendPostMock).toHaveBeenNthCalledWith(
      1,
      '/api/ad-campaigns/ad-campaign-1/ad-sets',
      {
        name: 'Untitled Ad Set',
        space_id: 'space-1',
      },
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/ad-sets/ad-set-1')
    expect(backendPatchMock).toHaveBeenCalledWith('/api/ad-sets/ad-set-1', {
      name: 'Retargeting',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith('/api/ad-sets/ad-set-1?delete_mode=keep_ads')
    expect(backendPostMock).toHaveBeenNthCalledWith(2, '/api/ad-sets/ad-set-1/duplicate', {})
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/ad-sets/ad-set-1/delivery-estimate')
    expect(backendPostMock).toHaveBeenNthCalledWith(
      3,
      '/api/ad-sets/ad-set-1/set-meta-status',
      { status: 'PAUSED' },
    )
    expect(backendPostMock).toHaveBeenNthCalledWith(
      4,
      '/api/ad-sets/ad-set-1/refresh-meta-status',
      {},
    )
  })
})
