import type { Conversation, Message } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  INITIAL_PAGE_SIZE,
  resolveCachedSession,
  resolveInitialCampaignFilter,
  resolveInitialTargetSessionId,
  resolveRequestedSessionId,
} from './agent-chat-panel.logic'

interface FetchMessagesForSessionOptions {
  limit?: number
}

type InitialLoadMarkContext = Record<string, string | number | boolean | null | undefined>

export interface RunAgentChatInitialLoadInput {
  agentKey: string
  initialSessionId: string | null
  isMobile: boolean
  startBlankSession: boolean
  generalCampaignId: string | undefined
  readPersistedSessionId: () => string | null
  readCachedCampaignId: () => string | null
  cachedFetchConversations: (
    cacheKey: string,
    load: () => Promise<Conversation[]>,
  ) => Promise<Conversation[]>
  fetchConversationsForAgent: (
    campaignId: string | undefined,
    agentKey: string,
  ) => Promise<Conversation[]>
  fetchMessagesForSession: (
    sessionId: string,
    options?: FetchMessagesForSessionOptions,
  ) => Promise<Message[]>
  getCachedConversations: () => Conversation[]
  addConversation: (conversation: Conversation) => void
  setLoadedCampaignIds: (campaignIds: Set<string>) => void
  persistSessionSelection: (sessionId: string | null) => void
  setSessions: (sessions: Conversation[]) => void
  setSessionsLoading: (loading: boolean) => void
  setInitializing: (initializing: boolean) => void
  setSelectedSessionId: (sessionId: string | null) => void
  setActiveConversationId: (sessionId: string | null) => void
  onSessionChange: (sessionId: string | null) => void
  dispatchMobileSessionTitle: (title: string) => void
  setMessages: (sessionId: string, messages: Message[]) => void
  setHasOlder: (hasOlder: boolean) => void
  getNewComposerDraft: () => string | undefined
  setComposerDraft: (sessionId: string, draft: string) => void
  clearNewComposerDraft: () => void
  getPendingStrategySessionId: () => string | null
  isStreamActiveForSession: (sessionId: string) => boolean
  needsRecovery: (messages: Message[]) => boolean
  recover: (sessionId: string) => void
  selectSession: (sessionId: string, hydrate: boolean) => Promise<void>
  reportMark: (phase: string, context?: InitialLoadMarkContext) => void
  getDurationMs: () => number
  isCancelled: () => boolean
}

function getConversationsCacheKey(agentKey: string, campaignFilter: string | undefined): string {
  return campaignFilter
    ? `conversations:agent:${agentKey}:campaign:${campaignFilter}`
    : `conversations:agent:${agentKey}`
}

