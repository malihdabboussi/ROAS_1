'use client'

import { useEffect, useState } from 'react'
import { fetchCampaignTeam } from '@/features/studio/services/campaign.service'
import { campaignTeamToCanvasAgents } from '../lib/ad-canvas-campaign-agents'
import type { AdCanvasAgentOption } from '../types/ad-canvas.types'

export function useCampaignCanvasAgents(campaignId: string | null | undefined) {
  const [agents, setAgents] = useState<AdCanvasAgentOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!campaignId) {
      setAgents([])
      return
    }

    let cancelled = false
    setLoading(true)
    void fetchCampaignTeam(campaignId)
      .then((team) => {
        if (cancelled) return
        setAgents(campaignTeamToCanvasAgents(team))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [campaignId])

  return { agents, loading }
}
