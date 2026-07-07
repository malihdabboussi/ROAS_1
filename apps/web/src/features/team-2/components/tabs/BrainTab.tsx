'use client'

import { useEffect, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { CortexMaxBrainView } from '@/features/brain/components/CortexMaxBrainView'
import {
  fetchBeliefPatterns,
  fetchNarrativePages,
  fetchPerspectives,
} from '@/features/brain/services/brain.service'
import type { BeliefPattern, NarrativePage, Perspective } from '@/features/brain/types'
import { billingApi } from '@/features/settings/services/billing-api'

interface BrainTabProps {
  agentKey: string
}

export function BrainTab({ agentKey }: BrainTabProps) {
  const [brainId, setBrainId] = useState<string | null>(null)
  const [cortexMax, setCortexMax] = useState(false)
  const [pages, setPages] = useState<NarrativePage[]>([])
  const [beliefs, setBeliefs] = useState<BeliefPattern[]>([])
  const [perspectives, setPerspectives] = useState<Perspective[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    billingApi
      .getAgentBrainStatus(agentKey)
      .then((r) => {
        if (!cancelled) setBrainId(r.brainId)
      })
      .catch(() => {
        if (!cancelled) setBrainId(null)
      })
    return () => {
      cancelled = true
    }
  }, [agentKey])

  useEffect(() => {
    if (!brainId) {
      setPages([])
      setBeliefs([])
      setPerspectives([])
      setCortexMax(false)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchNarrativePages(brainId),
      // Cognition is brain-scoped now — agent brains can also have beliefs and
      // perspectives once the underlying skills run on them. Default to empty
      // arrays on error so the UI never blocks on the cognition fetch.
      fetchBeliefPatterns(brainId).catch(() => [] as BeliefPattern[]),
      fetchPerspectives(brainId).catch(() => [] as Perspective[]),
    ])
      .then(([res, beliefRows, perspectiveRows]) => {
        if (cancelled) return
        if (!res.success) {
          setCortexMax(false)
          setPages([])
          setBeliefs([])
          setPerspectives([])
          return
        }
        setCortexMax(res.cortex_max)
        setPages(res.pages ?? [])
        setBeliefs(beliefRows)
        setPerspectives(perspectiveRows)
      })
      .catch(() => {
        if (cancelled) return
        setCortexMax(false)
        setPages([])
        setBeliefs([])
        setPerspectives([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [brainId])

  if (!brainId) {
    return (
      <div className="body-3 text-muted-foreground flex min-h-48 items-center justify-center px-4 text-center">
        This agent does not have a brain yet.
      </div>
    )
  }

  if (!cortexMax) {
    return (
      <div className="body-3 text-muted-foreground flex min-h-48 items-center justify-center px-4 text-center">
        Cortex Max is not enabled for this brain. Enable it from Brain settings.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-48 flex-1 items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" text="Loading Cortex Max…" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CortexMaxBrainView
        pages={pages}
        beliefs={beliefs}
        perspectives={perspectives}
        layout="team2"
      />
    </div>
  )
}
