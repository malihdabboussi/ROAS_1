'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import {
  countOtherSpaces,
  groupOtherSpacesByCampaign,
  type OtherSpacesCampaignGroup,
} from '../lib/group-other-spaces-by-campaign'
import { useSpacesStore } from '../store/use-spaces-store'

export function useOtherSpacesByCampaign(excludeSpaceId: string) {
  const spaces = useSpacesStore((s) => s.spaces)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    let cancelled = false
    void fetchCampaigns()
      .then((rows) => {
        if (!cancelled) setCampaigns(rows)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo<OtherSpacesCampaignGroup[]>(
    () => groupOtherSpacesByCampaign(spaces, campaigns, excludeSpaceId),
    [spaces, campaigns, excludeSpaceId],
  )

  const totalCount = useMemo(() => countOtherSpaces(groups), [groups])

  return { groups, totalCount }
}
