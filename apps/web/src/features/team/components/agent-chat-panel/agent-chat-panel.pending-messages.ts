import type { Conversation, DocumentAttachment } from '@/lib/chat/studio-chat-runtime-adapter'

export const teamPendingSendInFlightKeys = new Set<string>()
export const teamPendingDeliverableInFlightKeys = new Set<string>()

interface PendingMessageStorage {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
}

interface PendingSendMessagePayload {
  agentKey?: string
  content?: string
  campaignId?: string
  campaignName?: string
  suppressUserMessage?: boolean
}

interface PendingDeliverableMessagePayload {
  agentKey?: string
  content?: string
  documents?: DocumentAttachment[]
}

interface PendingStrategyStreamParams {
  conversation_id: string
  content: string
  campaign_id?: string
  suppressUserMessage: true
}

export type PendingSendMessageStatus =
  | 'skipped-busy'
  | 'skipped-in-flight'
  | 'skipped-missing'
  | 'skipped-agent'
  | 'removed-invalid'
  | 'removed-empty'
  | 'sent'
  | 'started-strategy'

export type PendingDeliverableMessageStatus =
  | 'skipped-busy'
  | 'skipped-in-flight'
  | 'skipped-missing'
  | 'skipped-agent'
  | 'removed-invalid'
  | 'removed-empty'
  | 'sent'

export interface RunAgentChatPendingSendMessageInput {
  agentKey: string
  storageKey: string
  storage: PendingMessageStorage
  inFlightKeys: Set<string>
  sessionsLoading: boolean
  initializing: boolean
  isStopping: boolean
  activeCampaignId: string | null
  getNewConversationCampaignScope: () => string | null
  setNewConversationCampaignScope: (campaignId: string) => void
  setActiveCampaign: (campaignId: string, campaignName: string | null) => void
  createAndSelectSession: (campaignId?: string | null) => Promise<Conversation>
  setPendingStrategySessionId: (sessionId: string) => void
  sendMessageStreaming: (params: PendingStrategyStreamParams) => Promise<unknown>
  fetchConversationsForAgent: (agentKey: string) => Promise<Conversation[]>
  setSessions: (sessions: Conversation[]) => void
  setSelectedSessionId: (sessionId: string) => void
  onSessionChange?: (sessionId: string) => void
  sendWithToast: (content: string) => Promise<void>
}

export interface RunAgentChatPendingDeliverableMessageInput {
  agentKey: string
  storageKey: string
  storage: PendingMessageStorage
  inFlightKeys: Set<string>
  sessionsLoading: boolean
  initializing: boolean
  isStopping: boolean
  sendWithToast: (content: string, documents?: DocumentAttachment[]) => Promise<void>
}

export async function runAgentChatPendingSendMessage({
  agentKey,
  storageKey,
  storage,
  inFlightKeys,
  sessionsLoading,
  initializing,
  isStopping,
  activeCampaignId,
  getNewConversationCampaignScope,
  setNewConversationCampaignScope,
  setActiveCampaign,
  createAndSelectSession,
  setPendingStrategySessionId,
  sendMessageStreaming,
  fetchConversationsForAgent,
  setSessions,
  setSelectedSessionId,
  onSessionChange,
  sendWithToast,
}: RunAgentChatPendingSendMessageInput): Promise<PendingSendMessageStatus> {
  if (sessionsLoading || initializing || isStopping) return 'skipped-busy'
  if (inFlightKeys.has(storageKey)) return 'skipped-in-flight'

  const raw = storage.getItem(storageKey)
  if (!raw) return 'skipped-missing'

  let parsed: PendingSendMessagePayload
  try {
    parsed = JSON.parse(raw) as PendingSendMessagePayload
  } catch {
    storage.removeItem(storageKey)
    return 'removed-invalid'
  }
  if (parsed.agentKey !== agentKey) return 'skipped-agent'

  const content = parsed.content?.trim()
  if (!content) {
    storage.removeItem(storageKey)
    return 'removed-empty'
  }

  inFlightKeys.add(storageKey)
  try {
    if (parsed.campaignId) {
      setNewConversationCampaignScope(parsed.campaignId)
      setActiveCampaign(parsed.campaignId, parsed.campaignName ?? null)
    }

    if (parsed.suppressUserMessage) {
      const scope = parsed.campaignId ?? getNewConversationCampaignScope() ?? activeCampaignId
      const created = await createAndSelectSession(scope ?? undefined)
      setPendingStrategySessionId(created.id)
      await sendMessageStreaming({
        conversation_id: created.id,
        content,
        campaign_id: scope || undefined,
        suppressUserMessage: true,
      })
      const refreshed = await fetchConversationsForAgent(agentKey)
      setSessions(refreshed)
      setSelectedSessionId(created.id)
      onSessionChange?.(created.id)
      return 'started-strategy'
    }

    await sendWithToast(content)
    return 'sent'
  } finally {
    storage.removeItem(storageKey)
    inFlightKeys.delete(storageKey)
  }
}

export async function runAgentChatPendingDeliverableMessage({
  agentKey,
  storageKey,
  storage,
  inFlightKeys,
  sessionsLoading,
  initializing,
  isStopping,
  sendWithToast,
}: RunAgentChatPendingDeliverableMessageInput): Promise<PendingDeliverableMessageStatus> {
  if (sessionsLoading || initializing || isStopping) return 'skipped-busy'
  if (inFlightKeys.has(storageKey)) return 'skipped-in-flight'

  const raw = storage.getItem(storageKey)
  if (!raw) return 'skipped-missing'

  let parsed: PendingDeliverableMessagePayload
  try {
    parsed = JSON.parse(raw) as PendingDeliverableMessagePayload
  } catch {
    storage.removeItem(storageKey)
    return 'removed-invalid'
  }
  if (parsed.agentKey !== agentKey) return 'skipped-agent'

  const content = parsed.content?.trim()
  if (!content) {
    storage.removeItem(storageKey)
    return 'removed-empty'
  }

  inFlightKeys.add(storageKey)
  try {
    await sendWithToast(content, parsed.documents)
    return 'sent'
  } finally {
    storage.removeItem(storageKey)
    inFlightKeys.delete(storageKey)
  }
}
