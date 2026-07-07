import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getCachedCampaigns,
  invalidateOrgCampaigns,
  isCampaignFetchInFlight,
  prefetchOrgCampaigns,
} from './home-feed-campaign-cache'

const fetchCampaignsMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaigns: fetchCampaignsMock,
}))

describe('home-feed-campaign-cache', () => {
  beforeEach(() => {
    fetchCampaignsMock.mockReset()
    invalidateOrgCampaigns('org-1')
  })

  it('deduplicates in-flight campaign fetches and caches by org', async () => {
    const campaigns = [{ id: 'campaign-1', name: 'Campaign' }]
    fetchCampaignsMock.mockResolvedValue(campaigns)

    const first = prefetchOrgCampaigns('org-1')
    const second = prefetchOrgCampaigns('org-1')

    expect(first).toBe(second)
    expect(isCampaignFetchInFlight('org-1')).toBe(true)
    await expect(first).resolves.toBe(campaigns)
    expect(fetchCampaignsMock).toHaveBeenCalledWith({ orgId: 'org-1' })
    expect(fetchCampaignsMock).toHaveBeenCalledTimes(1)
    expect(getCachedCampaigns('org-1')).toBe(campaigns)
  })
})
