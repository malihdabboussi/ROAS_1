import type { Conversation, Message } from '@/lib/chat/studio-chat-runtime-adapter'
import type { Campaign } from '@/lib/campaigns'
import { getOrgScopedKey } from '@/lib/utils/org-storage'

export const EMPTY_MESSAGES: Message[] = []
export const INITIAL_PAGE_SIZE = 30
export const OLDER_PAGE_SIZE = 30
/** Backend default page size when `fetchMessages(conversationId)` is called with no limit */
export const BACKEND_DEFAULT_MESSAGE_PAGE = 50
export const TOP_LOAD_THRESHOLD = 60
export const BOTTOM_SCROLL_THRESHOLD = 80
export const MESSAGE_HYDRATION_TIMEOUT_MS = 12000
export const SESSION_STORAGE_KEY = 'team-agent-last-session'
export const TEAM_DRAFT_IDLE_TTL_MS = 5 * 60 * 1000
export const AGENT_SETUP_STALE_MS = 10 * 60 * 1000
export const CAMPAIGN_SCOPE_STORAGE_KEY = 'team-agent-campaign-scope'

export interface AgentChatTurn {
  user: Message
  responses: Message[]
}

export interface AgentChatTurnData {
  leadingMessages: Message[]
  turns: AgentChatTurn[]
}

interface ResolveRequestedSessionIdInput {
  initialSessionId: string | null
  isMobile: boolean
  persistedSessionId: string | null
}

interface ResolveInitialCampaignFilterInput {
  requestedSessionId: string | null
  cachedCampaignId: string | null
  generalCampaignId: string | null | undefined
}

interface ResolveCachedSessionInput {
  requestedSessionId: string | null
  sessionsList: Conversation[]
  cachedConversations: Conversation[]
  agentKey: string
}

interface ResolveCachedSessionResult {
  cachedSessionId: string | null
  sessionsList: Conversation[]
  shouldClearPersistedSession: boolean
}

interface ResolveInitialTargetSessionInput {
  cachedSessionId: string | null
  sessionsList: Conversation[]
  initialSessionId: string | null
  isMobile: boolean
}

export interface MobileCampaignSwitcherOption {
  id: string
  name: string
  icon: string | null
}

type SessionMap = Record<string, string>

