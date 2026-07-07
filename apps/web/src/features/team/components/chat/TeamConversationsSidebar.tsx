'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Campaign } from '@/lib/campaigns'
import type { Conversation } from '@/lib/conversations'
import { TeamConversationsSidebarCollapsedRail } from './TeamConversationsSidebarCollapsedRail'
import { TeamConversationsSidebarHeader } from './TeamConversationsSidebarHeader'
import { TeamConversationsSidebarListContent } from './TeamConversationsSidebarListContent'
import { TeamConversationsSidebarOverlays } from './TeamConversationsSidebarOverlays'
import { useTeamConversationsSidebarController } from './use-team-conversations-sidebar-controller'
import { useTeamConversationsSidebarFrame } from './use-team-conversations-sidebar-frame'

const SIDEBAR_EXPANDED_KEY = 'team-conversations-sidebar-expanded'

const SLIDE_EASE = [0.32, 0.72, 0, 1] as const
const SLIDE_DURATION = 0.24

export function readConversationsSidebarExpandedDefault(): boolean {
  if (typeof window === 'undefined') return true
  const v = window.localStorage.getItem(SIDEBAR_EXPANDED_KEY)
  if (v === '0') return false
  if (v === '1') return true
  return window.matchMedia('(min-width: 768px)').matches
}

export function persistConversationsSidebarExpanded(expanded: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, expanded ? '1' : '0')
}

export interface TeamConversationsSidebarProps {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  sessions: Conversation[]
  selectedSessionId: string | null
  sessionsLoading: boolean
  creatingSession: boolean
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  renamingSessionId: string | null
  renameValue: string
  onRenameValueChange: (v: string) => void
  onSubmitRename: () => void
  onCancelRename: () => void
  onStartRename: (session: Conversation) => void
  deletingSessionId: string | null
  sessionActionsOpenId: string | null
  onSessionActionsOpenIdChange: (id: string | null) => void
  onDeleteSession: (id: string) => void
  campaigns: Campaign[]
  assignedCampaigns?: Campaign[]
  allCampaigns: Campaign[]
  generalCampaignId?: string
  onCampaignsRefresh?: () => void | Promise<void>
  agentName?: string
  agentKey?: string
  onCampaignHeaderClick?: (campaignId: string) => void
  onCampaignExpand?: (campaignKey: string) => void
  onAssignAgentToCampaign?: (campaignId: string) => Promise<void>
  /** Live typewriter text for a session title (e.g. AI-generated rename in progress). */
  sessionTitleTypewriter?: { conversationId: string; text: string } | null
  showAllOrgConversations?: boolean
  onShowAllOrgConversationsChange?: (show: boolean) => void
  currentUserId?: string | null
  teamAgents?: { agent_key: string; name: string; image_url?: string | null }[]
  agentFilter?: Set<string>
  onAgentFilterChange?: (keys: Set<string>) => void
  /** All-agent conversations used during search so results span every agent. */
  searchAllSessions?: Conversation[]
  /** Fires when search query changes — parent fetches all-agent sessions lazily. */
  onSearchQueryChange?: (query: string) => void
  onNewConversationInCampaign?: (campaignId: string) => void
  /** Cross-agent active conversations shown at top of sidebar for quick access. */
  activeConversations?: Conversation[]
  onSelectActiveConversation?: (sessionId: string) => void
  /** Full-width conversations page (mobile): always expanded list, no narrow rail; Mine/All + New campaign in top bar. */
  mobilePageLayout?: boolean
  /** Mobile: top-left control leaves conversations and shows the team roster (`/team` card view). */
  onMobileGoToTeamRoster?: () => void
}