export async function runAgentChatInitialLoad({
  agentKey,
  initialSessionId,
  isMobile,
  startBlankSession,
  generalCampaignId,
  readPersistedSessionId,
  readCachedCampaignId,
  cachedFetchConversations,
  fetchConversationsForAgent,
  fetchMessagesForSession,
  getCachedConversations,
  addConversation,
  setLoadedCampaignIds,
  persistSessionSelection,
  setSessions,
  setSessionsLoading,
  setInitializing,
  setSelectedSessionId,
  setActiveConversationId,
  onSessionChange,
  dispatchMobileSessionTitle,
  setMessages,
  setHasOlder,
  getNewComposerDraft,
  setComposerDraft,
  clearNewComposerDraft,
  getPendingStrategySessionId,
  isStreamActiveForSession,
  needsRecovery,
  recover,
  selectSession,
  reportMark,
  getDurationMs,
  isCancelled,
}: RunAgentChatInitialLoadInput): Promise<void> {
  try {
    const requestedSessionId = resolveRequestedSessionId({
      initialSessionId,
      isMobile,
      persistedSessionId: readPersistedSessionId(),
    })
    const campaignFilter = resolveInitialCampaignFilter({
      requestedSessionId,
      cachedCampaignId: readCachedCampaignId(),
      generalCampaignId,
    })

    const fetchedSessions = await cachedFetchConversations(
      getConversationsCacheKey(agentKey, campaignFilter),
      () => fetchConversationsForAgent(campaignFilter, agentKey),
    )
    reportMark('initial_conversations_end', {
      campaign_scoped: campaignFilter != null,
      conversations_count: fetchedSessions.length,
      duration_ms: getDurationMs(),
      has_requested_session: requestedSessionId != null,
    })
    if (isCancelled()) return

    fetchedSessions.forEach((session) => {
      addConversation(session)
    })

    if (campaignFilter) {
      setLoadedCampaignIds(new Set([campaignFilter]))
    }

    const cachedSessionResolution = resolveCachedSession({
      requestedSessionId,
      sessionsList: fetchedSessions,
      cachedConversations: getCachedConversations(),
      agentKey,
    })
    if (cachedSessionResolution.shouldClearPersistedSession) {
      persistSessionSelection(null)
    }
    const { cachedSessionId, sessionsList } = cachedSessionResolution
    const prefetchedMessages = cachedSessionId
      ? await fetchMessagesForSession(cachedSessionId, { limit: INITIAL_PAGE_SIZE }).catch(
          () => null,
        )
      : null
    if (cachedSessionId) {
      reportMark('initial_prefetch_messages_end', {
        duration_ms: getDurationMs(),
        messages_count: prefetchedMessages?.length ?? 0,
        messages_found: prefetchedMessages != null,
      })
    }
    if (isCancelled()) return

    if (startBlankSession) {
      setInactiveSessionState(sessionsList)
      return
    }

    reportMark('initial_data_ready', {
      cached_session: cachedSessionId != null,
      duration_ms: getDurationMs(),
      sessions_count: sessionsList.length,
    })

    const targetSessionId = resolveInitialTargetSessionId({
      cachedSessionId,
      sessionsList,
      initialSessionId,
      isMobile,
    })

    if (!targetSessionId) {
      setInactiveSessionState(sessionsList)
      return
    }

    setSessions(sessionsList)
    setSessionsLoading(false)

    const pendingStrategySessionId = getPendingStrategySessionId()
    if (pendingStrategySessionId) {
      setSelectedSessionId(pendingStrategySessionId)
      setInitializing(false)
      return
    }

    if (
      targetSessionId !== cachedSessionId ||
      prefetchedMessages == null ||
      isStreamActiveForSession(targetSessionId)
    ) {
      await selectSession(targetSessionId, true)
      return
    }

    const pendingDraft = getNewComposerDraft()
    if (pendingDraft?.trim()) {
      setComposerDraft(targetSessionId, pendingDraft)
      clearNewComposerDraft()
    }
    setSelectedSessionId(targetSessionId)
    setActiveConversationId(targetSessionId)
    persistSessionSelection(targetSessionId)
    onSessionChange(targetSessionId)
    const title =
      sessionsList.find((session) => session.id === targetSessionId)?.title?.trim() ||
      'New Session'
    dispatchMobileSessionTitle(title)
    setMessages(targetSessionId, prefetchedMessages)
    setHasOlder(prefetchedMessages.length === INITIAL_PAGE_SIZE)
    if (needsRecovery(prefetchedMessages)) {
      recover(targetSessionId)
    }
    setInitializing(false)
  } catch (error: unknown) {
    if (isCancelled()) return
    reportMark('initial_load_error', {
      duration_ms: getDurationMs(),
      message: error instanceof Error ? error.message : String(error),
    })
    setSessions([])
    setSessionsLoading(false)
    setInitializing(false)
  }

  function setInactiveSessionState(sessionsList: Conversation[]): void {
    setSessions(sessionsList)
    setSessionsLoading(false)
    setInitializing(false)
    setSelectedSessionId(null)
    setActiveConversationId(null)
    persistSessionSelection(null)
    onSessionChange(null)
  }
}
