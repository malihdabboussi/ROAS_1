import { useEffect, useMemo, useState } from 'react'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { campaignListCacheKey, fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { useSpacesStore } from '../store/use-spaces-store'
import type { Space } from '../types'

export function useSpaceCampaignName(activeSpace: Space | null) {
  const spaces = useSpacesStore((s) => s.spaces)
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    cachedFetch(campaignListCacheKey(), fetchCampaigns, { ttlMs: 60_000 })
      .then(setAllCampaigns)
      .catch(() => setAllCampaigns([]))
  }, [])

  const campaignName = useMemo(() => {
    if (!activeSpace?.campaign_id) return null
    return allCampaigns.find((c) => c.id === activeSpace.campaign_id)?.name ?? null
  }, [activeSpace?.campaign_id, allCampaigns])

  const switcherTree = useMemo(() => {
    const byCampaign = new Map<string, { campaign: Campaign; spaces: typeof spaces }>()
    for (const c of allCampaigns) {
      const cSpaces = spaces.filter((s) => s.campaign_id === c.id)
      if (cSpaces.length > 0) byCampaign.set(c.id, { campaign: c, spaces: cSpaces })
    }
    return { byCampaign }
  }, [spaces, allCampaigns])

  return { allCampaigns, campaignName, switcherTree }
}
