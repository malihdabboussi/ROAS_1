'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { useBrainScopeNavOptions } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { canTrainBrainScope } from '@/features/brain/lib/brain-train-permissions'
import { fetchMissionAgents, useTeam2Perms, type MissionAgent } from '@/lib/agents'
import { useOrgStore } from '@/lib/org'

const SCOPE_ORDER: Record<BrainScopeNavOption['scopeType'], number> = {
  user: 0,
  person: 1,
  shared: 2,
  company: 3,
  customer: 4,
  agent: 5,
  campaign: 6,
  campaign_knowledge: 7,
}

export type TrainableBrainTarget = {
  scopeId: string
  label: string
  brainId: string
  scopeType: BrainScopeNavOption['scopeType']
  isAgentBrain: boolean
  agentName?: string
  imageUrl?: string | null
}

export function useTrainableBrains() {
  const { scopeOptions, loading: scopeLoading } = useBrainScopeNavOptions()
  const perms = useTeam2Perms()
  const isOrg = useOrgStore((s) => s.isOrgContext())
  const [agentsByKey, setAgentsByKey] = useState<Map<string, MissionAgent>>(new Map())
  const [agentsLoading, setAgentsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setAgentsLoading(true)
    void fetchMissionAgents()
      .then((rows) => {
        if (cancelled) return
        setAgentsByKey(new Map(rows.map((a) => [a.agent_key, a])))
      })
      .catch(() => {
        if (!cancelled) setAgentsByKey(new Map())
      })
      .finally(() => {
        if (!cancelled) setAgentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const trainable = useMemo(() => {
    const ctx = {
      isOrg,
      isAdmin: perms.isAdmin,
      agentsByKey,
      canEditAgent: perms.canEditAgent,
    }
    const filtered = scopeOptions.filter((o) => canTrainBrainScope(o, ctx))
    const result = filtered
      .sort((a, b) => {
        const oa = SCOPE_ORDER[a.scopeType] ?? 9
        const ob = SCOPE_ORDER[b.scopeType] ?? 9
        if (oa !== ob) return oa - ob
        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
      })
      .map(
        (o): TrainableBrainTarget => ({
          scopeId: o.id,
          label: o.label,
          brainId: o.brainId!,
          scopeType: o.scopeType,
          isAgentBrain: o.scopeType === 'agent',
          agentName: o.scopeType === 'agent' ? o.label : undefined,
          imageUrl: o.imageUrl ?? null,
        }),
      )
    return result
  }, [scopeOptions, isOrg, perms.isAdmin, perms.canEditAgent, agentsByKey])

  return {
    trainable,
    loading: scopeLoading || agentsLoading,
  }
}