export function readConversationSpaceId(conversation: Conversation | null): string | null {
  const value = conversation?.metadata?.space_id
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function conversationBelongsToAgent(
  conversation: Conversation | null | undefined,
  agentKey: string,
): conversation is Conversation {
  return conversation?.agent_id === agentKey
}

export function resolveRequestedSessionId({
  initialSessionId,
  isMobile,
  persistedSessionId,
}: ResolveRequestedSessionIdInput): string | null {
  return initialSessionId ?? (isMobile ? null : persistedSessionId) ?? null
}

export function resolveInitialCampaignFilter({
  requestedSessionId,
  cachedCampaignId,
  generalCampaignId,
}: ResolveInitialCampaignFilterInput): string | undefined {
  if (requestedSessionId) return undefined
  if (cachedCampaignId == null || generalCampaignId == null) return undefined
  return cachedCampaignId !== generalCampaignId ? cachedCampaignId : undefined
}

/**
 * Prefer an assigned campaign over General when creating Team agent chats.
 * Browsing a General thread must not sticky-set the next new chat to General
 * when the agent already has campaign assignments (e.g. Nate → Impact).
 */
export function resolveDefaultNewConversationCampaignId({
  assignedCampaigns,
  cachedCampaignId,
  generalCampaignId,
}: {
  assignedCampaigns: Array<{ id: string }>
  cachedCampaignId: string | null | undefined
  generalCampaignId: string | null | undefined
}): string | null {
  const cached =
    typeof cachedCampaignId === 'string' && cachedCampaignId.trim().length > 0
      ? cachedCampaignId.trim()
      : null
  if (cached && cached !== generalCampaignId) return cached

  const firstAssigned = assignedCampaigns[0]?.id
  if (typeof firstAssigned === 'string' && firstAssigned.trim().length > 0) {
    return firstAssigned.trim()
  }

  if (cached) return cached
  return typeof generalCampaignId === 'string' && generalCampaignId.trim().length > 0
    ? generalCampaignId.trim()
    : null
}

export function isGeneralCampaignId(
  campaignId: string | null | undefined,
  generalCampaignId: string | null | undefined,
): boolean {
  if (!campaignId || !generalCampaignId) return false
  return campaignId === generalCampaignId
}

/**
 * When a Team chat is stuck on General but the agent has exactly one assigned
 * client campaign, remount onto that campaign so campaign-brain tools resolve.
 * Multiple assignments → null (user must pick via scope picker).
 */
export function resolvePreferredCampaignWhenGeneral({
  activeCampaignId,
  assignedCampaigns,
  generalCampaignId,
}: {
  activeCampaignId: string | null | undefined
  assignedCampaigns: Array<{ id: string }>
  generalCampaignId: string | null | undefined
}): string | null {
  if (!isGeneralCampaignId(activeCampaignId, generalCampaignId)) return null
  if (assignedCampaigns.length !== 1) return null
  const preferred = assignedCampaigns[0]?.id
  return typeof preferred === 'string' && preferred.trim().length > 0 ? preferred.trim() : null
}

export function resolveCachedSession({
  requestedSessionId,
  sessionsList,
  cachedConversations,
  agentKey,
}: ResolveCachedSessionInput): ResolveCachedSessionResult {
  if (!requestedSessionId) {
    return { cachedSessionId: null, sessionsList, shouldClearPersistedSession: false }
  }

  const fetchedRequestedSession = sessionsList.find(
    (session) => session.id === requestedSessionId,
  )
  if (conversationBelongsToAgent(fetchedRequestedSession, agentKey)) {
    return {
      cachedSessionId: requestedSessionId,
      sessionsList,
      shouldClearPersistedSession: false,
    }
  }

  const cachedConversation = cachedConversations.find(
    (conversation) =>
      conversation.id === requestedSessionId && conversationBelongsToAgent(conversation, agentKey),
  )
  if (cachedConversation) {
    return {
      cachedSessionId: requestedSessionId,
      sessionsList: [
        cachedConversation,
        ...sessionsList.filter((session) => session.id !== requestedSessionId),
      ],
      shouldClearPersistedSession: false,
    }
  }

  return { cachedSessionId: null, sessionsList, shouldClearPersistedSession: true }
}

export function resolveInitialTargetSessionId({
  cachedSessionId,
  sessionsList,
  initialSessionId,
  isMobile,
}: ResolveInitialTargetSessionInput): string | null {
  if (
    cachedSessionId &&
    (sessionsList.some((session) => session.id === cachedSessionId) ||
      cachedSessionId === initialSessionId)
  ) {
    return cachedSessionId
  }
  return !isMobile ? (sessionsList[0]?.id ?? null) : null
}

export function resolveActiveCampaignId(
  selectedSession: Conversation | null,
  generalCampaignId: string | undefined,
): string | null {
  if (!selectedSession) return null
  const raw = selectedSession.campaign_id
  if (typeof raw === 'string' && raw.trim().length > 0) return raw
  return generalCampaignId ?? null
}

export function buildMobileCampaignSwitcherOptions(
  generalCampaignId: string | undefined,
  nonGeneralCampaigns: Campaign[],
): MobileCampaignSwitcherOption[] {
  const options: MobileCampaignSwitcherOption[] = []
  if (generalCampaignId) {
    options.push({ id: generalCampaignId, name: 'General', icon: 'users' })
  }
  for (const campaign of nonGeneralCampaigns) {
    const config = (campaign.config ?? {}) as Record<string, unknown>
    options.push({
      id: campaign.id,
      name: campaign.name ?? 'Campaign',
      icon: typeof config.icon === 'string' ? config.icon : null,
    })
  }
  return options
}

export function resolveConversationCampaignId(
  conversation: Conversation,
  generalCampaignId: string | undefined,
): string | null {
  const raw = conversation.campaign_id
  return typeof raw === 'string' && raw.length > 0 ? raw : (generalCampaignId ?? null)
}

export function findLatestSessionForCampaign(
  sessions: Conversation[],
  campaignId: string,
  generalCampaignId: string | undefined,
): Conversation | null {
  return (
    sessions
      .filter(
        (session) => resolveConversationCampaignId(session, generalCampaignId) === campaignId,
      )
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0] ??
    null
  )
}

export function readSessionMap(): SessionMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(getOrgScopedKey(SESSION_STORAGE_KEY))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SessionMap
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

export function writeSessionMap(nextMap: SessionMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getOrgScopedKey(SESSION_STORAGE_KEY), JSON.stringify(nextMap))
  } catch {
    // Ignore storage failures
  }
}

export function readCampaignScopeMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(getOrgScopedKey(CAMPAIGN_SCOPE_STORAGE_KEY))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

export function writeCampaignScope(agentKey: string, campaignId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const current = readCampaignScopeMap()
    if (!campaignId) {
      if (!current[agentKey]) return
      delete current[agentKey]
    } else {
      current[agentKey] = campaignId
    }
    window.localStorage.setItem(
      getOrgScopedKey(CAMPAIGN_SCOPE_STORAGE_KEY),
      JSON.stringify(current),
    )
  } catch {
    // Ignore storage failures
  }
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Message hydration timed out'))
    }, ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export function buildAgentChatTurnData(displayMessages: Message[]): AgentChatTurnData {
  const leadingMessages: Message[] = []
  const turns: AgentChatTurn[] = []
  let currentTurn: AgentChatTurn | null = null

  for (const message of displayMessages) {
    if (message.role === 'user') {
      const isVoice = message.metadata.source === 'voice_live'
      if (isVoice && currentTurn) {
        currentTurn.responses.push(message)
      } else {
        if (currentTurn) turns.push(currentTurn)
        currentTurn = { user: message, responses: [] }
      }
    } else if (currentTurn) {
      currentTurn.responses.push(message)
    } else {
      leadingMessages.push(message)
    }
  }
  if (currentTurn) turns.push(currentTurn)
  return { leadingMessages, turns }
}
