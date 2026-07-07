import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { Sequence } from './artifact-types'
export { fetchCampaignAdCampaigns } from './paid-ads-api'

export async function getMetaConnectionStatus(): Promise<{
  connected: boolean
  adAccounts: Array<{ id: string; name: string }> | null
  pages: Array<{ id: string; name: string }> | null
}> {
  return backendGet<{
    connected: boolean
    adAccounts: Array<{ id: string; name: string }> | null
    pages: Array<{ id: string; name: string }> | null
  }>('/api/integrations/meta/status')
}

export async function fetchMetaAdAccounts(): Promise<
  Array<{ id: string; name: string; currency: string }>
> {
  const res = await backendGet<{ data: Array<{ id: string; name: string; currency: string }> }>(
    '/api/integrations/meta/ad-accounts',
  )
  return res.data ?? []
}

export async function fetchMetaPixels(
  adAccountId: string,
): Promise<Array<{ id: string; name: string }>> {
  const res = await backendGet<{ data: Array<{ id: string; name: string }> }>(
    `/api/integrations/meta/ad-accounts/${encodeURIComponent(adAccountId)}/pixels`,
  )
  return res.data ?? []
}

/**
 * `opts.summary` returns email metadata without bodies - list views only show
 * counts/subjects. Sequence editors must use the sequence detail API.
 */
export async function fetchCampaignSequences(
  campaignId: string,
  spaceId?: string,
  opts?: { summary?: boolean },
): Promise<Sequence[]> {
  const search = new URLSearchParams()
  if (spaceId) search.set('space_id', spaceId)
  if (opts?.summary) search.set('fields', 'summary')
  const query = search.toString()
  const url = `/api/campaigns/${campaignId}/sequences${query ? `?${query}` : ''}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Sequence[]>(url))
}
