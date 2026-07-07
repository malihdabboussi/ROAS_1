'use client'

import { useEffect, useState } from 'react'
import { billingApi } from '@/lib/billing/billing-api'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  fetchAgentSkills,
  fetchAgentWorkflows,
  type MissionAgentWorkflow,
} from './mission-agents-api'
import type { MissionAgentSkill } from './agent-skill-types'

export function useTeamContainerBrainSkillsData(selectedAgentKey: string) {
  const [hasBrain, setHasBrain] = useState(false)
  const [brainLoading, setBrainLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [brainError, setBrainError] = useState<string | null>(null)
  const [agentSkills, setAgentSkills] = useState<MissionAgentSkill[]>([])
  const [agentWorkflows, setAgentWorkflows] = useState<MissionAgentWorkflow[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillsError, setSkillsError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedAgentKey) {
      setHasBrain(false)
      return
    }
    setBrainLoading(true)
    setBrainError(null)
    billingApi
      .getAgentBrainStatus(selectedAgentKey)
      .then((r) => setHasBrain(r.hasBrain))
      .catch(() => setHasBrain(false))
      .finally(() => setBrainLoading(false))
  }, [selectedAgentKey])

  useEffect(() => {
    if (!selectedAgentKey) {
      setAgentSkills([])
      setSkillsError(null)
      return
    }
    setSkillsLoading(true)
    setSkillsError(null)
    Promise.all([
      cachedFetch(`agent-skills:${selectedAgentKey}`, () => fetchAgentSkills(selectedAgentKey), {
        ttlMs: 300_000,
      }),
      cachedFetch(
        `agent-workflows:${selectedAgentKey}`,
        () => fetchAgentWorkflows(selectedAgentKey),
        { ttlMs: 300_000 },
      ),
    ])
      .then(([skills, workflows]) => {
        setAgentSkills(skills)
        setAgentWorkflows(workflows)
      })
      .catch((err) => setSkillsError(err instanceof Error ? err.message : 'Failed to load skills'))
      .finally(() => setSkillsLoading(false))
  }, [selectedAgentKey])

  return {
    hasBrain,
    setHasBrain,
    brainLoading,
    showUpgradeModal,
    setShowUpgradeModal,
    checkoutLoading,
    setCheckoutLoading,
    brainError,
    setBrainError,
    agentSkills,
    agentWorkflows,
    skillsLoading,
    skillsError,
  }
}
