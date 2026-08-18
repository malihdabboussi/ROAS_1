'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CampaignPreviewPanel } from '@/components/chat/CampaignPreviewPanelAdapter'
import { ChatInput } from '@/components/chat/ChatInputAdapter'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { usePanelResize } from '@/components/layout/usePanelResize'
import type { MissionAgent } from '@/lib/agents'
import { reportTeamError } from '@/lib/agents'
import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { Campaign } from '@/lib/campaigns'
import {
  CHAT_TOAST_ERRORS,
  toastMessageForChatSendError,
  type AttachedArtifact,
  type ChatModelSettings,
} from '@/lib/chat'
import { resolvePinnedAssistantMessageId } from '@/lib/chat/assistant-message-actions'
import { useCampaignMode } from '@/lib/chat/campaign-mode-adapter'
import {
  clearConversationTeamDraft,
  createNewConversation,
  deleteConversation,
  deleteMessagesFrom,
  fetchConversations,
  fetchMessages,
  initStreamResilience,
  isStreamActive,
  mergeMessagesPreservingOrderedBlocks,
  needsStreamRecovery,
  recoverConversation,
  renameConversation,
  requestStopStream,
  sendMessageStreaming,
  suggestConversationTitle,
  useChatStore,
  type Conversation,
  type DocumentAttachment,
  type MessageReference,
} from '@/lib/chat/studio-chat-runtime-adapter'
import { useActiveArtifactSelectionSignal } from '@/lib/chat/use-active-artifact-selection-signal'
import { reportFreezeEvent } from '@/lib/debug/freeze-diagnostics'
import { useOrgStore } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import { runAgentChatInitialLoad } from './agent-chat-panel/agent-chat-panel.initial-load'
import { runAgentChatInitialSessionSyncRetry } from './agent-chat-panel/agent-chat-panel.initial-session-sync'
import {
  buildAgentChatTurnData,
  EMPTY_MESSAGES,
  readCampaignScopeMap,
  readConversationSpaceId,
  readSessionMap,
  resolveActiveCampaignId,
  resolveDefaultNewConversationCampaignId,
  resolvePreferredCampaignWhenGeneral,
  writeSessionMap,
} from './agent-chat-panel/agent-chat-panel.logic'
import {
  runAgentChatPendingDeliverableMessage,
  runAgentChatPendingSendMessage,
  teamPendingDeliverableInFlightKeys,
  teamPendingSendInFlightKeys,
} from './agent-chat-panel/agent-chat-panel.pending-messages'
import {
  useAgentChatQueueHandlers,
  type AgentChatQueueItem,
} from './agent-chat-panel/agent-chat-panel.queue'
import { sendAgentChatMessage } from './agent-chat-panel/agent-chat-panel.send'
import { hydrateSelectedSessionMessages } from './agent-chat-panel/agent-chat-panel.session-selection'
import { AgentChatMobileCampaignPanel } from './agent-chat-panel/AgentChatMobileCampaignPanel'
import { AgentChatSetupGate } from './agent-chat-panel/AgentChatSetupGate'
import { AgentChatThread } from './agent-chat-panel/AgentChatThread'
import { AgentChatVoicePanel } from './agent-chat-panel/AgentChatVoicePanel'
import { useAgentChatCampaignController } from './agent-chat-panel/use-agent-chat-campaign-controller'
import { useAgentChatScrollController } from './agent-chat-panel/use-agent-chat-scroll-controller'
import { useAgentChatSessionLifecycle } from './agent-chat-panel/use-agent-chat-session-lifecycle'
import { filterMessagesByQuery } from './chat/ConversationSearch'
import { TeamChatHeader, TeamChatMobileThreadHeader } from './chat/TeamChatHeader'
import {
  persistConversationsSidebarExpanded,
  readConversationsSidebarExpandedDefault,
  TeamConversationsSidebar,
} from './chat/TeamConversationsSidebar'

interface AgentChatPanelProps {
  agent: MissionAgent
  modelId?: string
  /** Force new embedded chat sessions into this campaign scope. */
  initialCampaignId?: string
  initialSessionId?: string | null
  onSessionChange?: (sessionId: string | null) => void
  /** Parent-owned sidebar lists (Team 2) stay in sync when sessions are created or retitled. */
  onConversationUpdated?: (conversation: Conversation) => void
  /** Team-chrome props — optional so non-Team surfaces (Team 2, Spaces, etc.) can omit. */
  statusBadgeText?: string | null
  agentInfoOpen?: boolean
  onAgentInfoOpenChange?: (open: boolean) => void
  campaignPanelOpen?: boolean
  onCampaignPanelOpenChange?: (open: boolean) => void
  teamAgents?: MissionAgent[]
  onNavigateToConversation?: (params: {
    conversationId: string
    messageId?: string
    agentKey: string
  }) => void
  renderAgentInfoPanel?: () => React.ReactNode
  onMobileBackToTeam?: () => void
  /** Mobile conversations list: top-left returns to team roster (card view). */
  onMobileGoToTeamRoster?: () => void
  nonGeneralCampaigns?: Campaign[]
  generalCampaignId?: string
  assignedCampaigns?: Campaign[]
  onAssignAgentToCampaign?: (campaignId: string) => Promise<void>
  allCampaigns?: Campaign[]
  onCampaignsRefresh?: () => void | Promise<void>
  isMobile?: boolean
  activeConversations?: Conversation[]
  onSelectActiveConversation?: (sessionId: string) => void
  /** Hide chrome flags — Team 2 / Spaces / etc. can disable parts that conflict with their own outer chrome. Internal chat thread + composer behavior stays 1:1. */
  hideConversationsSidebar?: boolean
  hideHeader?: boolean
  hideCampaignPanel?: boolean
  /** Optional system context appended to every user-initiated send (e.g. Team 2 Edit feeds HR with target-agent context). */
  systemContext?: string
  /** External embedded surfaces can place a user-confirmable request in the composer. */
  composerSeed?: { text: string; nonce: string } | null
  composerStyle?: 'compact' | 'home'
  /**
   * Ops Desk / embedded surfaces: no empty-state hero, no spacer scroll void.
   * Composer sits under briefing; thread only grows when there are messages.
   */
  compactLayout?: boolean
  /** When true, composer send/voice/attach controls are disabled (e.g. Edit tab gate before user acknowledges edit mode). */
  composerDisabled?: boolean
  renderComposerOverlay?: () => React.ReactNode
  renderComposerTopSlot?: (ctx: AgentChatComposerScopeContext) => React.ReactNode
  renderComposerFooterAfterIntegrationsSlot?: (
    ctx: AgentChatComposerScopeContext,
  ) => React.ReactNode
  startBlankSession?: boolean
  onAgentSetupRepaired?: (agentKey: string) => void | Promise<void>
}

