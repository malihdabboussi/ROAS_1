'use client'

import type { MutableRefObject } from 'react'
import type { Campaign } from '@/lib/campaigns'
import type { Conversation } from '@/lib/conversations'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  campaignToSidebarRow,
  getCampaignConversationDisplayState,
  type TeamConversationAgent,
  type TeamConversationCampaignGroup,
} from './team-conversations-sidebar.logic'
import { TeamConversationActiveSection } from './TeamConversationActiveSection'
import { TeamConversationAssignedSectionHeader } from './TeamConversationAssignedSectionHeader'
import { TeamConversationCampaignGroupSection } from './TeamConversationCampaignGroupSection'
import { TeamConversationSearchResults } from './TeamConversationSearchResults'
import { TeamConversationUnassignedSection } from './TeamConversationUnassignedSection'

type SessionActionsPosition = {
  top: number
  left: number
  minWidth: number
}

export interface TeamConversationsSidebarListContentProps {
  activeConversations?: Conversation[]
  activeConvsExpanded: boolean
  agentByKey: Map<string, TeamConversationAgent>
  agentFilter?: Set<string>
  assignedCampaignsExpanded: boolean
  assignedGroups: TeamConversationCampaignGroup[]
  campaignConversationLimitByKey: Record<string, number>
  creatingSession: boolean
  currentUserId?: string | null
  deletingSessionId: string | null
  expandedCampaignIds: Set<string>
  isSearching: boolean
  mobilePageLayout: boolean
  renameValue: string
  renamingSessionId: string | null
  resolveCampaignForGroup: (groupKey: string) => Campaign | null
  searchQuery: string
  selectedSessionId: string | null
  sessionActionsOpenId: string | null
  sessionActionsPos: SessionActionsPosition
  sessionActionsTriggerRef: MutableRefObject<HTMLElement | null>
  sessionsLoading: boolean
  sessionTitleTypewriter?: { conversationId: string; text: string } | null
  showAllOrgConversations: boolean
  teamAgents: TeamConversationAgent[]
  unassignedCampaignsExpanded: boolean
  unassignedGroups: TeamConversationCampaignGroup[]
  onAgentFilterChange?: (keys: Set<string>) => void
  onCancelRename: () => void
  onCreateConversationInGroup: (groupKey: string) => void
  onDeleteSession: (id: string) => void
  onLoadMoreConversations: (groupKey: string) => void
  onNewCampaign: () => void
  onRenameValueChange: (value: string) => void
  onRequestAssignCampaign?: (campaign: { id: string; name: string }) => void
  onSelectActiveConversation?: (sessionId: string) => void
  onSelectConversation: (id: string) => void
  onSessionActionsOpenIdChange: (id: string | null) => void
  onStartRename: (session: Conversation) => void
  onSubmitRename: () => void
  onToggleActiveConversations: () => void
  onToggleAssignedCampaigns: () => void
  onToggleCampaignGroup: (groupKey: string) => void
  onToggleCampaignMenu: (groupKey: string, target: HTMLElement) => void
  onToggleUnassignedCampaigns: () => void
}

