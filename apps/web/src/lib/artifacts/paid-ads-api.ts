import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { Ad, AdCampaign, AdSet } from './artifact-types'

export async function fetchCampaignAds(campaignId: string, spaceId?: string): Promise<Ad[]> {
  const search = new URLSearchParams()
  if (spaceId) search.set('space_id', spaceId)
  const query = search.toString()
  const url = `/api/campaigns/${campaignId}/ads${query ? `?${query}` : ''}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Ad[]>(url))
}

/**
 * `opts.summary` returns ad_sets without nested ads (no TSX payloads) - list
 * views read ad-set names only. Concurrent callers share one request.
 */
export async function fetchCampaignAdCampaigns(
  campaignId: string,
  spaceId?: string,
  opts?: { summary?: boolean },
): Promise<AdCampaign[]> {
  const search = new URLSearchParams()
  if (spaceId) search.set('space_id', spaceId)
  if (opts?.summary) search.set('fields', 'summary')
  const query = search.toString()
  const url = `/api/campaigns/${campaignId}/ad-campaigns${query ? `?${query}` : ''}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<AdCampaign[]>(url))
}

export async function fetchAdCampaign(id: string): Promise<AdCampaign> {
  return backendGet<AdCampaign>(`/api/ad-campaigns/${id}`)
}

export async function createAdCampaign(
  campaignId: string,
  name?: string,
  spaceId?: string | null,
): Promise<AdCampaign> {
  return backendPost<AdCampaign>(`/api/campaigns/${campaignId}/ad-campaigns`, {
    name: name ?? 'Untitled Campaign',
    ...(spaceId !== undefined ? { space_id: spaceId } : {}),
  })
}

export async function updateAdCampaign(
  id: string,
  data: {
    name?: string
    objective?: string
    status?: string
    budget_type?: string
    daily_budget?: number | null
    lifetime_budget?: number | null
    bid_strategy?: string
    special_ad_categories?: string[]
    meta_ad_account_id?: string | null
    meta_page_id?: string | null
    schedule_type?: string
    start_time?: string | null
    end_time?: string | null
    metadata?: Record<string, unknown>
  },
): Promise<AdCampaign> {
  return backendPatch<AdCampaign>(`/api/ad-campaigns/${id}`, data)
}

export async function deleteAdCampaign(
  id: string,
  deleteMode: 'keep_ads' | 'delete_all' = 'keep_ads',
): Promise<void> {
  return backendDelete(`/api/ad-campaigns/${id}?delete_mode=${deleteMode}`)
}

export async function deleteUngroupedAds(campaignId: string): Promise<{ deleted: number }> {
  return backendDelete(`/api/campaigns/${campaignId}/ungrouped-ads`)
}

export async function duplicateAdCampaign(id: string): Promise<AdCampaign> {
  return backendPost<AdCampaign>(`/api/ad-campaigns/${id}/duplicate`, {})
}

export async function setAdCampaignMetaStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED',
): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>(`/api/ad-campaigns/${id}/set-meta-status`, { status })
}

export async function refreshAdCampaignMetaStatus(id: string): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>(`/api/ad-campaigns/${id}/refresh-meta-status`, {})
}

export async function createAdSet(
  adCampaignId: string,
  name?: string,
  spaceId?: string | null,
): Promise<AdSet> {
  return backendPost<AdSet>(`/api/ad-campaigns/${adCampaignId}/ad-sets`, {
    name: name ?? 'Untitled Ad Set',
    ...(spaceId !== undefined ? { space_id: spaceId } : {}),
  })
}

export async function fetchAdSet(id: string): Promise<AdSet> {
  return backendGet<AdSet>(`/api/ad-sets/${id}`)
}

export async function updateAdSet(
  id: string,
  data: {
    name?: string
    status?: string
    daily_budget?: number | null
    lifetime_budget?: number | null
    start_time?: string | null
    end_time?: string | null
    optimization_goal?: string
    billing_event?: string
    targeting?: Record<string, unknown>
    metadata?: Record<string, unknown>
  },
): Promise<AdSet> {
  return backendPatch<AdSet>(`/api/ad-sets/${id}`, data)
}

export async function deleteAdSet(
  id: string,
  deleteMode: 'keep_ads' | 'delete_all' = 'keep_ads',
): Promise<void> {
  return backendDelete(`/api/ad-sets/${id}?delete_mode=${deleteMode}`)
}

export async function duplicateAdSet(id: string): Promise<AdSet> {
  return backendPost<AdSet>(`/api/ad-sets/${id}/duplicate`, {})
}

export async function getAdSetDeliveryEstimate(id: string): Promise<{
  estimate_mau_lower_bound: number
  estimate_mau_upper_bound: number
  estimate_dau: number
  estimate_ready: boolean
  daily_outcomes_curve: Array<{ spend: number; reach: number; actions: number }>
}> {
  return backendGet(`/api/ad-sets/${id}/delivery-estimate`)
}

export async function setAdSetMetaStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED',
): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>(`/api/ad-sets/${id}/set-meta-status`, { status })
}

export async function refreshAdSetMetaStatus(id: string): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>(`/api/ad-sets/${id}/refresh-meta-status`, {})
}
