'use client'

import { useMemo } from 'react'
import { AgentInfoPanel, type AgentInfoPanelProps } from '@/components/agents/AgentInfoPanel'
import {
  showsAgentAccessTab,
  type AgentInfoPanelTab,
} from '@/lib/agents/agent-info-panel-tabs'
import { backendPatch } from '@/lib/api/backend-client'
import type { AgentMenuContext, AgentTeam, MissionAgent } from '@/lib/agents'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import type { useTeam2Perms } from '../hooks/use-team2-perms'
import type { TeamAgentsViewKey, TeamManageSection } from '../lib/team-manage-nav'
import type {
  Team2ManageData,
  Team2ManageDerived,
  Team2ManageHandlers,
} from './team2-manage-content.types'
import { AgentsGrid } from './AgentsGrid'
import { Team2DetailView } from './Team2DetailView'
import { Team2ManageShell } from './nav/Team2ManageShell'
import { TeamDetailView } from './teams/TeamDetailView'
import { TeamsIndexView } from './teams/TeamsIndexView'

type Team2Perms = ReturnType<typeof useTeam2Perms>

interface Team2ManageContentProps {
  data: Team2ManageData
  derived: Team2ManageDerived
  handlers: Team2ManageHandlers
  perms: Team2Perms
  manageSection: TeamManageSection
  onSectionChange: (next: TeamManageSection) => void
  teams: AgentTeam[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string | null) => void
  onNavigateAgentsRoot: (viewKey: TeamAgentsViewKey) => void
  selectedFromUrl: MissionAgent | null
  selectedCanManage: boolean
  showOrgTeams: boolean
  infoPanelTab: AgentInfoPanelTab
  onInfoPanelTabChange: (tab: AgentInfoPanelTab) => void
  getAgentMenuContextForGrid: (agent: MissionAgent) => AgentMenuContext
  onMoveAgentToTeam: (agentKey: string, teamId: string | null) => Promise<void>
  onSelectTeamFromIndex: (teamId: string) => void
  onOpenAgent: (agentKey: string, opts?: { infoTab?: AgentInfoPanelTab }) => void
  onGridRename: (agentKey: string, name: string) => void | Promise<void>
  onGridModelChange: (
    agentKey: string,
    modelId: string,
    modelSettings: ChatModelSettings | null,
  ) => void | Promise<void>
  onOpenAgentLibrary: () => void
  onStartAgentFromScratch: () => void
  assignedCampaignIdsForSelected: string[]
}

