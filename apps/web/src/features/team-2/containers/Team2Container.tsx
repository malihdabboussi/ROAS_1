'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  renameAgent,
  updateAgentActive,
  updateAgentCommunication,
  useAgentMenuActions,
  useTeamContainerData,
  useTeamContainerDerived,
  useTeamContainerHandlers,
  useTeams,
  type MissionAgent,
} from '@/lib/agents'
import { useAccountContextGate } from '@/lib/org'
import {
  isAgentInfoPanelTab,
  showsAgentAccessTab,
  type AgentInfoPanelTab,
} from '@/lib/agents/agent-info-panel-tabs'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { agentToSummary, MAX_VISIBLE_AGENTS_IN_HR_CONTEXT } from '../components/agents-grid-utils'
import { Team2ContainerModals } from '../components/Team2ContainerModals'
import { Team2ManageContent } from '../components/Team2ManageContent'
import { useTeam2Perms } from '../hooks/use-team2-perms'
import {
  isTeamManageSection,
  type TeamAgentsViewKey,
  type TeamManageSection,
} from '../lib/team-manage-nav'
import {
  useTeamFocusStore,
  type TeamAgentsPageContext,
} from '../store/use-team-focus-store'
import { HumanDMContainer } from './HumanDMContainer'
import { TeamHrSideChatLayout } from './TeamHrSideChatLayout'

