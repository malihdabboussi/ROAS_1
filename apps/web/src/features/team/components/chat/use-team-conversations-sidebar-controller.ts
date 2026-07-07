'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TeamConversationsSidebarProps } from './TeamConversationsSidebar'
import {
  buildTeamConversationSidebarModel,
  CAMPAIGN_CONVERSATIONS_INITIAL,
  CAMPAIGN_CONVERSATIONS_LOAD_MORE,
  TEAM_CONVERSATIONS_GENERAL_KEY,
  teamConversationHasPeerConversations,
} from './team-conversations-sidebar.logic'
import { useTeamConversationsSidebarCampaignController } from './use-team-conversations-sidebar-campaign-controller'

type TeamConversationsSidebarControllerOptions = Pick<
  TeamConversationsSidebarProps,
  | 'sessions'
  | 'selectedSessionId'
  | 'sessionActionsOpenId'
  | 'onSessionActionsOpenIdChange'
  | 'campaigns'
  | 'assignedCampaigns'
  | 'allCampaigns'
  | 'generalCampaignId'
  | 'onCampaignsRefresh'
  | 'agentKey'
  | 'onCampaignHeaderClick'
  | 'onCampaignExpand'
  | 'onAssignAgentToCampaign'
  | 'showAllOrgConversations'
  | 'currentUserId'
  | 'teamAgents'
  | 'searchAllSessions'
  | 'onSearchQueryChange'
  | 'onNewConversationInCampaign'
  | 'mobilePageLayout'
>

export function useTeamConversationsSidebarController({
  agentKey,
  allCampaigns,
  assignedCampaigns = [],
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
  showAllOrgConversations = true,
  teamAgents = [],
}: TeamConversationsSidebarControllerOptions) {
  const sessionActionsBtnRef = useRef<HTMLElement | null>(null)
  const [sessionActionsPos, setSessionActionsPos] = useState({ top: 0, left: 0, minWidth: 120 })
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(new Set())
  const [campaignConversationLimitByKey, setCampaignConversationLimitByKey] = useState<
    Record<string, number>
  >({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeConvsExpanded, setActiveConvsExpanded] = useState(true)
  const [assignedCampaignsExpanded, setAssignedCampaignsExpanded] = useState(true)
  const [unassignedCampaignsExpanded, setUnassignedCampaignsExpanded] = useState(true)

  const campaignController = useTeamConversationsSidebarCampaignController({
    agentKey,
    allCampaigns,
    generalCampaignId,
    onAssignAgentToCampaign,
    onCampaignsRefresh,
    onSessionActionsOpenIdChange,
  })
  const { setCampaignMenuGroupKey } = campaignController

  const handleSearchQueryChange = useCallback(
    (query: string) => {
      setSearchQuery(query)
      onSearchQueryChange?.(query)
    },
    [onSearchQueryChange],
  )

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  const agentByKey = useMemo(() => {
    const m = new Map<string, { agent_key: string; name: string; image_url?: string | null }>()
    for (const a of teamAgents) m.set(a.agent_key, a)
    return m
  }, [teamAgents])

  useLayoutEffect(() => {
    if (!sessionActionsOpenId || !sessionActionsBtnRef.current) return
    const rect = sessionActionsBtnRef.current.getBoundingClientRect()
    setSessionActionsPos({ top: rect.bottom + 4, left: rect.right - 120, minWidth: 120 })
  }, [sessionActionsOpenId])

  useEffect(() => {
    if (sessionActionsOpenId) setCampaignMenuGroupKey(null)
  }, [sessionActionsOpenId, setCampaignMenuGroupKey])

  useEffect(() => {
    if (!sessionActionsOpenId) return
    const handle = (event: MouseEvent) => {
      const target = event.target as Node
      if ((target as Element).closest?.('[data-session-actions-dropdown]')) return
      if (sessionActionsBtnRef.current?.contains(target)) return
      onSessionActionsOpenIdChange(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [sessionActionsOpenId, onSessionActionsOpenIdChange])

  useEffect(() => {
    if (!selectedSessionId) return
    const sel = sessions.find((s) => s.id === selectedSessionId)
    if (!sel) return
    const cid = sel.campaign_id
    const key =
      cid && campaigns.some((campaign) => campaign.id === cid)
        ? cid
        : TEAM_CONVERSATIONS_GENERAL_KEY
    setExpandedCampaignIds((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }, [selectedSessionId, sessions, campaigns])

  useEffect(() => {
    setCampaignConversationLimitByKey((prev) => {
      let changed = false
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (!expandedCampaignIds.has(key)) {
          delete next[key]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [expandedCampaignIds])

  const hasPeerConversations = useMemo(
    () => teamConversationHasPeerConversations(sessions, currentUserId),
    [sessions, currentUserId],
  )

  const { assignedGroups, isSearching, unassignedGroups } = useMemo(
    () =>
      buildTeamConversationSidebarModel({
        sessions,
        searchAllSessions,
        searchQuery,
        showAllOrgConversations,
        currentUserId,
        campaigns,
        assignedCampaigns,
      }),
    [
      assignedCampaigns,
      campaigns,
      currentUserId,
      searchAllSessions,
      sessions,
      searchQuery,
      showAllOrgConversations,
    ],
  )

  const handleToggleCampaignGroup = useCallback(
    (groupKey: string) => {
      const wasOpen = expandedCampaignIds.has(groupKey)
      setExpandedCampaignIds((prev) => {
        const next = new Set(prev)
        if (next.has(groupKey)) next.delete(groupKey)
        else next.add(groupKey)
        return next
      })
      if (!wasOpen) {
        onCampaignExpand?.(groupKey)
        if (!mobilePageLayout) onCampaignHeaderClick?.(groupKey)
      }
    },
    [expandedCampaignIds, mobilePageLayout, onCampaignExpand, onCampaignHeaderClick],
  )

  const handleCreateConversationInGroup = useCallback(
    (groupKey: string) => {
      const resolvedId =
        groupKey === TEAM_CONVERSATIONS_GENERAL_KEY ? generalCampaignId : groupKey
      if (resolvedId) onNewConversationInCampaign?.(resolvedId)
    },
    [generalCampaignId, onNewConversationInCampaign],
  )

  const handleLoadMoreCampaignConversations = useCallback((groupKey: string) => {
    setCampaignConversationLimitByKey((prev) => ({
      ...prev,
      [groupKey]:
        (prev[groupKey] ?? CAMPAIGN_CONVERSATIONS_INITIAL) +
        CAMPAIGN_CONVERSATIONS_LOAD_MORE,
    }))
  }, [])

  return {
    ...campaignController,
    activeConvsExpanded,
    agentByKey,
    assignedCampaignsExpanded,
    assignedGroups,
    campaignConversationLimitByKey,
    expandedCampaignIds,
    hasPeerConversations,
    isSearching,
    searchQuery,
    sessionActionsBtnRef,
    sessionActionsPos,
    unassignedCampaignsExpanded,
    unassignedGroups,
    handleClearSearch,
    handleCreateConversationInGroup,
    handleLoadMoreCampaignConversations,
    handleSearchQueryChange,
    handleToggleCampaignGroup,
    setActiveConvsExpanded,
    setAssignedCampaignsExpanded,
    setUnassignedCampaignsExpanded,
  }
}
