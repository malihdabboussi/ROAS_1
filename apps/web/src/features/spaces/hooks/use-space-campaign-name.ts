import { useEffect, useMemo, useState } from 'react'
import { programNameForCampaign } from '@/components/conversations/conversation-scope-groups'
import { isGeneralLabel } from '@/components/conversations/conversation-scope-sort'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { campaignListCacheKey, fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { useOrgStore } from '@/lib/org'
import { loadProgramsCached, type Program } from '@/lib/programs'
import { isHiddenClientGeneralSpace } from '@/lib/spaces/page-grader-client-general-space'
import { useSpacesStore } from '../store/use-spaces-store'
import type { Space } from '../types'
import { spaceBreadcrumbFolderLabel } from './space-breadcrumb-folder-label'

export function useSpaceCampaignName(activeSpace: Space | null) {
  const spaces = useSpacesStore((s) => s.spaces)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([])
  const [programs, setPrograms] = useState<Program[] | null>(null)

  useEffect(() => {
    cachedFetch(campaignListCacheKey(), fetchCampaigns, { ttlMs: 60_000 })
      .then(setAllCampaigns)
      .catch(() => setAllCampaigns([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadProgramsCached(activeOrgId ?? null)
      .then((rows) => {
        if (!cancelled) setPrograms(rows)
      })
      .catch(() => {
        if (!cancelled) setPrograms([])
      })
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  const campaign = useMemo(() => {
    if (!activeSpace?.campaign_id) return null
    return allCampaigns.find((row) => row.id === activeSpace.campaign_id) ?? null
  }, [activeSpace?.campaign_id, allCampaigns])

  const campaignName = campaign?.name ?? null
  const folderLabel =
    !activeSpace?.campaign_id
      ? null
      : !campaign
        ? null
        : isGeneralLabel(campaign.name) && programs === null
          ? null
          : spaceBreadcrumbFolderLabel(
              campaign.name,
              programNameForCampaign(campaign, programs ?? []),
            )

  const switcherTree = useMemo(() => {
    const byCampaign = new Map<string, { campaign: Campaign; spaces: typeof spaces }>()
    for (const c of allCampaigns) {
      const cSpaces = spaces.filter(
        (s) => s.campaign_id === c.id && !isHiddenClientGeneralSpace(s, c),
      )
      if (cSpaces.length > 0) byCampaign.set(c.id, { campaign: c, spaces: cSpaces })
    }
    return { byCampaign }
  }, [spaces, allCampaigns])

  return { allCampaigns, campaignName, folderLabel, switcherTree }
}
