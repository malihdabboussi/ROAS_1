'use client'

import { useEffect, useState } from 'react'
import {
  backfillBrainScholar,
  fetchMissionAgents,
  type MissionAgent,
} from '@/lib/agents'

export function useBrainVisualizationAtlasAgent(
  reloadScopeNav: () => Promise<void> | void,
) {
  const [atlasAgent, setAtlasAgent] = useState<MissionAgent | null>(null)
  const [atlasLoading, setAtlasLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchMissionAgents()
      .then((agents) => {
        if (cancelled) return
        const atlas = agents.find((agent) => agent.agent_key === 'atlas') ?? null
        setAtlasAgent(atlas)
        setAtlasLoading(false)
        if (atlas) return
        backfillBrainScholar()
          .then((res) => {
            if (!cancelled && res.created) void reloadScopeNav()
          })
          .catch(() => {})
          .finally(() => {
            if (!cancelled) setAtlasLoading(false)
          })
      })
      .catch(() => {
        if (cancelled) return
        setAtlasAgent(null)
        setAtlasLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadScopeNav])

  return { atlasAgent, atlasLoading }
}
