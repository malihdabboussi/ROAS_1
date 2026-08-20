'use client'

import { useEffect, useState } from 'react'
import { buildChatHistoryClientFolderMaps } from '@/components/conversations'
import { fetchCampaigns } from '@/lib/campaigns'
import type { ChatHistoryGroupBy } from '@/lib/conversations'
import { fetchPrograms } from '@/lib/programs'

export function useChatHistoryGroupLabels(groupBy: ChatHistoryGroupBy): {
  campaignNameById: Record<string, string>
  clientCampaignIds: string[]
} {
  const [campaignNameById, setCampaignNameById] = useState<Record<string, string>>({})
  const [clientCampaignIds, setClientCampaignIds] = useState<string[]>([])

  useEffect(() => {
    if (groupBy !== 'campaign' && groupBy !== 'client') return
    let cancelled = false
    void Promise.all([fetchCampaigns(), fetchPrograms()])
      .then(([campaigns, programs]) => {
        if (cancelled) return
        if (groupBy === 'client') {
          const maps = buildChatHistoryClientFolderMaps(campaigns, programs)
          setCampaignNameById(maps.clientNameById)
          setClientCampaignIds(maps.clientCampaignIds)
          return
        }
        const map: Record<string, string> = {}
        for (const campaign of campaigns) {
          map[campaign.id] = campaign.name?.trim() || 'Campaign'
        }
        setCampaignNameById(map)
        setClientCampaignIds([])
      })
      .catch(() => {
        if (cancelled) return
        setCampaignNameById({})
        setClientCampaignIds([])
      })
    return () => {
      cancelled = true
    }
  }, [groupBy])

  return { campaignNameById, clientCampaignIds }
}
