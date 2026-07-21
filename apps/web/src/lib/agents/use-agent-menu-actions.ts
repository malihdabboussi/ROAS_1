'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { billingApi } from '@/lib/billing/billing-api'
import {
  BRAIN_AGENT_ACTIVATED_EVENT,
  dispatchBrainSetupAgentModal,
  type BrainAgentActivatedDetail,
} from '@/lib/brain/brain-agent-modal-events'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { campaignListCacheKey, fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { useOrgStore } from '@/lib/org'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { showsAgentAccessTab, type AgentInfoPanelTab } from './agent-info-panel-tabs'
import {
  type AgentMenuActions,
  type AgentMenuContext,
  type AgentTeamOption,
} from './agent-menu-context'
import { SYSTEM_LIKE_AGENT_KEYS } from './agent-team-display'
import { setAgentTeam } from './agent-teams-api'
import { renameAgent, updateAgentActive, type MissionAgent } from './mission-agents-api'
import { useTeam2Perms } from './use-agent-team-permissions'
import { useTeams } from './use-agent-teams'
import { useAgentUserState } from './use-agent-user-state'
import { cachedAgents } from './use-mission-agents'

export type OpenAgentOptions = { infoTab?: AgentInfoPanelTab; fire?: boolean }

function isGeneralCampaign(c: Campaign): boolean {
  const name = (c.name ?? '').trim().toLowerCase()
  return name === 'general' || c.config?.is_general === true
}

const brainStatusByKey = new Map<string, boolean>()
const brainStatusRequested = new Set<string>()
const brainStatusPendingBatch = new Set<string>()
const brainStatusListeners = new Set<() => void>()
let brainStatusFlushTimer: ReturnType<typeof setTimeout> | null = null

function notifyBrainStatusListeners() {
  for (const listener of brainStatusListeners) listener()
}

function setKnownBrainStatus(agentKey: string, hasBrain: boolean) {
  brainStatusRequested.add(agentKey)
  brainStatusByKey.set(agentKey, hasBrain)
  notifyBrainStatusListeners()
}

function requestBrainStatus(agentKey: string) {
  if (brainStatusRequested.has(agentKey)) return
  brainStatusRequested.add(agentKey)
  brainStatusPendingBatch.add(agentKey)
  if (brainStatusFlushTimer) return
  brainStatusFlushTimer = setTimeout(() => {
    brainStatusFlushTimer = null
    const batch = [...brainStatusPendingBatch]
    brainStatusPendingBatch.clear()
    if (batch.length === 0) return
    billingApi
      .getAgentBrainStatusBatch(batch)
      .then((statuses) => {
        const returned = new Set<string>()
        for (const status of statuses) {
          returned.add(status.agentId)
          brainStatusByKey.set(status.agentId, Boolean(status.brainId))
        }
        for (const key of batch) {
          if (!returned.has(key)) brainStatusByKey.set(key, false)
        }
        notifyBrainStatusListeners()
      })
      .catch(() => {
        for (const key of batch) brainStatusRequested.delete(key)
      })
  }, 0)
}

export function useAgentMenuActions() {
  const router = useRouter()
  const perms = useTeam2Perms()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const { teams } = useTeams()
  const { favoriteIds, toggleFavorite } = useAgentUserState()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [, setBrainStatusVersion] = useState(0)

  useEffect(() => {
    const listener = () => setBrainStatusVersion((v) => v + 1)
    brainStatusListeners.add(listener)
    return () => {
      brainStatusListeners.delete(listener)
    }
  }, [])

  useEffect(() => {
    const onActivated = (e: Event) => {
      const key = (e as CustomEvent<BrainAgentActivatedDetail>).detail?.agentKey
      if (!key) return
      setKnownBrainStatus(key, true)
    }
    window.addEventListener(BRAIN_AGENT_ACTIVATED_EVENT, onActivated)
    return () => window.removeEventListener(BRAIN_AGENT_ACTIVATED_EVENT, onActivated)
  }, [])

  useEffect(() => {
    let cancelled = false
    cachedFetch(campaignListCacheKey(activeOrgId), () => fetchCampaigns(), { ttlMs: 60_000 })
      .then((rows) => {
        if (!cancelled) setCampaigns(rows)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  const nonGeneralCampaigns = useMemo(
    () => campaigns.filter((c) => !isGeneralCampaign(c)),
    [campaigns],
  )

  const teamOptions: AgentTeamOption[] = useMemo(
    () =>
      teams
        .filter((team) => team.team_kind === 'agent' || team.team_kind === 'mixed')
        .map((team) => ({ id: team.id, name: team.name })),
    [teams],
  )

  const openAgentBrainInNewTab = useCallback((agentKey: string) => {
    const scope = `agent:${agentKey}`
    openInNewTab(`/brain?scope=${encodeURIComponent(scope)}`)
  }, [])

  const openAgent = useCallback(
    (agentKey: string, opts?: OpenAgentOptions) => {
      const params = new URLSearchParams()
      params.set('agent', agentKey)
      if (opts?.infoTab) {
        params.set('panel', opts.infoTab)
      }
      if (opts?.fire) {
        params.set('fire', '1')
      }
      router.push(`/team?${params.toString()}`)
    },
    [router],
  )

  const selectTeamForAgent = useCallback(async (agentKey: string, teamId: string | null) => {
    await setAgentTeam(agentKey, teamId)
    await cachedAgents.reload()
  }, [])

  const getMenuActions = useCallback(
    (agent: MissionAgent): AgentMenuActions => ({
      onCopyId: () => {
        void navigator.clipboard.writeText(agent.id).then(() => {
          toast.success('ID copied')
        })
      },
      onOpenInNewTab: () => {
        openInNewTab(`/team?agent=${encodeURIComponent(agent.agent_key)}`)
      },
      onOpenChat: () => openAgent(agent.agent_key),
      onOpenEdit: () => openAgent(agent.agent_key),
      onOpenSkills: () => {
        router.push(`/team/skills?agent=${encodeURIComponent(agent.agent_key)}`)
      },
      onOpenComms: () => openAgent(agent.agent_key, { infoTab: 'communication' }),
      onOpenAccess: () => openAgent(agent.agent_key, { infoTab: 'access' }),
      onOpenBrain: () => openAgentBrainInNewTab(agent.agent_key),
      onSetupBrain: () =>
        dispatchBrainSetupAgentModal({
          agentKey: agent.agent_key,
          agentName: agent.name,
        }),
      onDeactivate: () => {
        if (agent.is_active === false) return
        void updateAgentActive(agent.agent_key, false).then(() => void cachedAgents.reload())
      },
      onFire: () => openAgent(agent.agent_key, { fire: true }),
      onAssignmentsChanged: () => void cachedAgents.reload(),
    }),
    [openAgent, openAgentBrainInNewTab, router],
  )

  const getAgentMenuContext = useCallback(
    (agent: MissionAgent): AgentMenuContext => {
      requestBrainStatus(agent.agent_key)
      const isSystemLike = SYSTEM_LIKE_AGENT_KEYS.has(agent.agent_key)
      const canFavorite = true
      return {
        menuActions: getMenuActions(agent),
        nonGeneralCampaigns,
        teams: teamOptions,
        onSelectTeam: (agentKey, teamId) => selectTeamForAgent(agentKey, teamId),
        isFavorite: favoriteIds.has(agent.id),
        onToggleFavorite: () => void toggleFavorite(agent),
        canFavorite,
        showAccess: showsAgentAccessTab(agent, isSystemLike),
        hasBrain: brainStatusByKey.get(agent.agent_key) ?? false,
        fireLabel: agent.level === 'manager' ? 'Remove manager' : 'Fire employee',
        isSystemLikeAgent: isSystemLike,
        canRename: perms.canEditAgent(agent),
        canDeactivate: perms.canEditAgent(agent),
        canMoveTeam: !perms.isPersonal && perms.canMoveAgentBetweenTeams() && !isSystemLike,
        canFireAgent: perms.canFireAgent(),
        canManageCampaigns: perms.canEditAgent(agent),
      }
    },
    [
      favoriteIds,
      getMenuActions,
      nonGeneralCampaigns,
      perms,
      selectTeamForAgent,
      teamOptions,
      toggleFavorite,
    ],
  )

  const handleRename = useCallback((agentKey: string, name: string) => {
    return renameAgent(agentKey, name).then(() => void cachedAgents.reload())
  }, [])

  return {
    openAgent,
    getMenuActions,
    getAgentMenuContext,
    handleRename,
    favoriteIds,
    nonGeneralCampaigns,
    teamOptions,
  }
}