export function TeamConversationsSidebarListContent({
  activeConversations,
  activeConvsExpanded,
  agentByKey,
  agentFilter,
  assignedCampaignsExpanded,
  assignedGroups,
  campaignConversationLimitByKey,
  creatingSession,
  currentUserId,
  deletingSessionId,
  expandedCampaignIds,
  isSearching,
  mobilePageLayout,
  onAgentFilterChange,
  onCancelRename,
  onCreateConversationInGroup,
  onDeleteSession,
  onLoadMoreConversations,
  onNewCampaign,
  onRenameValueChange,
  onRequestAssignCampaign,
  onSelectActiveConversation,
  onSelectConversation,
  onSessionActionsOpenIdChange,
  onStartRename,
  onSubmitRename,
  onToggleActiveConversations,
  onToggleAssignedCampaigns,
  onToggleCampaignGroup,
  onToggleCampaignMenu,
  onToggleUnassignedCampaigns,
  renameValue,
  renamingSessionId,
  resolveCampaignForGroup,
  searchQuery,
  selectedSessionId,
  sessionActionsOpenId,
  sessionActionsPos,
  sessionActionsTriggerRef,
  sessionsLoading,
  sessionTitleTypewriter,
  showAllOrgConversations,
  teamAgents,
  unassignedCampaignsExpanded,
  unassignedGroups,
}: TeamConversationsSidebarListContentProps) {
  if (sessionsLoading) {
    return <VibeyLoadingOrb text="Loading conversations..." state="processing" size="md" />
  }

  return (
    <div className="space-y-0.5">
      {!isSearching && activeConversations && activeConversations.length > 0 && (
        <TeamConversationActiveSection
          activeConversations={activeConversations}
          activeConvsExpanded={activeConvsExpanded}
          agentByKey={agentByKey}
          onSelectActiveConversation={onSelectActiveConversation}
          onToggleExpanded={onToggleActiveConversations}
        />
      )}
      <TeamConversationAssignedSectionHeader
        agentFilter={agentFilter}
        isExpanded={assignedCampaignsExpanded}
        mobilePageLayout={mobilePageLayout}
        teamAgents={teamAgents}
        onAgentFilterChange={onAgentFilterChange}
        onNewCampaign={onNewCampaign}
        onToggleExpanded={onToggleAssignedCampaigns}
      />
      {assignedCampaignsExpanded &&
        (searchQuery.trim() ? (
          <TeamConversationSearchResults
            agentByKey={agentByKey}
            deletingSessionId={deletingSessionId}
            groups={[...assignedGroups, ...unassignedGroups]}
            renameValue={renameValue}
            renamingSessionId={renamingSessionId}
            searchQuery={searchQuery}
            selectedSessionId={selectedSessionId}
            sessionActionsOpenId={sessionActionsOpenId}
            sessionActionsPos={sessionActionsPos}
            sessionActionsTriggerRef={sessionActionsTriggerRef}
            sessionTitleTypewriter={sessionTitleTypewriter}
            onCancelRename={onCancelRename}
            onDeleteSession={onDeleteSession}
            onRenameValueChange={onRenameValueChange}
            onSelectConversation={onSelectConversation}
            onSessionActionsOpenIdChange={onSessionActionsOpenIdChange}
            onStartRename={onStartRename}
            onSubmitRename={onSubmitRename}
          />
        ) : (
          <>
            {assignedGroups.map((group) => {
              const campaignEntity = resolveCampaignForGroup(group.key)
              const { hasMoreConversations, selectedIdx, visibleConversations } =
                getCampaignConversationDisplayState({
                  group,
                  selectedSessionId,
                  campaignConversationLimitByKey,
                })
              return (
                <TeamConversationCampaignGroupSection
                  key={group.key}
                  group={group}
                  isOpen={expandedCampaignIds.has(group.key)}
                  selectedIdx={selectedIdx}
                  visibleConversations={visibleConversations}
                  hasMoreConversations={hasMoreConversations}
                  campaignRow={campaignEntity ? campaignToSidebarRow(campaignEntity) : null}
                  creatingSession={creatingSession}
                  currentUserId={currentUserId}
                  deletingSessionId={deletingSessionId}
                  renamingSessionId={renamingSessionId}
                  renameValue={renameValue}
                  selectedSessionId={selectedSessionId}
                  sessionActionsOpenId={sessionActionsOpenId}
                  sessionActionsPos={sessionActionsPos}
                  sessionActionsTriggerRef={sessionActionsTriggerRef}
                  sessionTitleTypewriter={sessionTitleTypewriter}
                  showAllOrgConversations={showAllOrgConversations}
                  onCancelRename={onCancelRename}
                  onCreateConversationInGroup={onCreateConversationInGroup}
                  onDeleteSession={onDeleteSession}
                  onLoadMoreConversations={onLoadMoreConversations}
                  onRenameValueChange={onRenameValueChange}
                  onSelectConversation={onSelectConversation}
                  onSessionActionsOpenIdChange={onSessionActionsOpenIdChange}
                  onStartRename={onStartRename}
                  onSubmitRename={onSubmitRename}
                  onToggleCampaignGroup={onToggleCampaignGroup}
                  onToggleCampaignMenu={onToggleCampaignMenu}
                />
              )
            })}

            <TeamConversationUnassignedSection
              groups={unassignedGroups}
              isExpanded={unassignedCampaignsExpanded}
              onToggleExpanded={onToggleUnassignedCampaigns}
              onRequestAssign={onRequestAssignCampaign}
            />
          </>
        ))}
    </div>
  )
}
