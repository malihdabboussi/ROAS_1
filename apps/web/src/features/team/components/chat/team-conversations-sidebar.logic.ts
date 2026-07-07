import type {
  SidebarCampaignRow,
} from '@/components/layout/sidebar/sidebar-types'
import type { Campaign } from '@/lib/campaigns'
import type { Conversation } from '@/lib/conversations'

export const TEAM_CONVERSATIONS_GENERAL_KEY = '__general__'
export const CAMPAIGN_CONVERSATIONS_INITIAL = 5
export const CAMPAIGN_CONVERSATIONS_LOAD_MORE = 10

export type TeamConversationAgent = {
  agent_key: string
  name: string
  image_url?: string | null
}

export type TeamConversationCampaignGroup = {
  key: string
  label: string
  icon: string | null
  conversations: Conversation[]
}

export interface TeamConversationSidebarModelInput {
  sessions: Conversation[]
  searchAllSessions?: Conversation[]
  searchQuery: string
  showAllOrgConversations: boolean
  currentUserId?: string | null
  campaigns: Campaign[]
  assignedCampaigns: Campaign[]
}

export interface TeamConversationSidebarModel {
  isSearching: boolean
  assignedGroups: TeamConversationCampaignGroup[]
  unassignedGroups: TeamConversationCampaignGroup[]
}

export function sortByUpdatedAt(a: Conversation, b: Conversation): number {
  return (
    (Number.isNaN(Date.parse(b.updated_at)) ? 0 : Date.parse(b.updated_at)) -
    (Number.isNaN(Date.parse(a.updated_at)) ? 0 : Date.parse(a.updated_at))
  )
}

export function campaignToSidebarRow(campaign: Campaign): SidebarCampaignRow {
  const config = (campaign.config ?? {}) as Record<string, unknown>
  const systemKind = typeof config.system_kind === 'string' ? config.system_kind.toLowerCase() : ''
  const normalizedName = campaign.name.trim().toLowerCase()
  const isSystemGeneral =
    normalizedName === 'general' || systemKind === 'general' || config.isSystem === true

  return {
    id: campaign.id,
    name: campaign.name ?? 'Untitled',
    icon: (typeof config.icon === 'string' ? config.icon : null) ?? 'folder-kanban',
    isPinned: !!config.isPinned,
    isSystemGeneral,
    isFavorite: !!config.isFavorite,
    isHidden: !!config.isHidden,
    config,
    created_at: campaign.created_at,
  }
}

export function buildCampaignById(campaigns: Campaign[]): Map<string, Campaign> {
  const campaignById = new Map<string, Campaign>()
  for (const campaign of campaigns) campaignById.set(campaign.id, campaign)
  return campaignById
}

export function teamConversationHasPeerConversations(
  sessions: Conversation[],
  currentUserId?: string | null,
): boolean {
  if (!currentUserId) return false
  return sessions.some((session) => session.user_id != null && session.user_id !== currentUserId)
}

export function getAgentFilterLabel(
  agentFilter: Set<string> | undefined,
  teamAgents: TeamConversationAgent[],
): string {
  if (!agentFilter || agentFilter.size === 0) return 'All agents'
  if (agentFilter.size === 1) {
    return teamAgents.find((agent) => agentFilter.has(agent.agent_key))?.name ?? 'Agent'
  }
  return `${agentFilter.size} agents`
}

export function getConversationDisplayTitle(
  session: Conversation,
  sessionTitleTypewriter?: { conversationId: string; text: string } | null,
): string {
  if (sessionTitleTypewriter?.conversationId === session.id) return sessionTitleTypewriter.text
  const base = session.title?.trim() || 'New conversation'
  const isDraft = (session.metadata as Record<string, unknown> | undefined)?.team_draft === true
  return isDraft ? `${base} (Draft)` : base
}

export function buildTeamConversationSidebarModel({
  sessions,
  searchAllSessions,
  searchQuery,
  showAllOrgConversations,
  currentUserId,
  campaigns,
  assignedCampaigns,
}: TeamConversationSidebarModelInput): TeamConversationSidebarModel {
  const isSearching = !!searchQuery.trim()
  const assignedCampaignIds = new Set(assignedCampaigns.map((campaign) => campaign.id))
  const campaignById = buildCampaignById(campaigns)
  const baseSessions = isSearching && searchAllSessions ? searchAllSessions : sessions
  let filteredSessions = baseSessions

  if (!isSearching && !showAllOrgConversations && currentUserId) {
    filteredSessions = filteredSessions.filter((session) => session.user_id === currentUserId)
  }

  if (isSearching) {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    filteredSessions = filteredSessions.filter((session) =>
      (session.title ?? '').toLowerCase().includes(normalizedQuery),
    )
  }

  const buckets = new Map<string, Conversation[]>()
  for (const session of filteredSessions) {
    const campaignId = session.campaign_id
    const key =
      campaignId && (assignedCampaignIds.has(campaignId) || campaignById.has(campaignId))
        ? campaignId
        : TEAM_CONVERSATIONS_GENERAL_KEY
    const bucket = buckets.get(key) ?? []
    bucket.push(session)
    buckets.set(key, bucket)
  }

  const assignedGroups: TeamConversationCampaignGroup[] = [
    {
      key: TEAM_CONVERSATIONS_GENERAL_KEY,
      label: 'General',
      icon: null,
      conversations: [...(buckets.get(TEAM_CONVERSATIONS_GENERAL_KEY) ?? [])].sort(
        sortByUpdatedAt,
      ),
    },
  ]

  for (const campaign of assignedCampaigns) {
    const config = (campaign.config ?? {}) as Record<string, unknown>
    assignedGroups.push({
      key: campaign.id,
      label: campaign.name,
      icon: typeof config.icon === 'string' ? config.icon : null,
      conversations: [...(buckets.get(campaign.id) ?? [])].sort(sortByUpdatedAt),
    })
  }

  const unassignedGroups: TeamConversationCampaignGroup[] = []
  for (const campaign of campaigns) {
    if (assignedCampaignIds.has(campaign.id)) continue
    const config = (campaign.config ?? {}) as Record<string, unknown>
    unassignedGroups.push({
      key: campaign.id,
      label: campaign.name,
      icon: typeof config.icon === 'string' ? config.icon : null,
      conversations: [...(buckets.get(campaign.id) ?? [])].sort(sortByUpdatedAt),
    })
  }

  return { isSearching, assignedGroups, unassignedGroups }
}

export function getCampaignConversationDisplayState({
  group,
  selectedSessionId,
  campaignConversationLimitByKey,
}: {
  group: TeamConversationCampaignGroup
  selectedSessionId: string | null
  campaignConversationLimitByKey: Record<string, number>
}) {
  const userCap =
    campaignConversationLimitByKey[group.key] ?? CAMPAIGN_CONVERSATIONS_INITIAL
  const selectedIdx =
    selectedSessionId != null
      ? group.conversations.findIndex((session) => session.id === selectedSessionId)
      : -1
  const selectionCap = selectedIdx >= 0 ? selectedIdx + 1 : 0
  const displayCap = Math.min(
    Math.max(userCap, selectionCap),
    group.conversations.length,
  )
  const visibleConversations = group.conversations.slice(0, displayCap)

  return {
    selectedIdx,
    visibleConversations,
    hasMoreConversations: displayCap < group.conversations.length,
  }
}