export function Team2Container() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const data = useTeamContainerData()
  const derived = useTeamContainerDerived(data.selected, data.agents, data.missions)
  const handlers = useTeamContainerHandlers(data)
  const perms = useTeam2Perms()
  const agentMenu = useAgentMenuActions()
  const { isAccountContextReady, isPersonalAccountContext, isOrgAccountContext } =
    useAccountContextGate()
  const { teams } = useTeams(isOrgAccountContext)

  const agentKeyFromUrl = searchParams.get('agent')
  const dmUserIdFromUrl = searchParams.get('dm')
  const tabFromUrl = searchParams.get('tab')
  const panelFromUrl = searchParams.get('panel')
  const sectionFromUrl = searchParams.get('section')
  const teamIdFromUrl = searchParams.get('team')

  const manageSection: TeamManageSection = isTeamManageSection(sectionFromUrl)
    ? sectionFromUrl
    : 'agents'
  const selectedTeamId = teamIdFromUrl?.trim() ? teamIdFromUrl.trim() : null
  const showOrgTeams = isAccountContextReady && isOrgAccountContext

  const replaceSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const setManageSection = useCallback(
    (next: TeamManageSection) => {
      replaceSearchParams((params) => {
        if (next === 'agents') params.delete('section')
        else params.set('section', next)
        if (next === 'teams') {
          params.delete('agent')
          params.delete('panel')
          params.delete('session')
          params.delete('tab')
        }
      })
    },
    [replaceSearchParams],
  )

  const setSelectedTeamId = useCallback(
    (teamId: string | null) => {
      replaceSearchParams((params) => {
        if (teamId) params.set('team', teamId)
        else params.delete('team')
      })
    },
    [replaceSearchParams],
  )

  const setAgentsView = useCallback(
    (viewKey: TeamAgentsViewKey) => {
      replaceSearchParams((params) => {
        params.delete('section')
        if (viewKey === 'all') {
          params.delete('agent')
          params.delete('panel')
          params.delete('session')
          params.delete('tab')
        } else {
          params.set('agent', viewKey)
          params.delete('tab')
        }
      })
    },
    [replaceSearchParams],
  )

  const handleMoveAgentToTeam = useCallback(
    async (agentKey: string, teamId: string | null) => {
      const ctx = agentMenu.getAgentMenuContext(
        data.agents.find((agent) => agent.agent_key === agentKey) ??
          ({ agent_key: agentKey } as MissionAgent),
      )
      await ctx.onSelectTeam(agentKey, teamId)
      await data.loadAgents()
      toast.success(teamId ? 'Agent moved to team' : 'Agent removed from team')
    },
    [agentMenu, data],
  )

  const [infoPanelTab, setInfoPanelTab] = useState<AgentInfoPanelTab>(
    isAgentInfoPanelTab(panelFromUrl) ? panelFromUrl : 'info',
  )

  const selectedFromUrl = useMemo(
    () =>
      agentKeyFromUrl ? (data.agents.find((a) => a.agent_key === agentKeyFromUrl) ?? null) : null,
    [data.agents, agentKeyFromUrl],
  )

  const hrAgent = useMemo(
    () => data.agents.find((a) => a.agent_key === 'hr') ?? null,
    [data.agents],
  )
  const emptyTeamLookup = useMemo(
    () => new Map<string, { name: string; color: string; icon: string }>(),
    [],
  )

  const setFocusedAgent = useTeamFocusStore((s) => s.setFocusedAgent)
  const setAgentsContext = useTeamFocusStore((s) => s.setAgentsContext)
  useEffect(() => {
    setFocusedAgent(dmUserIdFromUrl ? null : selectedFromUrl, 'agents')
    return () => setFocusedAgent(null, 'agents')
  }, [selectedFromUrl, dmUserIdFromUrl, setFocusedAgent])

  useEffect(() => {
    if (!agentKeyFromUrl) return
    if (!tabFromUrl || tabFromUrl === 'chat') return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tab')
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [agentKeyFromUrl, tabFromUrl, pathname, router, searchParams])

  useEffect(() => {
    if (dmUserIdFromUrl && isPersonalAccountContext) router.replace('/team')
  }, [dmUserIdFromUrl, isPersonalAccountContext, router])

  useEffect(() => {
    if (isAgentInfoPanelTab(panelFromUrl)) setInfoPanelTab(panelFromUrl)
  }, [panelFromUrl])

  const fireIntentRef = useRef<string | null>(null)
  useEffect(() => {
    if (searchParams.get('fire') !== '1' || !selectedFromUrl) {
      if (searchParams.get('fire') !== '1') fireIntentRef.current = null
      return
    }
    const intentKey = `${selectedFromUrl.agent_key}:fire`
    if (fireIntentRef.current === intentKey) return
    fireIntentRef.current = intentKey
    data.setSelectedId(selectedFromUrl.id)
    data.setShowFireConfirm(true)
    replaceSearchParams((params) => {
      params.delete('fire')
    })
  }, [
    searchParams,
    selectedFromUrl,
    replaceSearchParams,
    data.setSelectedId,
    data.setShowFireConfirm,
  ])

  const connectIntentRef = useRef<string | null>(null)
  useEffect(() => {
    const connect = searchParams.get('connect')
    if (!connect || !selectedFromUrl) {
      if (!connect) connectIntentRef.current = null
      return
    }
    const intentKey = `${selectedFromUrl.agent_key}:${connect}`
    if (connectIntentRef.current === intentKey) return
    connectIntentRef.current = intentKey
    data.setSelectedId(selectedFromUrl.id)
    if (connect === 'telegram') data.setShowTelegramSetup(true)
    else if (connect === 'slack') data.setShowSlackSetup(true)
    else return
    replaceSearchParams((params) => {
      params.delete('connect')
    })
  }, [
    searchParams,
    selectedFromUrl,
    replaceSearchParams,
    data.setSelectedId,
    data.setShowSlackSetup,
    data.setShowTelegramSetup,
  ])

  const selectedCanManage = selectedFromUrl
    ? perms.canEditAgent(selectedFromUrl) || perms.canManageSystemPreferences(selectedFromUrl)
    : true

  const detailPanel = useMemo<TeamAgentsPageContext['panel']>(() => {
    if (!selectedFromUrl) return 'agent-list'
    if (infoPanelTab === 'skills') return 'agent-skills'
    if (infoPanelTab === 'communication') return 'agent-communication'
    if (infoPanelTab === 'access') return 'agent-access'
    return 'agent-info'
  }, [infoPanelTab, selectedFromUrl])

  const agentsContext = useMemo<TeamAgentsPageContext>(() => {
    const selectedSummary = selectedFromUrl
      ? agentToSummary(selectedFromUrl, data.modelOptions, emptyTeamLookup, selectedCanManage)
      : null
    const selectedChannels = selectedFromUrl
      ? data.channels.filter((channel) => channel.agent_key === selectedFromUrl.agent_key)
      : []
    return {
      panel: detailPanel,
      view: selectedFromUrl ? 'detail' : 'grid',
      searchQuery: '',
      statusFilters: [],
      modelFilters: [],
      sort: 'none',
      groupBy: 'none',
      totalAgentCount: data.agents.length,
      visibleAgentCount: data.agents.length,
      visibleAgents: data.agents
        .slice(0, MAX_VISIBLE_AGENTS_IN_HR_CONTEXT)
        .map((agent) =>
          agentToSummary(
            agent,
            data.modelOptions,
            emptyTeamLookup,
            perms.canEditAgent(agent) || perms.canManageSystemPreferences(agent),
          ),
        ),
      visibleAgentsTruncated: data.agents.length > MAX_VISIBLE_AGENTS_IN_HR_CONTEXT,
      visibleGroups: [],
      selectedAgentKey: selectedFromUrl?.agent_key ?? null,
      selectedAgent:
        selectedFromUrl && selectedSummary
          ? {
              ...selectedSummary,
              bio: derived.bio ?? null,
              hasBrain: data.hasBrain,
              activeMissionCount: derived.activeCount,
              blockedMissionCount: derived.blockedCount,
              todoMissionCount: derived.todoCount,
              completedMissionCount: derived.totalCompleted,
              completedThisMonth: derived.completedThisMonth,
              successRate: derived.successRate,
              averageCompletionRate: derived.avgCompletionRate,
              overallScore: derived.hasStats ? derived.overall : null,
              missionsScored: derived.missionsScored,
              lastActiveLabel: derived.lastActiveLabel,
              assignedCampaignNames: data.assignedCampaigns.map((campaign) => campaign.name),
              skillNames: data.agentSkills.map((skill) => skill.name),
              workflowNames: data.agentWorkflows.map((workflow) => workflow.name),
              channelNames: selectedChannels.map(
                (channel) =>
                  `${channel.channel_type}${channel.is_active ? '' : ' inactive'}${
                    channel.is_public ? ' public' : ''
                  }`,
              ),
              skillsLoading: data.skillsLoading,
              skillsError: data.skillsError,
              managementDisabled: !selectedCanManage,
              showAccessTab: showsAgentAccessTab(selectedFromUrl, derived.isSystemLikeAgent),
            }
          : null,
      modalState: {
        readyEmployeesOpen: data.showReadyEmployees,
        fireConfirmOpen: data.showFireConfirm,
        telegramSetupOpen: data.showTelegramSetup,
        slackSetupOpen: data.showSlackSetup,
        upgradeOpen: data.showUpgradeModal,
      },
    }
  }, [
    data.agentSkills,
    data.agentWorkflows,
    data.agents,
    data.assignedCampaigns,
    data.channels,
    data.hasBrain,
    data.modelOptions,
    data.showFireConfirm,
    data.showReadyEmployees,
    data.showSlackSetup,
    data.showTelegramSetup,
    data.showUpgradeModal,
    data.skillsError,
    data.skillsLoading,
    derived.activeCount,
    derived.avgCompletionRate,
    derived.bio,
    derived.blockedCount,
    derived.completedThisMonth,
    derived.hasStats,
    derived.isSystemLikeAgent,
    derived.lastActiveLabel,
    derived.missionsScored,
    derived.overall,
    derived.successRate,
    derived.todoCount,
    derived.totalCompleted,
    emptyTeamLookup,
    detailPanel,
    perms,
    selectedCanManage,
    selectedFromUrl,
  ])

  useEffect(() => {
    if (dmUserIdFromUrl) {
      setAgentsContext(null)
      return
    }
    if (selectedFromUrl) setAgentsContext(agentsContext)
  }, [agentsContext, dmUserIdFromUrl, selectedFromUrl, setAgentsContext])

  type OpenAgentOptions = { infoTab?: AgentInfoPanelTab }

  const openAgentBrainInNewTab = useCallback((agentKey: string) => {
    const scope = `agent:${agentKey}`
    openInNewTab(`/brain?scope=${encodeURIComponent(scope)}`)
  }, [])

  const openAgent = useCallback(
    (agentKey: string, opts?: OpenAgentOptions) => {
      const agent = data.agents.find((a) => a.agent_key === agentKey)
      if (agent) data.setSelectedId(agent.id)
      const infoTab = opts?.infoTab
      if (infoTab) {
        setInfoPanelTab(infoTab)
        const params = new URLSearchParams(searchParams.toString())
        params.set('agent', agentKey)
        params.delete('tab')
        params.set('panel', infoTab)
        params.delete('session')
        const q = params.toString()
        router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
        return
      }
      const params = new URLSearchParams(searchParams.toString())
      params.set('agent', agentKey)
      params.delete('tab')
      params.delete('panel')
      params.delete('session')
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [data, router, pathname, searchParams],
  )

  const handleInfoPanelTabChange = useCallback(
    (tab: AgentInfoPanelTab) => {
      setInfoPanelTab(tab)
      if (!agentKeyFromUrl) return
      replaceSearchParams((params) => {
        params.set('panel', tab)
      })
    },
    [agentKeyFromUrl, replaceSearchParams],
  )

  const assignedCampaignIdsForSelected = useMemo(
    () => data.assignedCampaigns.map((c) => c.id),
    [data.assignedCampaigns],
  )

  const goBackToGrid = useCallback(() => {
    setInfoPanelTab('info')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('agent')
    params.delete('tab')
    params.delete('session')
    params.delete('dm')
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  const openAgentLibrary = useCallback(() => {
    data.hireFilterRef.current = null
    data.setShowReadyEmployees(true)
  }, [data])

  const startAgentFromScratch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('team-hr-chat:start-new'))
  }, [])

  const handleGridRename = useCallback(
    (agentKey: string, name: string) => {
      return renameAgent(agentKey, name).then(() => void data.loadAgents())
    },
    [data],
  )

  const handleGridModelChange = useCallback(
    async (agentKey: string, modelId: string, modelSettings: ChatModelSettings | null) => {
      const updated = await updateAgentCommunication(agentKey, {
        model_id: modelId,
        model_settings: modelSettings,
      })
      data.setAgents((prev) =>
        prev.map((agent) =>
          agent.agent_key === agentKey ? { ...agent, config: updated.config } : agent,
        ),
      )
    },
    [data],
  )

  const handleGridDeactivate = useCallback(
    (agent: MissionAgent) => {
      if (agent.is_active === false) return
      void updateAgentActive(agent.agent_key, false).then(() => void data.loadAgents())
    },
    [data],
  )

  const handleGridFire = useCallback(
    (agent: MissionAgent) => {
      data.setSelectedId(agent.id)
      data.setShowFireConfirm(true)
    },
    [data],
  )

  const getAgentMenuContextForGrid = useCallback(
    (agent: MissionAgent) => {
      const ctx = agentMenu.getAgentMenuContext(agent)
      return {
        ...ctx,
        menuActions: {
          ...ctx.menuActions,
          onOpenChat: () => openAgent(agent.agent_key),
          onOpenEdit: () => openAgent(agent.agent_key),
          onOpenSkills: () => {
            router.push(`/team/skills?agent=${encodeURIComponent(agent.agent_key)}`)
          },
          onOpenComms: () => openAgent(agent.agent_key, { infoTab: 'communication' }),
          onOpenAccess: () => openAgent(agent.agent_key, { infoTab: 'access' }),
          onOpenBrain: () => openAgentBrainInNewTab(agent.agent_key),
          onDeactivate: () => handleGridDeactivate(agent),
          onFire: () => handleGridFire(agent),
          onAssignmentsChanged: () => handlers.refreshAssignmentsForAgent(agent.agent_key),
        },
        onSelectTeam: async (agentKey: string, teamId: string | null) => {
          await ctx.onSelectTeam(agentKey, teamId)
          void data.loadAgents()
        },
      }
    },
    [
      agentMenu,
      openAgent,
      openAgentBrainInNewTab,
      router,
      handleGridDeactivate,
      handleGridFire,
      handlers,
      data,
    ],
  )

  const handleSelectTeamFromIndex = useCallback(
    (teamId: string) => {
      replaceSearchParams((params) => {
        params.set('section', 'teams')
        params.set('team', teamId)
        params.delete('agent')
        params.delete('panel')
        params.delete('session')
        params.delete('tab')
      })
    },
    [replaceSearchParams],
  )

  if (dmUserIdFromUrl && (!isAccountContextReady || isPersonalAccountContext)) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading…" state="processing" size="lg" />
      </div>
    )
  }

  if (data.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading…" state="processing" size="lg" />
      </div>
    )
  }

  if (data.agents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="surface-card border-subtle rounded-spacing-3 p-spacing-8 max-w-sm border text-center">
          <p className="text-foreground body-1 font-semibold">No team members yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3">
      <TeamHrSideChatLayout
        className="min-h-0 flex-1"
        hrAgent={hrAgent}
        hrAgentLoading={data.loading}
        hideHrChat={Boolean(dmUserIdFromUrl)}
        collapseHrChatForAgentKey={selectedFromUrl?.agent_key ?? null}
      >
        {dmUserIdFromUrl ? (
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border">
            <HumanDMContainer targetUserId={dmUserIdFromUrl} onBack={goBackToGrid} />
          </div>
        ) : (
          <Team2ManageContent
            data={data}
            derived={derived}
            handlers={handlers}
            perms={perms}
            manageSection={manageSection}
            onSectionChange={setManageSection}
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={setSelectedTeamId}
            onNavigateAgentsRoot={setAgentsView}
            selectedFromUrl={selectedFromUrl}
            selectedCanManage={selectedCanManage}
            showOrgTeams={showOrgTeams}
            infoPanelTab={infoPanelTab}
            onInfoPanelTabChange={handleInfoPanelTabChange}
            getAgentMenuContextForGrid={getAgentMenuContextForGrid}
            onMoveAgentToTeam={handleMoveAgentToTeam}
            onSelectTeamFromIndex={handleSelectTeamFromIndex}
            onOpenAgent={openAgent}
            onGridRename={handleGridRename}
            onGridModelChange={handleGridModelChange}
            onOpenAgentLibrary={openAgentLibrary}
            onStartAgentFromScratch={startAgentFromScratch}
            assignedCampaignIdsForSelected={assignedCampaignIdsForSelected}
          />
        )}
      </TeamHrSideChatLayout>

      <Team2ContainerModals
        data={data}
        derived={derived}
        handlers={handlers}
        selectedFromUrl={selectedFromUrl}
      />
    </div>
  )
}
