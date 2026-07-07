'use client'

import { useEffect, useState } from 'react'
import { fetchBrainHealth } from '@/lib/brain'
import type { FireEmployeeHandoffInput } from './agent-fire-handoff'
import { SYSTEM_LIKE_AGENT_KEYS } from './agent-team-display'
import type { MissionAgent } from './mission-agents-api'

export function useTeamContainerFireData(selected: MissionAgent | null) {
  const [showFireConfirm, setShowFireConfirm] = useState(false)
  const [firingEmployee, setFiringEmployee] = useState(false)
  const [fireError, setFireError] = useState<string | null>(null)
  const [fireBrainTotal, setFireBrainTotal] = useState<number | null>(null)
  const [fireBrainLoading, setFireBrainLoading] = useState(false)
  const [fireHandoff, setFireHandoff] = useState<FireEmployeeHandoffInput | null>({
    scope: 'default',
  })

  useEffect(() => {
    const selectedLevel = selected?.level ?? 'employee'
    const unfireable =
      (selectedLevel !== 'employee' && selectedLevel !== 'manager') ||
      SYSTEM_LIKE_AGENT_KEYS.has(selected?.agent_key ?? '')
    if (unfireable) {
      setShowFireConfirm(false)
      setFireError(null)
    }
  }, [selected?.level, selected?.agent_key])

  useEffect(() => {
    if (!showFireConfirm) return
    setFireHandoff({ scope: 'default' })
    setFireBrainTotal(null)
    if (!selected?.agent_key) return
    let cancelled = false
    setFireBrainLoading(true)
    fetchBrainHealth(selected.agent_key)
      .then((health) => {
        if (cancelled) return
        setFireBrainTotal(health?.total_memories ?? 0)
      })
      .catch(() => {
        if (cancelled) return
        setFireBrainTotal(0)
      })
      .finally(() => {
        if (!cancelled) setFireBrainLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showFireConfirm, selected?.agent_key])

  return {
    showFireConfirm,
    setShowFireConfirm,
    firingEmployee,
    setFiringEmployee,
    fireError,
    setFireError,
    fireBrainTotal,
    fireBrainLoading,
    fireHandoff,
    setFireHandoff,
  }
}
