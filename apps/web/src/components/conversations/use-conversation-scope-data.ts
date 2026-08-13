'use client'

import { useEffect, useState } from 'react'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { campaignListCacheKey, fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { getCachedCampaigns, prefetchOrgCampaigns } from '@/lib/home'
import { fetchSpaceById } from '@/lib/spaces'
import {
  findConversationScopeSpace,
  type ConversationScopeSpace,
} from './conversation-scope-picker-layout'

function sortCampaigns(rows: Campaign[]): Campaign[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

/** Campaign list for the scope picker — cache-first, then refreshed. */
export function useConversationScopeCampaigns(
  activeOrgId: string | null,
  cacheVersion: number,
): Campaign[] {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  useEffect(() => {
    let cancelled = false
    if (activeOrgId) {
      const cached = getCachedCampaigns(activeOrgId)
      if (cached) setCampaigns(sortCampaigns(cached))
      void prefetchOrgCampaigns(activeOrgId)
        .then((rows) => {
          if (!cancelled) setCampaigns(sortCampaigns(rows))
        })
        .catch(() => {
          if (!cancelled) setCampaigns(sortCampaigns(cached ?? []))
        })
    } else {
      void cachedFetch(campaignListCacheKey(null), () => fetchCampaigns({ orgId: null }), {
        ttlMs: 60_000,
      })
        .then((rows) => {
          if (!cancelled) setCampaigns(sortCampaigns(rows))
        })
        .catch(() => {
          if (!cancelled) setCampaigns([])
        })
    }
    return () => {
      cancelled = true
    }
  }, [activeOrgId, cacheVersion])
  return campaigns
}

/**
 * Direct lookup for the selected space when no campaign list can name it —
 * campaign-less spaces still get their real title this way.
 */
export function useConversationScopeFallbackSpace(input: {
  activeOrgId: string | null
  selectedCampaignId: string | null
  selectedSpaceId: string | null
  spacesByCampaign: Record<string, ConversationScopeSpace[]>
}): ConversationScopeSpace | null {
  const { activeOrgId, selectedCampaignId, selectedSpaceId, spacesByCampaign } = input
  const [fallbackSpace, setFallbackSpace] = useState<ConversationScopeSpace | null>(null)

  useEffect(() => {
    if (!selectedSpaceId) return
    // The campaign→spaces load owns resolution until its list has arrived.
    if (selectedCampaignId && !spacesByCampaign[selectedCampaignId]) return
    if (findConversationScopeSpace(spacesByCampaign, selectedSpaceId)) return
    if (fallbackSpace?.id === selectedSpaceId) return
    let cancelled = false
    void fetchSpaceById<ConversationScopeSpace>(
      selectedSpaceId,
      activeOrgId ? { orgId: activeOrgId } : { orgId: null },
    )
      .then((space) => {
        if (!cancelled && space?.id) setFallbackSpace(space)
      })
      .catch(() => {
        /* keep the generic label when the space is unreadable */
      })
    return () => {
      cancelled = true
    }
  }, [activeOrgId, fallbackSpace, selectedCampaignId, selectedSpaceId, spacesByCampaign])

  return fallbackSpace && fallbackSpace.id === selectedSpaceId ? fallbackSpace : null
}
