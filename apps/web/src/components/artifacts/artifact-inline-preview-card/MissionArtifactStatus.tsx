'use client'

import { useEffect, useState } from 'react'
import { fetchDeliverablesForMissions, fetchMissionById } from '@/lib/missions'

const TERMINAL_MISSION_STATUSES = new Set(['completed', 'done', 'failed', 'error', 'archived'])

export function MissionArtifactStatus({
  missionId,
  fallback,
}: {
  missionId: string
  fallback: string
}) {
  const [label, setLabel] = useState(fallback)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const refresh = async () => {
      try {
        const [mission, deliverablesByMission] = await Promise.all([
          fetchMissionById(missionId),
          fetchDeliverablesForMissions([missionId]),
        ])
        if (cancelled) return
        const outputCount = deliverablesByMission[missionId]?.length ?? 0
        const status = mission.status.replaceAll('_', ' ')
        setLabel(
          `${status}${outputCount > 0 ? ` · ${outputCount} output${outputCount === 1 ? '' : 's'}` : ''}`,
        )
        if (!TERMINAL_MISSION_STATUSES.has(mission.status)) {
          timer = setTimeout(() => void refresh(), 5000)
        }
      } catch {
        if (!cancelled) timer = setTimeout(() => void refresh(), 10000)
      }
    }
    void refresh()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [missionId])

  return <>{label}</>
}