interface AgentChatComposerScopeContext {
  selectedSession: Conversation | null
  activeCampaignId: string | null
  activeSpaceId: string | null
  onConversationUpdated: (conversation: Conversation) => void
}

export function AgentChatPanel({
  agent,
  modelId,
  initialCampaignId,
  initialSessionId = null,
  onSessionChange,
  onConversationUpdated,
  statusBadgeText = null,
  agentInfoOpen = false,
  onAgentInfoOpenChange = () => {},
  campaignPanelOpen = false,
  onCampaignPanelOpenChange = () => {},
  teamAgents = [],
  onNavigateToConversation: _onNavigateToConversation = () => {},
  renderAgentInfoPanel = () => null,
  onMobileBackToTeam,
  onMobileGoToTeamRoster,
  nonGeneralCampaigns = [],
  generalCampaignId,
  assignedCampaigns = [],
  onAssignAgentToCampaign = async () => {},
  allCampaigns = [],
  onCampaignsRefresh = () => {},
  isMobile = false,
  activeConversations,
  onSelectActiveConversation,
  hideConversationsSidebar = false,
  hideHeader = false,
  hideCampaignPanel = false,
  systemContext,
  composerSeed = null,
  composerStyle = 'compact',
  compactLayout = false,
  composerDisabled = false,
  renderComposerOverlay,
  renderComposerTopSlot,
  renderComposerFooterAfterIntegrationsSlot,
  startBlankSession = false,
  onAgentSetupRepaired,
}: AgentChatPanelProps) {
  const isOrgContext = useOrgStore((s) => s.activeOrgId !== null)
  const [sessions, setSessions] = useState<Conversation[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [showAllOrgConversations, setShowAllOrgConversations] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const uiSelectedArtifact = useActiveArtifactSelectionSignal()
  const [creatingSession, setCreatingSession] = useState(false)
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [sessionActionsOpenId, setSessionActionsOpenId] = useState<string | null>(null)
  const [conversationsSidebarExpanded, setConversationsSidebarExpanded] = useState(true)
  const [loadedCampaignIds, setLoadedCampaignIds] = useState<Set<string>>(new Set())
  const [composerRestore, setComposerRestore] = useState<{
    text: string
    documents?: DocumentAttachment[]
    nonce: string
  } | null>(null)

  useEffect(() => {
    if (!composerSeed?.text.trim()) return
    setComposerRestore({ text: composerSeed.text, nonce: composerSeed.nonce })
  }, [composerSeed])
  const [voiceActive, setVoiceActive] = useState(false)
  const [agentFilter, setAgentFilter] = useState<Set<string>>(new Set([agent.agent_key]))
  const [searchAllSessions, setSearchAllSessions] = useState<Conversation[] | undefined>(undefined)
  const searchAllFetchedRef = useRef(false)
  const setTextRef = useRef<((text: string) => void) | null>(null)
  const composerMirrorRef = useRef('')
  const loadTokenRef = useRef(0)
  const initialSessionHydrationAttemptRef = useRef<string | null>(null)
  const pendingStrategySessionRef = useRef<string | null>(null)
  /** Campaign id (DB uuid) for “where am I in the sidebar”: follows selection + last expanded campaign header. */
  const newConversationCampaignScopeRef = useRef<string | null>(null)
  const sessionsRef = useRef<Conversation[]>([])
  const selectedSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId
  }, [selectedSessionId])

  const reportAgentChatMark = useCallback(
    (phase: string, context: Record<string, string | number | boolean | null | undefined> = {}) => {
      reportFreezeEvent('component_mark', {
        component: 'AgentChatPanel',
        phase,
        agent_key: agent.agent_key,
        ...context,
      })
    },
    [agent.agent_key],
  )

  useLayoutEffect(() => {
    setConversationsSidebarExpanded(readConversationsSidebarExpandedDefault())
  }, [])

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) setCurrentUserId(user.id)
      })
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    const hasPeer = sessions.some((s) => s.user_id != null && s.user_id !== currentUserId)
    if (!hasPeer) setShowAllOrgConversations(true)
  }, [sessions, currentUserId])

  useEffect(() => {
    initStreamResilience()
  }, [])

  const handleConversationsSidebarExpandedChange = useCallback((next: boolean) => {
    setConversationsSidebarExpanded(next)
    persistConversationsSidebarExpanded(next)
  }, [])

  const allMessages = useChatStore((s) =>
    selectedSessionId
      ? (s.messagesByConversation[selectedSessionId] ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES,
  )
  const messages = useMemo(() => {
    if (allMessages.length === 0) return allMessages
    const visible = allMessages.filter((m) => {
      const meta = m.metadata as Record<string, unknown> | undefined
      if (meta?.hidden) return false
      if (meta?.delegation_task) return false
      return true
    })
    return visible.length === allMessages.length ? allMessages : visible
  }, [allMessages])
  const voiceDelegationMessages = useMemo(
    () =>
      allMessages.filter(
        (m) => (m.metadata as Record<string, unknown> | undefined)?.delegation_task,
      ),
    [allMessages],
  )
  const isStreaming = useChatStore((s) =>
    selectedSessionId ? s.streamingConversationIds.includes(selectedSessionId) : false,
  )
  const isStopping = useChatStore((s) =>
    selectedSessionId ? s.stoppingConversationIds.includes(selectedSessionId) : false,
  )
  const creditsLow = useChatStore((s) => s.creditsLow)
  const creditsLowRemaining = useChatStore((s) => s.creditsLowRemaining)
  const creditsExhausted = useChatStore((s) => s.creditsExhausted)
  const streamingMessageId = useChatStore((s) =>
    selectedSessionId ? (s.streamingMessageIdsByConversation[selectedSessionId] ?? null) : null,
  )
  const queue = useChatStore((s) =>
    selectedSessionId
      ? (s.messageQueueByConversation[selectedSessionId] ?? EMPTY_QUEUE)
      : EMPTY_QUEUE,
  )
  const enqueueMessage = useChatStore((s) => s.enqueueMessage)
  const dequeueMessage = useChatStore((s) => s.dequeueMessage)
  const removeQueueItem = useChatStore((s) => s.removeQueueItem)
  const updateQueueItem = useChatStore((s) => s.updateQueueItem)

  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileNavScreen, setMobileNavScreen] = useState<'conversations' | 'thread'>(() =>
    initialSessionId ? 'thread' : 'conversations',
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [knownSkillKeys, setKnownSkillKeys] = useState<Set<string>>(new Set())
  const displayMessages = useMemo(
    () => filterMessagesByQuery(messages, searchQuery),
    [messages, searchQuery],
  )

  const {
    scrollRef,
    contentRef,
    lastUserPromptRef,
    spacerHeight,
    lastUserPromptHeight,
    userHasScrolledUp,
    setHasOlder,
    setUserHasScrolledUp,
    handleScroll,
    handleScrollToBottom,
  } = useAgentChatScrollController({
    selectedSessionId,
    messages,
    isMobile,
    mobileNavScreen,
    initializing,
    sessionsLoading,
    conversationAnchorRef: initialSessionHydrationAttemptRef,
    fetchMessagesForSession: (conversationId, options) => fetchMessages(conversationId, options),
    setMessages: (conversationId, nextMessages) => {
      useChatStore.getState().setMessages(conversationId, nextMessages)
    },
  })

  useEffect(() => {
    // Same key ChatInput's slash menu uses — TTL reuse instead of a raw
    // duplicate fetch per mount/remount.
    cachedFetch(
      `agent-skills:${agent.agent_key}`,
      () =>
        backendGet<{ id: string; skill_key: string }[]>(`/api/agents/${agent.agent_key}/skills`),
      { ttlMs: 300_000 },
    )
      .then((skills) => {
        if (Array.isArray(skills)) setKnownSkillKeys(new Set(skills.map((s) => s.skill_key)))
      })
      .catch(() => null)
  }, [agent.agent_key])

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null
  /** DB may omit campaign_id on older General threads; UI buckets those under General like the sidebar. */
  const activeCampaignId = useMemo(
    () => resolveActiveCampaignId(selectedSession, generalCampaignId) ?? initialCampaignId ?? null,
    [selectedSession, generalCampaignId, initialCampaignId],
  )
  const activeSpaceId = useMemo(() => readConversationSpaceId(selectedSession), [selectedSession])

  const handleConversationUpdated = useCallback((conversation: Conversation) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === conversation.id ? { ...session, ...conversation } : session,
      ),
    )
    useChatStore.getState().updateConversation(conversation.id, conversation)
  }, [])

  const composerScopeContext = useMemo<AgentChatComposerScopeContext>(
    () => ({
      selectedSession,
      activeCampaignId,
      activeSpaceId,
      onConversationUpdated: handleConversationUpdated,
    }),
    [selectedSession, activeCampaignId, activeSpaceId, handleConversationUpdated],
  )

  const { setActiveCampaign, isPanelMinimized, expandPanel, activeCampaignName } = useCampaignMode()

  const persistSessionSelection = useCallback(
    (sessionId: string | null) => {
      if (!agent.agent_key) return
      const current = readSessionMap()
      if (!sessionId) {
        if (!current[agent.agent_key]) return
        delete current[agent.agent_key]
        writeSessionMap(current)
        return
      }
      current[agent.agent_key] = sessionId
      writeSessionMap(current)
    },
    [agent.agent_key],
  )

  const selectSession = useCallback(
    async (sessionId: string, hydrate = true) => {
      if (!selectedSessionIdRef.current) {
        const store = useChatStore.getState()
        const pendingDraft = store.composerDraftByContext['new']
        if (pendingDraft?.trim()) {
          store.setComposerDraft(sessionId, pendingDraft)
          store.clearComposerDraft('new')
        }
      }
      setSelectedSessionId(sessionId)
      setHasOlder(true)
      setUserHasScrolledUp(false)
      useChatStore.getState().setActiveConversationId(sessionId)
      persistSessionSelection(sessionId)
      onSessionChange?.(sessionId)
      if (isMobile) setMobileNavScreen('thread')
      const title = sessions.find((s) => s.id === sessionId)?.title?.trim() || 'New Session'
      window.dispatchEvent(new CustomEvent('mobile-team-session-title', { detail: title }))

      if (!hydrate) return

      if (isStreamActive(sessionId)) {
        setInitializing(false)
        return
      }

      const store = useChatStore.getState()
      const cached = store.messagesByConversation[sessionId]
      const debugStartedAt = performance.now()
      reportAgentChatMark('select_session_start', {
        hydrate,
        has_cached_messages: (cached?.length ?? 0) > 0,
      })
      if (cached && cached.length > 0 && store.streamingConversationIds.includes(sessionId)) {
        setInitializing(false)
        return
      }

      const loadToken = ++loadTokenRef.current
      setInitializing(true)
      try {
        await hydrateSelectedSessionMessages({
          sessionId,
          cachedMessages: cached,
          loadToken,
          getCurrentLoadToken: () => loadTokenRef.current,
          fetchMessagesForSession: (targetSessionId, options) =>
            fetchMessages(targetSessionId, options),
          isStreamActiveForSession: isStreamActive,
          mergeMessages: mergeMessagesPreservingOrderedBlocks,
          getLocalMessages: (targetSessionId) =>
            useChatStore.getState().messagesByConversation[targetSessionId] ?? [],
          setMessages: (targetSessionId, nextMessages) =>
            useChatStore.getState().setMessages(targetSessionId, nextMessages),
          setHasOlder,
          needsRecovery: needsStreamRecovery,
          recover: (targetSessionId) => void recoverConversation(targetSessionId),
          reportEnd: (payload) =>
            reportAgentChatMark('select_session_messages_end', {
              ...payload,
              duration_ms: performance.now() - debugStartedAt,
            }),
        })
      } catch (error: unknown) {
        if (loadToken !== loadTokenRef.current) return
        reportAgentChatMark('select_session_messages_error', {
          duration_ms: performance.now() - debugStartedAt,
          message: error instanceof Error ? error.message : String(error),
        })
        if (!isStreamActive(sessionId)) {
          useChatStore.getState().setMessages(sessionId, [])
        }
        setHasOlder(false)
      } finally {
        setInitializing(false)
      }
    },
    [isMobile, onSessionChange, persistSessionSelection, reportAgentChatMark],
  )

  const selectSessionRef = useRef(selectSession)
  selectSessionRef.current = selectSession

  const {
    sessionTitleTypewriter,
    cancelTeamDraftTimer,
    clearSessionTitleReveal,
    beginSessionTitleReveal,
  } = useAgentChatSessionLifecycle({
    sessions,
    selectedSessionId,
    fetchMessagesForSession: (conversationId, options) => fetchMessages(conversationId, options),
    deleteConversationById: deleteConversation,
    removeConversation: (conversationId) => {
      useChatStore.getState().removeConversation(conversationId)
    },
    setSessions,
    setSelectedSessionId,
    setActiveConversationId: (sessionId) => {
      useChatStore.getState().setActiveConversationId(sessionId)
    },
    selectSession: (sessionId, hydrate) => selectSessionRef.current(sessionId, hydrate),
    renameConversationById: renameConversation,
    updateConversation: (conversationId, updates) => {
      useChatStore.getState().updateConversation(conversationId, updates)
    },
    getConversation: (conversationId) =>
      useChatStore
        .getState()
        .conversations.find((conversation) => conversation.id === conversationId),
    onConversationUpdated,
  })

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ conversation: Conversation }>
      const c = ev.detail?.conversation
      if (!c?.id) return
      if (c.agent_id && c.agent_id !== agent.agent_key) return
      setSessions((prev) => [c, ...prev.filter((item) => item.id !== c.id)])
      void selectSessionRef.current(c.id)
    }
    window.addEventListener('vibey:conversation-forked', handler)
    return () => window.removeEventListener('vibey:conversation-forked', handler)
  }, [agent.agent_key])

  const createAndSelectSession = useCallback(
    async (
      campaignIdOverride?: string | null,
      composerCarry?: { seedComposerText: string; fromSessionId: string | null },
    ) => {
      const conversation = await createNewConversation({
        title: `Chat with ${agent.name}`,
        agent_id: agent.agent_key,
        campaign_id: campaignIdOverride || undefined,
        draft: true,
      })
      setSessions((prev) => [conversation, ...prev.filter((item) => item.id !== conversation.id)])
      const store = useChatStore.getState()
      store.addConversation(conversation)
      store.setMessages(conversation.id, [])
      onConversationUpdated?.(conversation)
      const carry = composerCarry?.seedComposerText
      if (carry !== undefined && carry.trim()) {
        store.setComposerDraft(conversation.id, carry)
        const from = composerCarry?.fromSessionId
        if (from) store.setComposerDraft(from, carry)
      }
      await selectSession(conversation.id, true)
      return conversation
    },
    [agent.agent_key, agent.name, onConversationUpdated, selectSession],
  )

  const loadCampaignConversations = useCallback(
    async (campaignId: string) => {
      const resolvedId = campaignId === '__general__' ? generalCampaignId : campaignId
      if (!resolvedId) return
      if (loadedCampaignIds.has(resolvedId)) return
      const convos = await fetchConversations(resolvedId, agent.agent_key)
      convos.forEach((c) => useChatStore.getState().addConversation(c))
      setSessions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id))
        const fresh = convos.filter((c) => !existingIds.has(c.id))
        if (fresh.length === 0) return prev
        return [...prev, ...fresh].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
      })
      setLoadedCampaignIds((prev) => new Set(prev).add(resolvedId))
    },
    [agent.agent_key, generalCampaignId, loadedCampaignIds],
  )

  const handleAgentFilterChange = useCallback(
    async (keys: Set<string>) => {
      setAgentFilter(keys)
      const isAll = keys.size === 0
      const isSingleCurrent = keys.size === 1 && keys.has(agent.agent_key)
      if (isSingleCurrent) {
        const convos = await fetchConversations(undefined, agent.agent_key)
        setSessions(convos)
        return
      }
      if (isAll) {
        const convos = await fetchConversations(undefined, undefined)
        setSessions(convos)
        return
      }
      const results = await Promise.all([...keys].map((k) => fetchConversations(undefined, k)))
      const merged = new Map<string, Conversation>()
      for (const batch of results) {
        for (const c of batch) merged.set(c.id, c)
      }
      const sorted = [...merged.values()].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
      setSessions(sorted)
    },
    [agent.agent_key],
  )

  const handleSidebarSearchChange = useCallback((query: string) => {
    if (!query.trim()) return
    if (searchAllFetchedRef.current) return
    searchAllFetchedRef.current = true
    void fetchConversations(undefined, undefined).then((all) => {
      setSearchAllSessions(all)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const debugStartedAt = performance.now()
    reportAgentChatMark('initial_load_start', {
      has_initial_session: initialSessionId != null,
      mobile: isMobile,
      start_blank: startBlankSession,
    })
    initialSessionHydrationAttemptRef.current = null
    setSessionsLoading(true)
    setInitializing(true)
    setSessions([])
    setSelectedSessionId(null)
    setHasOlder(true)
    setUserHasScrolledUp(false)
    setLoadedCampaignIds(new Set())
    setAgentFilter(new Set([agent.agent_key]))
    setSearchAllSessions(undefined)
    searchAllFetchedRef.current = false
    ;(async () => {
      await runAgentChatInitialLoad({
        agentKey: agent.agent_key,
        initialSessionId,
        isMobile,
        startBlankSession,
        generalCampaignId,
        readPersistedSessionId: () => readSessionMap()[agent.agent_key] ?? null,
        readCachedCampaignId: () => readCampaignScopeMap()[agent.agent_key] ?? null,
        cachedFetchConversations: cachedFetch,
        fetchConversationsForAgent: fetchConversations,
        fetchMessagesForSession: fetchMessages,
        getCachedConversations: () => useChatStore.getState().conversations,
        addConversation: (session) => {
          useChatStore.getState().addConversation(session)
        },
        setLoadedCampaignIds,
        persistSessionSelection,
        setSessions,
        setSessionsLoading,
        setInitializing,
        setSelectedSessionId,
        setActiveConversationId: (sessionId) => {
          useChatStore.getState().setActiveConversationId(sessionId)
        },
        onSessionChange: (sessionId) => onSessionChange?.(sessionId),
        dispatchMobileSessionTitle: (title) => {
          window.dispatchEvent(new CustomEvent('mobile-team-session-title', { detail: title }))
        },
        setMessages: (sessionId, messages) => {
          useChatStore.getState().setMessages(sessionId, messages)
        },
        setHasOlder,
        getNewComposerDraft: () => useChatStore.getState().composerDraftByContext['new'],
        setComposerDraft: (sessionId, draft) => {
          useChatStore.getState().setComposerDraft(sessionId, draft)
        },
        clearNewComposerDraft: () => {
          useChatStore.getState().clearComposerDraft('new')
        },
        getPendingStrategySessionId: () => pendingStrategySessionRef.current,
        isStreamActiveForSession: isStreamActive,
        needsRecovery: needsStreamRecovery,
        recover: (sessionId) => {
          void recoverConversation(sessionId)
        },
        selectSession,
        reportMark: reportAgentChatMark,
        getDurationMs: () => performance.now() - debugStartedAt,
        isCancelled: () => cancelled,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [agent.agent_key]) // remount via parent key when a blank draft is requested

  useEffect(() => {
    if (!initialSessionId) return
    if (initialSessionId === selectedSessionId) return
    if (pendingStrategySessionRef.current) return
    const runSelect = selectSessionRef.current
    if (sessions.some((session) => session.id === initialSessionId)) {
      void runSelect(initialSessionId, true)
      return
    }

    const attemptKey = `${agent.agent_key}:${initialSessionId}`
    if (initialSessionHydrationAttemptRef.current === attemptKey) return
    initialSessionHydrationAttemptRef.current = attemptKey

    let cancelled = false
    void runAgentChatInitialSessionSyncRetry({
      agentKey: agent.agent_key,
      initialSessionId,
      knownSessionsCount: sessions.length,
      fetchConversationsForAgent: (targetAgentKey) => fetchConversations(undefined, targetAgentKey),
      setSessions,
      selectSession: (sessionId, hydrate) => selectSessionRef.current(sessionId, hydrate),
      reportMark: reportAgentChatMark,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      isCancelled: () => cancelled,
    })

    return () => {
      cancelled = true
    }
  }, [agent.agent_key, initialSessionId, reportAgentChatMark, selectedSessionId, sessions])

  // Group messages into turns (User + following responses)
  const turnData = useMemo(() => buildAgentChatTurnData(displayMessages), [displayMessages])
  const pinnedAssistantMessageId = useMemo(
    () => resolvePinnedAssistantMessageId(displayMessages),
    [displayMessages],
  )

  const sendTeamMessage = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      modelOverride?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      await sendAgentChatMessage({
        content,
        documents,
        artifacts,
        modelOverride,
        references,
        modelSettings,
        selectedSessionId,
        isStopping,
        activeCampaignId,
        selectedSession,
        modelId,
        agentKey: agent.agent_key,
        systemContext,
        uiSelectedArtifact,
        getNewConversationCampaignScope: () => newConversationCampaignScopeRef.current,
        getPreferredCampaignWhenGeneral: () =>
          resolvePreferredCampaignWhenGeneral({
            activeCampaignId,
            assignedCampaigns,
            generalCampaignId,
          }),
        createAndSelectSession: (campaignId) =>
          createAndSelectSession(campaignId ?? initialCampaignId ?? undefined),
        getSessions: () => sessionsRef.current,
        getMessages: (conversationId) =>
          useChatStore.getState().messagesByConversation[conversationId] ?? [],
        setSessions,
        promoteConversation: (conversationId) => {
          useChatStore.getState().promoteConversation(conversationId)
        },
        onConversationUpdated: (conversation) => onConversationUpdated?.(conversation),
        sendMessageStreaming,
        cancelTeamDraftTimer,
        clearConversationTeamDraft,
        getStoredConversation: (conversationId) =>
          useChatStore
            .getState()
            .conversations.find((conversation) => conversation.id === conversationId),
        fetchConversationsForAgent: (targetAgentKey) =>
          fetchConversations(undefined, targetAgentKey),
        suggestConversationTitle,
        beginSessionTitleReveal,
        readConversationSpaceId,
        nowIso: () => new Date().toISOString(),
      })
    },
    [
      selectedSessionId,
      isStopping,
      createAndSelectSession,
      beginSessionTitleReveal,
      modelId,
      agent.agent_key,
      activeCampaignId,
      assignedCampaigns,
      generalCampaignId,
      initialCampaignId,
      selectedSession,
      cancelTeamDraftTimer,
      systemContext,
      uiSelectedArtifact,
      onConversationUpdated,
    ],
  )

  const sendWithToast = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      modelOverride?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      try {
        await sendTeamMessage(
          content,
          documents,
          artifacts,
          modelOverride,
          references,
          modelSettings,
        )
      } catch (err) {
        if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
          useChatStore.getState().setCreditsExhausted(true)
          return
        }
        reportTeamError('send_message_failed', err, { agentKey: agent.agent_key })
        setComposerRestore({ text: content, documents, nonce: crypto.randomUUID() })
        toast.error(toastMessageForChatSendError(err))
      }
    },
    [sendTeamMessage],
  )

  const handleSend = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      modelOverride?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      void sendWithToast(content, documents, artifacts, modelOverride, references, modelSettings)
    },
    [sendWithToast],
  )

  const getQueuedItems = useCallback(
    (conversationId: string) =>
      useChatStore.getState().messageQueueByConversation[conversationId] ?? EMPTY_QUEUE,
    [],
  )
  const requestStopStreamForSession = useCallback((conversationId: string) => {
    void requestStopStream(conversationId)
  }, [])
  const setComposerText = useCallback((text: string) => {
    setTextRef.current?.(text)
  }, [])
  const createQueueItemId = useCallback(() => crypto.randomUUID(), [])
  const waitForQueueDrain = useCallback(
    (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    [],
  )
  const {
    editingQueueItemId,
    handleEnqueue,
    handleQueueSendNow,
    handleQueueSendNowNext,
    handleQueueRemove,
    handleQueueEdit,
    handleComposerSendWithQueueEdit,
  } = useAgentChatQueueHandlers({
    selectedSessionId,
    isStreaming,
    isStopping,
    queueLength: queue.length,
    enqueueMessage,
    dequeueMessage,
    removeQueueItem,
    updateQueueItem,
    getQueuedItems,
    requestStopStreamForSession,
    sendWithToast,
    handleSend,
    setComposerText,
    createId: createQueueItemId,
    wait: waitForQueueDrain,
  })

  const handleStop = useCallback(() => {
    if (selectedSessionId) void requestStopStream(selectedSessionId)
  }, [selectedSessionId])

  const lastUserMessageId = (() => {
    if (isStreaming || isStopping) return null
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') return messages[i]!.id
    }
    return null
  })()

  const handleEditSubmit = useCallback(
    async (
      newContent: string,
      documents?: DocumentAttachment[],
      model?: string,
      modelSettings?: ChatModelSettings,
    ) => {
      if (!selectedSessionId || !lastUserMessageId) return

      try {
        const backendMessages = await fetchMessages(selectedSessionId)
        let backendLastUserIndex = -1
        for (let i = backendMessages.length - 1; i >= 0; i--) {
          if (backendMessages[i]?.role === 'user') {
            backendLastUserIndex = i
            break
          }
        }
        if (backendLastUserIndex === -1) return
        const backendLastUser = backendMessages[backendLastUserIndex]
        if (!backendLastUser) return

        await deleteMessagesFrom(selectedSessionId, backendLastUser.id)
        useChatStore
          .getState()
          .setMessages(selectedSessionId, backendMessages.slice(0, backendLastUserIndex))

        await sendMessageStreaming({
          conversation_id: selectedSessionId,
          content: newContent,
          model: model || modelId || undefined,
          documents,
          model_settings: modelSettings,
          campaign_id: activeCampaignId || undefined,
          space_id: activeSpaceId ?? null,
          scope_kind: activeSpaceId ? (activeCampaignId ? 'campaign' : 'personal') : undefined,
          ui_selected_artifact: uiSelectedArtifact ?? undefined,
          system_context: systemContext,
        })
      } catch (err) {
        console.error('Edit submit failed:', err)
        toast.error(CHAT_TOAST_ERRORS.CHAT_RESEND_FAILED.userMessage)
      }
    },
    [
      selectedSessionId,
      lastUserMessageId,
      modelId,
      activeCampaignId,
      activeSpaceId,
      systemContext,
      uiSelectedArtifact,
    ],
  )

  const startLocalDraftSession = useCallback(
    (campaignIdOverride?: string | null) => {
      const scope = campaignIdOverride ?? activeCampaignId ?? null
      newConversationCampaignScopeRef.current = scope
      setSelectedSessionId(null)
      setHasOlder(true)
      setUserHasScrolledUp(false)
      setInitializing(false)
      useChatStore.getState().setActiveConversationId(null)
      persistSessionSelection(null)
      onSessionChange?.(null)
      if (isMobile) setMobileNavScreen('thread')
    },
    [activeCampaignId, isMobile, onSessionChange, persistSessionSelection],
  )

  const {
    campaignModelStrategy,
    mobileCampaignSettingsOpen,
    mobileCampaignSubScreen,
    mobilePreviewInfo,
    mobileCampaignPickerOpen,
    mobileCampaignSwitcherOptions,
    setMobileCampaignSettingsOpen,
    setMobileCampaignSubScreen,
    setMobilePreviewInfo,
    setMobileCampaignPickerOpen,
    handleAgentHeaderClick,
    handleCampaignHeaderClick,
    handleSelectCampaignFromMobilePicker,
    handleCampaignPanelToggle,
  } = useAgentChatCampaignController({
    agentKey: agent.agent_key,
    selectedSession,
    activeCampaignId,
    generalCampaignId,
    assignedCampaigns,
    nonGeneralCampaigns,
    sessions,
    isMobile,
    campaignPanelOpen,
    hideCampaignPanel,
    isPanelMinimized,
    newConversationCampaignScopeRef,
    setActiveCampaign,
    expandPanel,
    onAgentInfoOpenChange,
    onCampaignPanelOpenChange,
    selectSession,
    startLocalDraftSession,
  })

  const handleCreateSession = useCallback(async () => {
    if (creatingSession) return
    setCreatingSession(true)
    try {
      const scope =
        newConversationCampaignScopeRef.current ??
        resolveDefaultNewConversationCampaignId({
          assignedCampaigns,
          cachedCampaignId: null,
          generalCampaignId,
        }) ??
        activeCampaignId ??
        undefined
      startLocalDraftSession(scope ?? null)
    } finally {
      setCreatingSession(false)
    }
  }, [
    creatingSession,
    activeCampaignId,
    assignedCampaigns,
    generalCampaignId,
    startLocalDraftSession,
  ])

  const startRenameSession = useCallback((session: Conversation) => {
    setRenamingSessionId(session.id)
    setRenameValue(session.title?.trim() || '')
  }, [])

  const submitRenameSession = useCallback(async () => {
    if (!renamingSessionId) return
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setRenamingSessionId(null)
      setRenameValue('')
      return
    }
    await renameConversation(renamingSessionId, trimmed)
    setSessions((prev) =>
      prev.map((session) =>
        session.id === renamingSessionId ? { ...session, title: trimmed } : session,
      ),
    )
    useChatStore.getState().updateConversation(renamingSessionId, { title: trimmed })
    setRenamingSessionId(null)
    setRenameValue('')
  }, [renameValue, renamingSessionId])

  const cancelRenameSession = useCallback(() => {
    setRenamingSessionId(null)
    setRenameValue('')
  }, [])

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (deletingSessionId) return
      setDeletingSessionId(sessionId)
      try {
        await deleteConversation(sessionId)
        useChatStore.getState().removeConversation(sessionId)

        clearSessionTitleReveal(sessionId)

        const remainingSessions = sessions.filter((session) => session.id !== sessionId)
        setSessions(remainingSessions)

        if (selectedSessionId === sessionId) {
          if (remainingSessions[0]) {
            await selectSession(remainingSessions[0].id, true)
          } else {
            setSelectedSessionId(null)
            useChatStore.getState().setActiveConversationId(null)
            persistSessionSelection(null)
            onSessionChange?.(null)
          }
        }
      } finally {
        setDeletingSessionId(null)
      }
    },
    [
      deletingSessionId,
      clearSessionTitleReveal,
      onSessionChange,
      persistSessionSelection,
      selectSession,
      selectedSessionId,
      sessions,
    ],
  )

  const handleBuyMoreCredits = useCallback(() => {
    const event = new CustomEvent('open-account-settings', { detail: 'billing' })
    window.dispatchEvent(event)
  }, [])

  const handleBuyMoreCreditsAfterExhaustion = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-credit-purchase'))
    useChatStore.getState().setCreditsExhausted(false)
  }, [])

  const handleUpgradePlan = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-account-settings', { detail: 'billing' }))
    useChatStore.getState().setCreditsExhausted(false)
  }, [])

  useEffect(() => {
    const onScrollTo = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (!id) return
      const root = scrollRef.current
      if (!root) return
      const el = root.querySelector(`[data-message-id="${id}"]`)
      el?.scrollIntoView({ block: 'center' })
    }
    window.addEventListener('team-scroll-to-message', onScrollTo)
    return () => window.removeEventListener('team-scroll-to-message', onScrollTo)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    void runAgentChatPendingSendMessage({
      agentKey: agent.agent_key,
      storageKey: getOrgScopedKey('team-pending-send-message'),
      storage: sessionStorage,
      inFlightKeys: teamPendingSendInFlightKeys,
      sessionsLoading,
      initializing,
      isStopping,
      activeCampaignId,
      getNewConversationCampaignScope: () => newConversationCampaignScopeRef.current,
      setNewConversationCampaignScope: (campaignId) => {
        newConversationCampaignScopeRef.current = campaignId
      },
      setActiveCampaign,
      createAndSelectSession: (campaignId) => createAndSelectSession(campaignId ?? undefined),
      setPendingStrategySessionId: (sessionId) => {
        pendingStrategySessionRef.current = sessionId
      },
      sendMessageStreaming,
      fetchConversationsForAgent: (targetAgentKey) => fetchConversations(undefined, targetAgentKey),
      setSessions,
      setSelectedSessionId,
      onSessionChange: (sessionId) => onSessionChange?.(sessionId),
      sendWithToast,
    })
  }, [
    agent.agent_key,
    sendWithToast,
    sessionsLoading,
    initializing,
    isStopping,
    setActiveCampaign,
    activeCampaignId,
    createAndSelectSession,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    void runAgentChatPendingDeliverableMessage({
      agentKey: agent.agent_key,
      storageKey: getOrgScopedKey('team-pending-deliverable-message'),
      storage: localStorage,
      inFlightKeys: teamPendingDeliverableInFlightKeys,
      sessionsLoading,
      initializing,
      isStopping,
      sendWithToast,
    })
  }, [agent.agent_key, sendWithToast, sessionsLoading, initializing, isStopping])

  const currentSessionTitle =
    sessionTitleTypewriter?.conversationId === selectedSessionId
      ? sessionTitleTypewriter.text
      : selectedSession?.title?.trim() || 'New conversation'

  const {
    chatWidthPercent,
    isDragging,
    containerRef: resizeContainerRef,
    handleMouseDown: handleResizeMouseDown,
  } = usePanelResize()

  const composerTopSlot = renderComposerTopSlot?.(composerScopeContext) ?? null
  const composerOverlay = renderComposerOverlay?.() ?? null
  const composerFooterAfterIntegrationsSlot =
    renderComposerFooterAfterIntegrationsSlot?.(composerScopeContext) ?? null
  const homeComposerStyle = composerStyle === 'home'
  /** Team 2 agent detail: outer chrome hidden — match HR/Spaces thread + composer inset. */
  const teamEmbeddedChrome = hideConversationsSidebar && hideHeader
  const threadHorizontalPad = teamEmbeddedChrome ? 'px-3 md:px-4' : 'px-4 md:px-8'
  const composerFooterClass = teamEmbeddedChrome
    ? 'relative flex shrink-0 flex-col items-center px-3 pb-3 pt-2 md:px-4'
    : 'relative flex shrink-0 flex-col items-center px-4 pb-4 pt-2 md:px-8'
  const composerInput = (
    <ChatInput
      onSend={handleComposerSendWithQueueEdit}
      defaultModel={modelId ?? null}
      campaignModelStrategy={campaignModelStrategy}
      disabled={creditsExhausted || isStopping || composerDisabled}
      creditsExhausted={creditsExhausted}
      isStreaming={isStreaming}
      onStop={handleStop}
      conversationId={selectedSessionId}
      setTextRef={setTextRef}
      composerMirrorRef={composerMirrorRef}
      onEnqueue={editingQueueItemId ? undefined : handleEnqueue}
      onSendNow={handleQueueSendNowNext}
      queueLength={queue.length}
      placeholder={`Message ${agent.name}...`}
      initialValue={composerRestore?.text}
      initialDocuments={composerRestore?.documents}
      restoreNonce={composerRestore?.nonce}
      campaignId={activeCampaignId || undefined}
      compact={!homeComposerStyle}
      wrapperClass={homeComposerStyle ? 'bg-transparent border-0 p-0 overflow-visible' : undefined}
      composerFooterAfterIntegrationsSlot={composerFooterAfterIntegrationsSlot}
      onVoiceStart={() => setVoiceActive(true)}
      agentKey={agent.agent_key}
    />
  )

  const leadingSlot = onMobileBackToTeam ? (
    <button
      type="button"
      onClick={() => {
        onCampaignPanelOpenChange(false)
        onMobileBackToTeam()
      }}
      className="chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg md:hidden"
      aria-label="Back"
    >
      <span className="body-2 leading-none">←</span>
    </button>
  ) : null

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden',
        compactLayout ? 'w-full' : 'surface-bg h-full min-h-0 flex-1 flex-row',
      )}
    >
      {!hideConversationsSidebar && !compactLayout && (
        <div
          className={cn(
            'flex h-full min-h-0 shrink-0 flex-col',
            isMobile &&
              'absolute inset-0 z-20 w-full max-w-full bg-[var(--color-background)] transition-transform duration-300 ease-in-out',
            isMobile && mobileNavScreen === 'thread' && '-translate-x-full',
            isMobile && mobileNavScreen === 'conversations' && 'translate-x-0',
          )}
          style={isMobile ? undefined : { paddingTop: 60, paddingBottom: 60 }}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <TeamConversationsSidebar
              expanded={conversationsSidebarExpanded}
              onExpandedChange={handleConversationsSidebarExpandedChange}
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              sessionsLoading={sessionsLoading}
              creatingSession={creatingSession}
              onSelectConversation={(id) => void selectSession(id, true)}
              onNewConversation={() => void handleCreateSession()}
              renamingSessionId={renamingSessionId}
              renameValue={renameValue}
              onRenameValueChange={setRenameValue}
              onSubmitRename={() => void submitRenameSession()}
              onCancelRename={cancelRenameSession}
              onStartRename={startRenameSession}
              deletingSessionId={deletingSessionId}
              sessionActionsOpenId={sessionActionsOpenId}
              onSessionActionsOpenIdChange={setSessionActionsOpenId}
              onDeleteSession={(id) => void handleDeleteSession(id)}
              campaigns={nonGeneralCampaigns}
              assignedCampaigns={assignedCampaigns}
              allCampaigns={allCampaigns}
              generalCampaignId={generalCampaignId}
              onCampaignsRefresh={onCampaignsRefresh}
              agentName={agent.name}
              agentKey={agent.agent_key}
              onCampaignHeaderClick={handleCampaignHeaderClick}
              onCampaignExpand={(key) => void loadCampaignConversations(key)}
              onAssignAgentToCampaign={onAssignAgentToCampaign}
              sessionTitleTypewriter={sessionTitleTypewriter}
              showAllOrgConversations={showAllOrgConversations}
              onShowAllOrgConversationsChange={
                isOrgContext ? setShowAllOrgConversations : undefined
              }
              currentUserId={currentUserId}
              teamAgents={teamAgents}
              agentFilter={agentFilter}
              onAgentFilterChange={handleAgentFilterChange}
              searchAllSessions={searchAllSessions}
              onSearchQueryChange={handleSidebarSearchChange}
              onNewConversationInCampaign={async (campaignId) => {
                if (creatingSession) return
                setCreatingSession(true)
                try {
                  startLocalDraftSession(campaignId)
                } finally {
                  setCreatingSession(false)
                }
              }}
              mobilePageLayout={isMobile}
              onMobileGoToTeamRoster={isMobile ? onMobileGoToTeamRoster : undefined}
              activeConversations={activeConversations}
              onSelectActiveConversation={onSelectActiveConversation}
            />
          </div>
        </div>
      )}
      <div
        ref={resizeContainerRef}
        className={cn(
          'flex min-h-0 min-w-0 overflow-hidden',
          compactLayout ? 'w-full flex-col' : 'flex-1',
          !compactLayout && (isMobile ? 'absolute inset-0 z-10 flex-col' : 'flex-row'),
          !compactLayout &&
            isMobile &&
            'bg-[var(--color-background)] transition-transform duration-300 ease-in-out',
          !compactLayout && isMobile && mobileNavScreen === 'conversations' && 'translate-x-full',
          !compactLayout && isMobile && mobileNavScreen === 'thread' && 'translate-x-0',
        )}
      >
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-col overflow-hidden',
            isDragging || compactLayout ? '' : 'transition-all duration-300 ease-in-out',
            compactLayout || isMobile || !campaignPanelOpen ? 'flex-1' : '',
            compactLayout && messages.length === 0 ? 'flex-none' : '',
          )}
          style={
            !compactLayout && !isMobile && campaignPanelOpen
              ? { width: `${chatWidthPercent}%`, minWidth: '300px' }
              : undefined
          }
        >
          <AgentChatSetupGate agent={agent} onAgentSetupRepaired={onAgentSetupRepaired}>
            <>
              {!hideHeader &&
                (isMobile ? (
                  <TeamChatMobileThreadHeader
                    agent={agent}
                    sessionTitle={currentSessionTitle}
                    onOpenConversations={() => setMobileNavScreen('conversations')}
                    onAgentTitleClick={handleAgentHeaderClick}
                    searchOpen={searchOpen}
                    onSearchOpenChange={setSearchOpen}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    activeCampaignId={activeCampaignId}
                    campaignPanelOpen={campaignPanelOpen}
                    onCampaignPanelToggle={handleCampaignPanelToggle}
                  />
                ) : (
                  <TeamChatHeader
                    leadingSlot={leadingSlot}
                    agent={agent}
                    statusBadgeText={statusBadgeText}
                    sessionMetadata={
                      selectedSession?.metadata as Record<string, unknown> | null | undefined
                    }
                    sessionTitle={currentSessionTitle}
                    onAgentHeaderClick={handleAgentHeaderClick}
                    campaignPanelOpen={campaignPanelOpen}
                    onCampaignPanelToggle={handleCampaignPanelToggle}
                    searchOpen={searchOpen}
                    onSearchOpenChange={setSearchOpen}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    activeCampaignId={activeCampaignId}
                  />
                ))}

              {voiceActive ? (
                <AgentChatVoicePanel
                  agent={agent}
                  conversationId={selectedSessionId}
                  onEnd={() => setVoiceActive(false)}
                />
              ) : (
                <AgentChatThread
                  initializing={initializing}
                  selectedSession={selectedSession}
                  selectedSessionId={selectedSessionId}
                  messages={messages}
                  voiceDelegationMessages={voiceDelegationMessages}
                  turnData={turnData}
                  pinnedAssistantMessageId={pinnedAssistantMessageId}
                  streamingMessageId={streamingMessageId}
                  lastUserMessageId={lastUserMessageId}
                  knownSkillKeys={knownSkillKeys}
                  agentKey={agent.agent_key}
                  activeCampaignId={activeCampaignId}
                  scrollRef={scrollRef}
                  contentRef={contentRef}
                  lastUserPromptRef={lastUserPromptRef}
                  spacerHeight={compactLayout ? 0 : spacerHeight}
                  lastUserPromptHeight={lastUserPromptHeight}
                  threadHorizontalPad={threadHorizontalPad}
                  composerFooterClass={composerFooterClass}
                  userHasScrolledUp={userHasScrolledUp}
                  creditsLow={creditsLow}
                  creditsLowRemaining={creditsLowRemaining}
                  creditsExhausted={creditsExhausted}
                  queue={queue}
                  composerTopSlot={composerTopSlot}
                  composerOverlay={composerOverlay}
                  composerInput={composerInput}
                  homeComposerStyle={homeComposerStyle}
                  compactLayout={compactLayout}
                  onScroll={handleScroll}
                  onScrollToBottom={handleScrollToBottom}
                  onEditSubmit={handleEditSubmit}
                  onQueueRemove={handleQueueRemove}
                  onQueueSendNow={handleQueueSendNow}
                  onQueueEdit={handleQueueEdit}
                  onBuyMoreCredits={handleBuyMoreCredits}
                  onBuyMoreCreditsAfterExhaustion={handleBuyMoreCreditsAfterExhaustion}
                  onUpgradePlan={handleUpgradePlan}
                />
              )}
            </>
          </AgentChatSetupGate>
        </div>
        {!compactLayout &&
          !hideCampaignPanel &&
          !isMobile &&
          campaignPanelOpen &&
          activeCampaignId && (
            <ResizableDivider onMouseDown={handleResizeMouseDown} isDragging={isDragging} compact />
          )}
        {!compactLayout && !hideCampaignPanel && activeCampaignId && !isMobile && (
          <motion.div
            initial={false}
            animate={{ flexGrow: campaignPanelOpen ? 1 : 0, opacity: campaignPanelOpen ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="flex min-h-0 flex-col overflow-hidden bg-[var(--color-background)]"
            style={{ flexShrink: 0, flexBasis: 0 }}
          >
            <CampaignPreviewPanel />
          </motion.div>
        )}
      </div>

      {!hideCampaignPanel && isMobile && campaignPanelOpen && activeCampaignId ? (
        <AgentChatMobileCampaignPanel
          activeCampaignId={activeCampaignId}
          activeCampaignName={activeCampaignName}
          mobileCampaignSubScreen={mobileCampaignSubScreen}
          mobileCampaignSettingsOpen={mobileCampaignSettingsOpen}
          mobilePreviewInfo={mobilePreviewInfo}
          mobileCampaignPickerOpen={mobileCampaignPickerOpen}
          mobileCampaignSwitcherOptions={mobileCampaignSwitcherOptions}
          onMobileCampaignPickerOpenChange={setMobileCampaignPickerOpen}
          onCampaignPanelOpenChange={onCampaignPanelOpenChange}
          onMobileCampaignSubScreenChange={setMobileCampaignSubScreen}
          onMobilePreviewInfoChange={setMobilePreviewInfo}
          onSelectCampaignFromMobilePicker={(campaignId) =>
            void handleSelectCampaignFromMobilePicker(campaignId)
          }
          onMobileSettingsOverlayChange={setMobileCampaignSettingsOpen}
        />
      ) : null}

      {agentInfoOpen && !campaignPanelOpen && (
        <motion.div
          initial={false}
          animate={{ width: 380 }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="h-full min-h-0 shrink-0 overflow-hidden"
        >
          <div className="ml-auto h-full" style={{ width: 380, minWidth: 380 }}>
            {renderAgentInfoPanel()}
          </div>
        </motion.div>
      )}
    </div>
  )
}

const EMPTY_QUEUE: AgentChatQueueItem[] = []