export function Team2ManageContent({
  data,
  derived,
  handlers,
  perms,
  manageSection,
  onSectionChange,
  teams,
  selectedTeamId,
  onSelectTeam,
  onNavigateAgentsRoot,
  selectedFromUrl,
  selectedCanManage,
  showOrgTeams,
  infoPanelTab,
  onInfoPanelTabChange,
  getAgentMenuContextForGrid,
  onMoveAgentToTeam,
  onSelectTeamFromIndex,
  onOpenAgent,
  onGridRename,
  onGridModelChange,
  onOpenAgentLibrary,
  onStartAgentFromScratch,
  assignedCampaignIdsForSelected,
}: Team2ManageContentProps) {
  const agentInfoBaseProps = useMemo(
    () => ({
      selected: data.selected,
      generatingAvatarIds: data.generatingAvatarIds,
      handleGeneratePortrait: handlers.handleGeneratePortrait,
      editingName: data.editingName,
      setEditingName: data.setEditingName,
      nameValue: data.nameValue,
      setNameValue: data.setNameValue,
      handleNameSave: handlers.handleNameSave,
      handleNameClick: handlers.handleNameClick,
      statusBadgeText: derived.statusBadgeText,
      bio: derived.bio,
      blockedCount: derived.blockedCount,
      activeCount: derived.activeCount,
      todoCount: derived.todoCount,
      totalCompleted: derived.totalCompleted,
      completedThisMonth: derived.completedThisMonth,
      successRate: derived.successRate,
      avgCompletionRate: derived.avgCompletionRate,
      missionsScored: derived.missionsScored,
      lastActiveLabel: derived.lastActiveLabel,
      level: derived.level,
      campaigns: data.campaigns,
      nonGeneralCampaigns: data.nonGeneralCampaigns,
      assignedCampaigns: data.assignedCampaigns,
      campaignLoading: data.campaignLoading,
      campaignActionLoading: data.campaignActionLoading,
      campaignError: data.campaignError,
      handleAssignCampaign: handlers.handleAssignCampaign,
      handleUnassignCampaign: handlers.handleUnassignCampaign,
      hasStats: derived.hasStats,
      overallColor: derived.overallColor,
      overall: derived.overall,
      metrics: derived.metrics,
      stats: derived.stats as Record<string, number | string | undefined>,
      isSelectedRemovable: derived.isSelectedRemovable,
      isSelectedManager: derived.isSelectedManager,
      isSystemLikeAgent: derived.isSystemLikeAgent,
      setFireError: data.setFireError,
      setShowFireConfirm: data.setShowFireConfirm,
      skillsLoading: data.skillsLoading,
      agentSkills: data.agentSkills,
      agentWorkflows: data.agentWorkflows,
      skillsError: data.skillsError,
      showUpgradeModal: data.showUpgradeModal,
      setShowUpgradeModal: data.setShowUpgradeModal,
      handleAddBrain: handlers.handleAddBrain,
      hasBrain: data.hasBrain,
      brainLoading: data.brainLoading,
      brainError: data.brainError,
      selectedAgentKey: data.selectedAgentKey,
      setAgents: data.setAgents,
      cLevelCount: derived.cLevelCount,
      managerCount: derived.managerCount,
      employeeCount: derived.employeeCount,
      idleMembersCount: derived.idleMembersCount,
      activeMembersCount: derived.activeMembersCount,
      communicationTabProps: {
        selected: data.selected,
        selectedModelId: data.selectedModelId,
        modelOptions: data.modelOptions,
        communicationSaving: data.communicationSaving,
        communicationError: data.communicationError,
        modelDropdownOpen: data.modelDropdownOpen,
        setModelDropdownOpen: data.setModelDropdownOpen,
        modelDropdownRef: data.modelDropdownRef,
        modelDropdownBtnRef: data.modelDropdownBtnRef,
        modelDropdownPos: data.modelDropdownPos,
        handleCommunicationStrategyChange: handlers.handleCommunicationStrategyChange,
        handleCommunicationModelChange: handlers.handleCommunicationModelChange,
        handleVoiceChange: handlers.handleVoiceChange,
        handleCommunicationStyleChange: handlers.handleCommunicationStyleChange,
        channelsLoading: data.channelsLoading,
        channels: data.channels,
        setChannels: data.setChannels,
        channelDisconnecting: data.channelDisconnecting,
        setChannelDisconnecting: data.setChannelDisconnecting,
        slackDisconnecting: data.slackDisconnecting,
        setSlackDisconnecting: data.setSlackDisconnecting,
        setShowTelegramSetup: data.setShowTelegramSetup,
        setShowSlackSetup: data.setShowSlackSetup,
        preferredChannel: data.preferredChannel,
        setPreferredChannel: data.setPreferredChannel,
        channelSaving: data.channelSaving,
        setChannelSaving: data.setChannelSaving,
        digestEnabled: data.digestEnabled,
        setDigestEnabled: data.setDigestEnabled,
        digestSaving: data.digestSaving,
        setDigestSaving: data.setDigestSaving,
        digestTime: data.digestTime,
        setDigestTime: data.setDigestTime,
        digestDropdownOpen: data.digestDropdownOpen,
        setDigestDropdownOpen: data.setDigestDropdownOpen,
        digestDropdownBtnRef: data.digestDropdownBtnRef,
        digestDropdownPos: data.digestDropdownPos,
        userPublicSlug: data.userPublicSlug,
        onPublicPageToggle: async (agentKey: string, enabled: boolean) => {
          const res = await backendPatch<{
            ok: boolean
            public_page_enabled: boolean
            public_agent_slug?: string | null
          }>(`/api/agents/${agentKey}/public-page`, { enabled })
          if (res.public_agent_slug) data.setUserPublicSlug(res.public_agent_slug)
          data.setAgents((prev) =>
            prev.map((agent) =>
              agent.agent_key === agentKey
                ? ({ ...agent, public_page_enabled: enabled } as typeof agent)
                : agent,
            ),
          )
        },
        onPublicSlugAssign: async (slug: string) => {
          await backendPatch('/api/missions/profile/settings', { public_agent_slug: slug })
          data.setUserPublicSlug(slug)
        },
      },
    }),
    [data, derived, handlers],
  )

  const content = (() => {
    if (manageSection === 'teams' && showOrgTeams) {
      if (selectedTeamId) {
        return (
          <TeamDetailView
            teamId={selectedTeamId}
            embedded
            initialTeam={teams.find((team) => team.id === selectedTeamId) ?? null}
          />
        )
      }
      return <TeamsIndexView embedded onSelectTeam={onSelectTeamFromIndex} />
    }

    if (selectedFromUrl) {
      return (
        <Team2DetailView
          agent={selectedFromUrl}
          infoPanelTab={infoPanelTab}
          showAccessTab={showsAgentAccessTab(selectedFromUrl, derived.isSystemLikeAgent)}
          onInfoPanelTabChange={onInfoPanelTabChange}
          infoPanel={(onRequestCollapse) => (
            <AgentInfoPanel
              {...(agentInfoBaseProps as AgentInfoPanelProps)}
              selected={selectedFromUrl}
              fullScreen={false}
              fillParentWidth
              onRequestCollapse={onRequestCollapse}
              onClose={() => {}}
              managementDisabled={!selectedCanManage}
              canAllowExtraAccess={perms.canAllowExtra()}
              canSetAgentTeam={perms.canMoveAgentBetweenTeams()}
              infoPanelTab={infoPanelTab}
              onInfoPanelTabChange={onInfoPanelTabChange}
            />
          )}
        />
      )
    }

    return (
      <AgentsGrid
        agents={data.agents}
        teamFilterId={selectedTeamId}
        onOpenAgent={onOpenAgent}
        onOpenAgentChat={(agentKey) => onOpenAgent(agentKey)}
        getAgentMenuContext={getAgentMenuContextForGrid}
        onRenameAgent={onGridRename}
        onChangeAgentModel={onGridModelChange}
        onOpenAgentLibrary={onOpenAgentLibrary}
        onStartAgentFromScratch={onStartAgentFromScratch}
        selectedAgentKey={data.selectedAgentKey || null}
        assignedCampaignIdsForSelected={assignedCampaignIdsForSelected}
        hasBrainForSelected={data.hasBrain}
      />
    )
  })()

  return (
    <Team2ManageShell
      section={manageSection}
      onSectionChange={onSectionChange}
      teams={teams}
      selectedTeamId={selectedTeamId}
      onSelectTeam={onSelectTeam}
      onNavigateAgentsRoot={() => onNavigateAgentsRoot('all')}
      selectedAgent={selectedFromUrl}
      canMoveAgent={selectedFromUrl ? getAgentMenuContextForGrid(selectedFromUrl).canMoveTeam : false}
      onMoveAgentToTeam={onMoveAgentToTeam}
      showOrgTeams={showOrgTeams}
    >
      {content}
    </Team2ManageShell>
  )
}
