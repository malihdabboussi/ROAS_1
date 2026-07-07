'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Ad, AdCampaign, AdSet } from '@/lib/artifacts'
import { fetchCampaignAdCampaigns, fetchCampaignAds } from '@/lib/artifacts/paid-ads-api'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'

export const PAID_ADS_META_STATUS_REFRESHED_EVENT = 'paid-ads:meta-status-refreshed'
export const PAID_ADS_SELECTION_EVENT = 'paid-ads:selection'
export const PAID_ADS_OPEN_CANVAS_REQUEST_EVENT = 'paid-ads:open-canvas-request'

export type PaidAdsToolbarSelection =
  | { kind: 'campaign' | 'ungrouped' | null }
  | { kind: 'ad_set'; adSetId: string }
  | { kind: 'ad'; adId: string; adSetId: string | null }

export interface PaidAdsSelectionEventDetail {
  campaignId: string | null
  selection: PaidAdsToolbarSelection
}

export interface PaidAdsOpenCanvasRequestDetail {
  campaignId: string | null
}

export function usePaidAdsData(campaignId: string | null, enabled = true, spaceId?: string) {
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(() => Boolean(enabled && campaignId))
  const [error, setError] = useState<string | null>(null)
  const loadGenRef = useRef(0)

  const load = useCallback(
    async (silent?: boolean) => {
      if (!enabled || !campaignId) {
        setAdCampaigns([])
        setAds([])
        setLoading(false)
        setError(null)
        return
      }
      const gen = ++loadGenRef.current
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        // Summary: structure panes read ad-set metadata only; creatives come
        // from the flat ads list (which keeps TSX fields).
        const [campaigns, campaignAds] = await Promise.all([
          fetchCampaignAdCampaigns(campaignId, spaceId, { summary: true }),
          fetchCampaignAds(campaignId, spaceId),
        ])
        if (gen !== loadGenRef.current) return
        setAdCampaigns(campaigns)
        setAds(campaignAds)
      } catch (err) {
        if (gen !== loadGenRef.current) return
        if (!silent) {
          setAdCampaigns([])
          setAds([])
          setError(err instanceof Error ? err.message : 'Failed to load paid ads')
        }
      } finally {
        if (gen === loadGenRef.current) setLoading(false)
      }
    },
    [campaignId, enabled, spaceId],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!enabled || !campaignId) return
    const handleRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ campaignId: string | null }>).detail
      if (detail?.campaignId !== campaignId) return
      void load(true)
    }
    window.addEventListener(PAID_ADS_META_STATUS_REFRESHED_EVENT, handleRefresh)
    return () => window.removeEventListener(PAID_ADS_META_STATUS_REFRESHED_EVENT, handleRefresh)
  }, [campaignId, enabled, load])

  useEffect(() => {
    if (!enabled || !campaignId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    let timer: ReturnType<typeof setTimeout> | null = null
    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void load(true), 400)
    }
    // ad_sets has no campaign_id column — scope by org (personal context falls
    // back to unfiltered, where RLS limits events to the user's own rows).
    const activeOrgId = getActiveOrgIdFromStorage()
    const channel = supabase
      .channel(`paid-ads:${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ads', filter: `campaign_id=eq.${campaignId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ad_sets',
          ...(activeOrgId ? { filter: `org_id=eq.${activeOrgId}` } : {}),
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ad_campaigns',
          filter: `campaign_id=eq.${campaignId}`,
        },
        refresh,
      )
      .subscribe()
    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [campaignId, enabled, load])

  const ungroupedAds = useMemo(() => ads.filter((a) => !a.ad_set_id), [ads])

  const adsByAdSetId = useMemo(() => {
    const map = new Map<string, Ad[]>()
    for (const ad of ads) {
      if (!ad.ad_set_id) continue
      const bucket = map.get(ad.ad_set_id) ?? []
      bucket.push(ad)
      map.set(ad.ad_set_id, bucket)
    }
    return map
  }, [ads])

  const allAdSets = useMemo(
    () =>
      adCampaigns.flatMap((c) =>
        (c.ad_sets ?? []).map((s) => ({
          ...s,
          ad_campaign_id: c.id,
          ad_campaign_name: c.name,
        })),
      ),
    [adCampaigns],
  )

  const insertAdSet = useCallback((adCampaignId: string, adSet: AdSet) => {
    setAdCampaigns((prev) =>
      prev.map((c) =>
        c.id === adCampaignId ? { ...c, ad_sets: [...(c.ad_sets ?? []), adSet] } : c,
      ),
    )
  }, [])

  const insertAdCampaign = useCallback((adCampaign: AdCampaign) => {
    setAdCampaigns((prev) => [...prev, { ...adCampaign, ad_sets: adCampaign.ad_sets ?? [] }])
  }, [])

  const insertAd = useCallback((ad: Ad) => {
    setAds((prev) => [...prev, ad])
  }, [])

  const patchAdCampaign = useCallback((updated: AdCampaign) => {
    setAdCampaigns((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
  }, [])

  const patchAdSet = useCallback((updated: AdSet) => {
    setAdCampaigns((prev) =>
      prev.map((c) => {
        const sets = c.ad_sets ?? []
        if (!sets.some((s) => s.id === updated.id)) return c
        return {
          ...c,
          ad_sets: sets.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
        }
      }),
    )
  }, [])

  const refreshSilent = useCallback(() => void load(true), [load])

  return {
    adCampaigns,
    ads,
    ungroupedAds,
    adsByAdSetId,
    allAdSets,
    loading,
    error,
    refresh: load,
    refreshSilent,
    insertAdSet,
    insertAdCampaign,
    insertAd,
    patchAdCampaign,
    patchAdSet,
  }
}