export function TeamConversationsSidebar({
  expanded,
  onExpandedChange,
  sessions,
  selectedSessionId,
  sessionsLoading,
  creatingSession,
  onSelectConversation,
  onNewConversation,
  renamingSessionId,
  renameValue,
  onRenameValueChange,
  onSubmitRename,
  onCancelRename,
  onStartRename,
  deletingSessionId,
  sessionActionsOpenId,
  onSessionActionsOpenIdChange,
  onDeleteSession,
  campaigns,
  assignedCampaigns = [],
  allCampaigns,
  generalCampaignId,
  onCampaignsRefresh,
  agentName,
  agentKey,
  onCampaignHeaderClick,
  onCampaignExpand,
  onAssignAgentToCampaign,
  sessionTitleTypewriter = null,
  showAllOrgConversations = true,
  onShowAllOrgConversationsChange,
  currentUserId,
  teamAgents = [],
  agentFilter,
  onAgentFilterChange,
  searchAllSessions,
  onSearchQueryChange,
  onNewConversationInCampaign,
  activeConversations,
  onSelectActiveConversation,
  mobilePageLayout = false,
  onMobileGoToTeamRoster,
}: TeamConversationsSidebarProps) {
  const frame = useTeamConversationsSidebarFrame({ expanded, mobilePageLayout })
  const sidebar = useTeamConversationsSidebarController({
    agentKey,
    allCampaigns,
    assignedCampaigns,
    campaigns,
    currentUserId,
    generalCampaignId,
    mobilePageLayout,
    onAssignAgentToCampaign,
    onCampaignExpand,
    onCampaignHeaderClick,
    onCampaignsRefresh,
    onNewConversationInCampaign,
    onSearchQueryChange,
    onSessionActionsOpenIdChange,
    searchAllSessions,
    selectedSessionId,
    sessionActionsOpenId,
    sessions,
    showAllOrgConversations,
    teamAgents,
  })
  const showExpandedUi = mobilePageLayout || expanded

  return (
    <motion.div
      className={
        mobilePageLayout ? 'h-full min-h-0 w-full min-w-0 flex-1' : 'h-full min-h-0 shrink-0'
      }
      initial={false}
      animate={mobilePageLayout ? { width: '100%' } : { width: expanded ? 276 : 80 }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
    >
      <div
        ref={frame.cardGlassRef}
        className="card-glass flex h-full min-h-0 flex-col overflow-hidden"
        style={
          mobilePageLayout
            ? { borderRadius: 0 }
            : { borderRadius: '0 16px 16px 0', borderLeft: 'none', borderBottom: 'none' }
        }
        onPointerEnter={frame.handlePointerEnter}
        onPointerLeave={frame.handlePointerLeave}
      >
        <AnimatePresence mode="wait" initial={false}>
          {showExpandedUi ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: SLIDE_DURATION, ease: SLIDE_EASE }}
              className="p-spacing-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
              <TeamConversationsSidebarHeader
                convoMenuHot={frame.convoMenuHot}
                hasPeerConversations={sidebar.hasPeerConversations}
                mobilePageLayout={mobilePageLayout}
                searchQuery={sidebar.searchQuery}
                showAllOrgConversations={showAllOrgConversations}
                onClearSearch={sidebar.handleClearSearch}
                onExpandedChange={onExpandedChange}
                onMobileGoToTeamRoster={onMobileGoToTeamRoster}
                onNewCampaign={sidebar.openNewCampaignModal}
                onSearchQueryChange={sidebar.handleSearchQueryChange}
                onShowAllOrgConversationsChange={onShowAllOrgConversationsChange}
              />

              <div
                className={
                  sessionsLoading
                    ? 'pt-spacing-3 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden'
                    : 'scrollbar-hide pt-spacing-3 min-h-0 flex-1 overflow-y-auto'
                }
              >
                <TeamConversationsSidebarListContent
                  activeConversations={activeConversations}
                  activeConvsExpanded={sidebar.activeConvsExpanded}
                  agentByKey={sidebar.agentByKey}
                  agentFilter={agentFilter}
                  assignedCampaignsExpanded={sidebar.assignedCampaignsExpanded}
                  assignedGroups={sidebar.assignedGroups}
                  campaignConversationLimitByKey={sidebar.campaignConversationLimitByKey}
                  creatingSession={creatingSession}
                  currentUserId={currentUserId}
                  deletingSessionId={deletingSessionId}
                  expandedCampaignIds={sidebar.expandedCampaignIds}
                  isSearching={sidebar.isSearching}
                  mobilePageLayout={mobilePageLayout}
                  renameValue={renameValue}
                  renamingSessionId={renamingSessionId}
                  resolveCampaignForGroup={sidebar.resolveCampaignForGroup}
                  searchQuery={sidebar.searchQuery}
                  selectedSessionId={selectedSessionId}
                  sessionActionsOpenId={sessionActionsOpenId}
                  sessionActionsPos={sidebar.sessionActionsPos}
                  sessionActionsTriggerRef={sidebar.sessionActionsBtnRef}
                  sessionsLoading={sessionsLoading}
                  sessionTitleTypewriter={sessionTitleTypewriter}
                  showAllOrgConversations={showAllOrgConversations}
                  teamAgents={teamAgents}
                  unassignedCampaignsExpanded={sidebar.unassignedCampaignsExpanded}
                  unassignedGroups={sidebar.unassignedGroups}
                  onAgentFilterChange={onAgentFilterChange}
                  onCancelRename={onCancelRename}
                  onCreateConversationInGroup={sidebar.handleCreateConversationInGroup}
                  onDeleteSession={onDeleteSession}
                  onLoadMoreConversations={sidebar.handleLoadMoreCampaignConversations}
                  onNewCampaign={sidebar.openNewCampaignModal}
                  onRenameValueChange={onRenameValueChange}
                  onRequestAssignCampaign={
                    onAssignAgentToCampaign
                      ? (campaign) =>
                          sidebar.setAssignConfirm({ id: campaign.id, name: campaign.name })
                      : undefined
                  }
                  onSelectActiveConversation={onSelectActiveConversation}
                  onSelectConversation={onSelectConversation}
                  onSessionActionsOpenIdChange={onSessionActionsOpenIdChange}
                  onStartRename={onStartRename}
                  onSubmitRename={onSubmitRename}
                  onToggleActiveConversations={() =>
                    sidebar.setActiveConvsExpanded((p) => !p)
                  }
                  onToggleAssignedCampaigns={() =>
                    sidebar.setAssignedCampaignsExpanded((p) => !p)
                  }
                  onToggleCampaignGroup={sidebar.handleToggleCampaignGroup}
                  onToggleCampaignMenu={sidebar.handleToggleCampaignMenu}
                  onToggleUnassignedCampaigns={() =>
                    sidebar.setUnassignedCampaignsExpanded((p) => !p)
                  }
                />

                <TeamConversationsSidebarOverlays
                  agentName={agentName}
                  assignConfirm={sidebar.assignConfirm}
                  assigning={sidebar.assigning}
                  campaignMenuAnchorRect={sidebar.campaignMenuAnchorRect}
                  campaignMenuGroupKey={sidebar.campaignMenuGroupKey}
                  deletingCampaign={sidebar.deletingCampaign}
                  deleteDialogCampaigns={sidebar.deleteDialogCampaigns}
                  editingCampaign={sidebar.editingCampaign}
                  manageTeamCampaign={sidebar.manageTeamCampaign}
                  resolveCampaignForGroup={sidebar.resolveCampaignForGroup}
                  shareCampaignRow={sidebar.shareCampaignRow}
                  showNewCampaignModal={sidebar.showNewCampaignModal}
                  transferCampaign={sidebar.transferCampaign}
                  onAssignClose={() => sidebar.setAssignConfirm(null)}
                  onAssignConfirm={sidebar.handleAssignConfirm}
                  onCampaignMenuClose={() => sidebar.setCampaignMenuGroupKey(null)}
                  onCampaignMenuDelete={sidebar.handleDeleteCampaignFromMenu}
                  onCampaignMenuEdit={sidebar.handleEditCampaignFromMenu}
                  onCampaignMenuManageTeam={sidebar.handleManageTeamCampaignFromMenu}
                  onCampaignMenuPin={sidebar.handlePinCampaignForMenu}
                  onCampaignMenuShare={sidebar.handleShareCampaignFromMenu}
                  onCampaignMenuTransfer={sidebar.handleTransferCampaignFromMenu}
                  onCampaignsRefresh={onCampaignsRefresh}
                  onDeleteCampaignClose={() => sidebar.setDeletingCampaign(null)}
                  onDeleteCampaignConfirm={sidebar.handleDeleteCampaignConfirm}
                  onManageTeamOpenChange={sidebar.handleManageTeamOpenChange}
                  onNewCampaignClose={sidebar.handleNewCampaignModalClose}
                  onNewCampaignCreate={sidebar.handleNewCampaignModalCreate}
                  onShareClose={() => sidebar.setShareCampaignRow(null)}
                  onTransferClose={() => sidebar.setTransferCampaign(null)}
                />
              </div>
            </motion.div>
          ) : (
            <TeamConversationsSidebarCollapsedRail
              creatingSession={creatingSession}
              onExpandedChange={onExpandedChange}
              onNewConversation={onNewConversation}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
