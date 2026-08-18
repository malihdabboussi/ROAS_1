'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import {
  ChatPanelSlideStack,
  ComposerInputStack,
  MessageQueue,
  PlanStickyTracker,
} from '@/components/chat'
import { ChatInput } from '@/components/chat/ChatInputAdapter'
import { RateLimitCard } from '@/components/chat/RateLimitCardAdapter'
import { StreamInterruptedBar } from '@/components/chat/StreamInterruptedBarAdapter'
import { ConversationShareModal } from '@/components/conversations'
import { SpaceConversationsList } from '@/components/conversations/SpaceConversationsListAdapter'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  TEAM_HR_CHAT_COMPOSE_EVENT,
  type TeamHrChatComposeDetail,
} from '@/lib/agents/side-chat-compose'
import {
  persistAtlasConversationId,
  persistLoopConversationId,
  persistTeamHrConversationId,
  readStoredAtlasConversationId,
  readStoredLoopConversationId,
  readStoredTeamHrConversationId,
} from '@/lib/agents/side-chat-storage'
import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { readConversationModelSettings } from '@/lib/chat'
import { resolvePinnedAssistantMessageId } from '@/lib/chat/assistant-message-actions'
import { getLastAssistantMessage, isAssistantTurnComplete } from '@/lib/chat/chat-turn-completion'
import { filterMessagesByQuery } from '@/lib/chat/conversation-search'
import {
  initStreamResilience,
  isStreamActive,
  needsStreamRecovery,
  recoverConversation,
  shouldSkipStreamRecovery,
  useChatStore,
  type Conversation,
} from '@/lib/chat/studio-chat-runtime-adapter'
import { stripLegacySpacesConversationTitle } from '@/lib/conversations/conversation-title'
import { dispatchLoopChatConversationChanged } from '@/lib/flows/loop-chat-conversation'
import { useOrgStore } from '@/lib/org'
import { fetchTeamRoster, type TeamRosterEntry } from '@/lib/team'
import { cn } from '@/lib/utils/cn'
import { missionAgentToRosterEntry } from '../../lib/mission-agent-to-roster'
import { useTeamFocusStore } from '../../store/use-team-focus-store'
import { AgentCheckpointsSidebar } from '../checkpoints/AgentCheckpointsPanel'
import { buildTeamHrAwarenessContext } from './build-team-hr-awareness-context'
import { groupMessagesIntoTurns } from './group-messages-into-turns'
import {
  BOTTOM_SCROLL_THRESHOLD,
  EMPTY_MESSAGES,
  EMPTY_QUEUE,
  HR_AGENT_KEY,
  HR_AGENT_NAME,
} from './team-hr-side-chat.constants'
import type { ChatMode, TeamHrSideChatPanelProps } from './team-hr-side-chat.types'
import { TeamHrChatCreditsBanner } from './TeamHrChatCreditsBanner'
import { TeamHrChatEmptyState } from './TeamHrChatEmptyState'
import { TeamHrChatHeader } from './TeamHrChatHeader'
import { TeamHrChatMessageTurns } from './TeamHrChatMessageTurns'
import { useTeamHrChatMessaging } from './useTeamHrChatMessaging'
import { useTeamHrConversationActions } from './useTeamHrConversationActions'

export type { TeamHrChatRailIntent } from './team-hr-side-chat.types'

export function TeamHrSideChatPanel({
  agent,
  agentKey = HR_AGENT_KEY,
  fallbackAgentName = HR_AGENT_NAME,
  fallbackRoleLabel = 'HR Manager',
  emptyStateGreeting,
  blockingOverlay,
  composerTopAccessory,
  composerBlocked = false,
  composerBlockedMessage,
  loading = false,
  onCollapseChat,
  railIntent = null,
  onRailIntentConsumed,
  buildAwarenessContext,
  showCheckpoints = true,
  storageScope = 'hr',
  spaceId = null,
  resolveSpaceIdBeforeSend,
  onStreamSettled,
  onNewConversation,
}: TeamHrSideChatPanelProps) {
  const focusedAgent = useTeamFocusStore((s) => s.focusedAgent)
  const [mode, setMode] = useState<ChatMode>('chat')
  const [checkpointRefreshSignal, setCheckpointRefreshSignal] = useState(0)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationQuery, setConversationQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [knownSkillKeys, setKnownSkillKeys] = useState<Set<string>>(new Set())
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const [roster, setRoster] = useState<TeamRosterEntry[]>([])
  const [spacerHeight, setSpacerHeight] = useState(0)
  const [lastUserPromptHeight, setLastUserPromptHeight] = useState(0)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const conversationShareOrgName = useOrgStore(
    (s) => s.getActiveOrg()?.organizations.name ?? 'Workspace',
  )
  const isOrgContext = activeOrgId !== null
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const lastUserPromptRef = useRef<HTMLDivElement>(null)
  const spacerHeightRef = useRef(0)
  const lastUserPromptHeightRef = useRef(0)
  const setTextRef = useRef<((text: string) => void) | null>(null)
  const composerMirrorRef = useRef('')
  const previousMessageCountRef = useRef(0)
  const isProgrammaticScrollRef = useRef(false)
  const initialHydrationRef = useRef<string | null>(null)
  const chatPanelRef = useRef<HTMLDivElement | null>(null)

  const hrRosterEntry = useMemo(() => (agent ? missionAgentToRosterEntry(agent) : null), [agent])

  const activeAgentKey = agentKey
  const activeAgentName = hrRosterEntry?.display_name ?? fallbackAgentName
  const readStoredConversationId = useCallback(() => {
    if (storageScope === 'atlas') return readStoredAtlasConversationId()
    if (storageScope === 'loop') return readStoredLoopConversationId(spaceId ?? '')
    return readStoredTeamHrConversationId()
  }, [spaceId, storageScope])
  const persistConversationId = useCallback(
    (conversationId: string | null) => {
      if (storageScope === 'atlas') {
        persistAtlasConversationId(conversationId)
        return
      }
      if (storageScope === 'loop') {
        if (spaceId) persistLoopConversationId(spaceId, conversationId)
        return
      }
      persistTeamHrConversationId(conversationId)
    },
    [spaceId, storageScope],
  )
  const notifyLoopConversationChanged = useCallback(
    (conversationId: string | null) => {
      if (storageScope !== 'loop' || !spaceId) return
      dispatchLoopChatConversationChanged({ spaceId, conversationId })
    },
    [spaceId, storageScope],
  )
  const getAwarenessContext =
    buildAwarenessContext ??
    (() =>
      buildTeamHrAwarenessContext({
        focusedAgent: useTeamFocusStore.getState().focusedAgent,
        page: useTeamFocusStore.getState().page,
        agentsContext: useTeamFocusStore.getState().agentsContext,
        skillsContext: useTeamFocusStore.getState().skillsContext,
      }))

  const emptyStateAgent = useMemo((): TeamRosterEntry => {
    if (hrRosterEntry) return hrRosterEntry
    return {
      participant_id: `agent:${activeAgentKey}`,
      kind: 'agent',
      org_id: null,
      user_id: null,
      agent_key: activeAgentKey,
      display_name: fallbackAgentName,
      avatar_url: null,
      role_label: fallbackRoleLabel,
      specialties: [],
      accepts_assignments: true,
      delegation_notes: null,
      timezone: null,
      working_hours: null,
      out_of_office_until: null,
      current_load: 0,
      is_ready: true,
      agent_level: null,
      org_role: null,
      email: null,
      created_at: '',
      updated_at: null,
    }
  }, [activeAgentKey, fallbackAgentName, fallbackRoleLabel, hrRosterEntry])

  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const streamingMessageId = useChatStore((s) =>
    selectedConversationId
      ? (s.streamingMessageIdsByConversation[selectedConversationId] ?? null)
      : null,
  )
  const streamingConversationIds = useChatStore((s) => s.streamingConversationIds)
  const stoppingConversationIds = useChatStore((s) => s.stoppingConversationIds)
  const creditsLow = useChatStore((s) => s.creditsLow)
  const creditsLowRemaining = useChatStore((s) => s.creditsLowRemaining)
  const creditsExhausted = useChatStore((s) => s.creditsExhausted)
  const enqueueMessage = useChatStore((s) => s.enqueueMessage)
  const dequeueMessage = useChatStore((s) => s.dequeueMessage)
  const removeQueueItem = useChatStore((s) => s.removeQueueItem)
  const updateQueueItem = useChatStore((s) => s.updateQueueItem)

  const allMessages = useChatStore((s) =>
    selectedConversationId
      ? (s.messagesByConversation[selectedConversationId] ?? EMPTY_MESSAGES)
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

  const displayMessages = useMemo(
    () => filterMessagesByQuery(messages, searchQuery),
    [messages, searchQuery],
  )

  const isStreaming = selectedConversationId
    ? streamingConversationIds.includes(selectedConversationId)
    : false
  const isStopping = selectedConversationId
    ? stoppingConversationIds.includes(selectedConversationId)
    : false
  const flowBuildGateActive = composerBlocked && messages.length === 0
  const showBlockingOverlay = flowBuildGateActive && !!blockingOverlay
  const showComposerTopAccessory =
    !!composerTopAccessory && !(selectedConversationId && isLoadingMessages)

  const queue = useChatStore((s) =>
    selectedConversationId
      ? (s.messageQueueByConversation[selectedConversationId] ?? EMPTY_QUEUE)
      : EMPTY_QUEUE,
  )

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )
  const selectedConversationLevel = selectedConversation?.effective_level ?? 'admin'
  const selectedConversationReadOnly = selectedConversationLevel === 'view'
  const showComposerStack = showComposerTopAccessory

  const turnData = useMemo(() => groupMessagesIntoTurns(displayMessages), [displayMessages])

  const streamRecoveryTriggerKey = useMemo(() => {
    const lastAssistant = getLastAssistantMessage(messages)
    if (!lastAssistant) return `${messages.length}:none`
    const metadata = lastAssistant.metadata as Record<string, unknown> | undefined
    const durationMs = metadata?.duration_ms
    const turnComplete = isAssistantTurnComplete(lastAssistant, true)
    return `${lastAssistant.id}:${durationMs ?? 'none'}:${turnComplete ? 'complete' : 'pending'}:${messages.length}`
  }, [messages])

  const pinnedAssistantMessageId = useMemo(
    () => resolvePinnedAssistantMessageId(displayMessages),
    [displayMessages],
  )

  const conversationActions = useTeamHrConversationActions({
    activeAgentKey,
    storageScope,
    spaceId,
    selectedConversationId,
    readStoredConversationId,
    persistConversationId,
    notifyLoopConversationChanged,
    setConversations,
    setSelectedConversationId,
    setConversationsLoading,
    setMode,
    onNewConversation,
  })

  const messaging = useTeamHrChatMessaging({
    activeAgentKey,
    getAwarenessContext,
    storageScope,
    resolveSpaceIdBeforeSend,
    spaceId,
    setTextRef,
    selectedConversationId,
    selectedConversation,
    messages,
    isStreaming,
    isStopping,
    queueLength: queue.length,
    showCheckpoints,
    focusedAgentEditable: focusedAgent?.editable,
    onStreamSettled,
    persistConversationId,
    notifyLoopConversationChanged,
    setSelectedConversationId,
    setConversations,
    setCheckpointRefreshSignal,
    processQueueDeps: { dequeueMessage, enqueueMessage, removeQueueItem, updateQueueItem },
  })

  useEffect(() => {
    void cachedFetch(
      `agent-skills:${activeAgentKey}`,
      () => backendGet<{ id: string; skill_key: string }[]>(`/api/agents/${activeAgentKey}/skills`),
      { ttlMs: 300_000 },
    )
      .then((skills) => {
        if (Array.isArray(skills)) setKnownSkillKeys(new Set(skills.map((s) => s.skill_key)))
      })
      .catch(() => null)
  }, [activeAgentKey])

  useEffect(() => {
    if (!isOrgContext) {
      setRoster([])
      return
    }
    let cancelled = false
    fetchTeamRoster({ kind: 'human' })
      .then((rows) => {
        if (!cancelled) setRoster(rows)
      })
      .catch(() => {
        if (!cancelled) setRoster([])
      })
    return () => {
      cancelled = true
    }
  }, [isOrgContext])

  useEffect(() => {
    initStreamResilience()
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const applyHeight = (h: number) => {
      setSpacerHeight(h)
      spacerHeightRef.current = h
    }
    const ro = new ResizeObserver(([entry]) => {
      if (entry) applyHeight(entry.contentRect.height)
    })
    ro.observe(el)
    applyHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [selectedConversationId])

  useEffect(() => {
    const el = lastUserPromptRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        const h = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
        setLastUserPromptHeight(h)
        lastUserPromptHeightRef.current = h
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [displayMessages.length])

  useEffect(() => {
    if (!selectedConversationId || messages.length === 0) return
    if (isStreamActive(selectedConversationId)) return
    if (shouldSkipStreamRecovery(selectedConversationId)) return
    if (!needsStreamRecovery(messages)) return
    void recoverConversation(selectedConversationId)
  }, [selectedConversationId, streamRecoveryTriggerKey, messages])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || messages.length === 0) return

    const currentCount = messages.length
    const prevCount = previousMessageCountRef.current
    previousMessageCountRef.current = currentCount

    const isNewConversation = initialHydrationRef.current !== selectedConversationId
    if (isNewConversation) {
      initialHydrationRef.current = selectedConversationId
    }

    if ((currentCount > prevCount && prevCount > 0) || isNewConversation) {
      const latestUserMsg = [...messages].reverse().find((m) => m.role === 'user')
      if (latestUserMsg) {
        setTimeout(() => {
          const el = scrollEl.querySelector(`[data-turn-id="${latestUserMsg.id}"]`)
          if (el) {
            isProgrammaticScrollRef.current = true
            const containerTop = scrollEl.getBoundingClientRect().top
            const elTop = el.getBoundingClientRect().top
            scrollEl.scrollTop += elTop - containerTop
            requestAnimationFrame(() => {
              isProgrammaticScrollRef.current = false
            })
          }
        }, 80)
      }
      setUserHasScrolledUp(false)
    }
  }, [messages.length, selectedConversationId, messages])

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SCROLL_THRESHOLD
    setUserHasScrolledUp(!atBottom)
  }, [])

  const handleScrollToBottom = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
    setUserHasScrolledUp(false)
  }, [])

  useEffect(() => {
    if (!railIntent) return
    if (railIntent === 'new') {
      conversationActions.handleNewConversation()
    } else if (railIntent === 'list') {
      setMode('conversations')
    }
    onRailIntentConsumed?.()
  }, [railIntent, conversationActions.handleNewConversation, onRailIntentConsumed])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TeamHrChatComposeDetail>).detail
      if (!detail?.text) return

      const panel = chatPanelRef.current
      if (!panel) return
      const rect = panel.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      if (detail.newConversation) {
        conversationActions.handleNewConversation()
      }
      setMode('chat')
      if (detail.submit) {
        void messaging.sendWithToast(detail.text)
        return
      }
      messaging.setComposerRestore({ text: detail.text, nonce: crypto.randomUUID() })
    }

    window.addEventListener(TEAM_HR_CHAT_COMPOSE_EVENT, handler)
    return () => window.removeEventListener(TEAM_HR_CHAT_COMPOSE_EVENT, handler)
  }, [
    conversationActions.handleNewConversation,
    messaging.sendWithToast,
    messaging.setComposerRestore,
  ])

  useEffect(() => {
    if (mode === 'checkpoints' && (!showCheckpoints || !focusedAgent?.editable)) setMode('chat')
  }, [mode, focusedAgent, showCheckpoints])

  const defaultModel = selectedConversation?.default_model_id ?? null
  const conversationModelSettings = useMemo(
    () => readConversationModelSettings(selectedConversation?.metadata),
    [selectedConversation?.metadata],
  )
  const sessionTitle = stripLegacySpacesConversationTitle(selectedConversation?.title)

  if (loading) {
    return (
      <div
        data-team-hr-chat-panel
        className="surface-card flex h-full min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)]"
      >
        <VibeyLoadingOrb state="processing" size="sm" text={`Loading ${fallbackAgentName}…`} />
      </div>
    )
  }

  return (
    <div
      data-team-hr-chat-panel
      ref={chatPanelRef}
      className={cn(
        'relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)]',
        mode === 'chat' ? 'surface-card' : 'surface-bg',
      )}
    >
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          showBlockingOverlay && 'pointer-events-none blur-md',
        )}
      >
        <ChatPanelSlideStack
          panelKey={mode}
          chatPanel={
            <div className="surface-bg group flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <TeamHrChatHeader
                activeAgentName={activeAgentName}
                hrRosterEntry={hrRosterEntry}
                focusedAgent={focusedAgent}
                sessionTitle={sessionTitle}
                searchOpen={searchOpen}
                searchQuery={searchQuery}
                showCheckpoints={showCheckpoints}
                onCollapseChat={onCollapseChat}
                onSearchOpenChange={setSearchOpen}
                onSearchQueryChange={setSearchQuery}
                onNewConversation={conversationActions.handleNewConversation}
                onShowCheckpoints={() => setMode('checkpoints')}
                onShowConversations={() => setMode('conversations')}
              />

              <PlanStickyTracker messages={messages} scrollContainerRef={scrollRef} />
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-4"
              >
                <div ref={contentRef} className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
                  {isLoadingMessages && messages.length === 0 && selectedConversationId ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-24">
                      <VibeyLoadingOrb text="Loading conversation…" state="processing" size="md" />
                    </div>
                  ) : null}
                  {messages.length === 0 && !isLoadingMessages ? (
                    <TeamHrChatEmptyState agent={emptyStateAgent} greeting={emptyStateGreeting} />
                  ) : null}

                  <TeamHrChatMessageTurns
                    leadingMessages={turnData.leadingMessages}
                    turns={turnData.turns}
                    streamingMessageId={streamingMessageId}
                    lastUserMessageId={messaging.lastUserMessageId}
                    pinnedAssistantMessageId={pinnedAssistantMessageId}
                    selectedConversationId={selectedConversationId}
                    knownSkillKeys={knownSkillKeys}
                    activeAgentKey={activeAgentKey}
                    spacerHeight={spacerHeight}
                    lastUserPromptHeight={lastUserPromptHeight}
                    lastUserPromptRef={lastUserPromptRef}
                    onEditSubmit={messaging.handleEditSubmit}
                  />
                </div>
              </div>

              <TeamHrChatCreditsBanner
                creditsLow={creditsLow}
                creditsLowRemaining={creditsLowRemaining}
                creditsExhausted={creditsExhausted}
              />

              <StreamInterruptedBar conversationId={selectedConversationId} />

              <div
                className={cn(
                  'relative flex shrink-0 flex-col items-center px-3 pb-3 pt-2 md:px-4',
                  isStopping && 'opacity-70',
                )}
              >
                {userHasScrolledUp && displayMessages.length > 0 ? (
                  <div className="pointer-events-none absolute inset-x-0 -top-12 z-10 flex justify-center">
                    <button
                      type="button"
                      onClick={handleScrollToBottom}
                      className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_0_12px_4px_rgba(0,0,0,0.4)] transition-all hover:opacity-90"
                      aria-label="Scroll to latest messages"
                      title="Scroll to latest"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <div className="w-full max-w-3xl">
                  <RateLimitCard />
                  <MessageQueue
                    items={queue}
                    onRemove={messaging.handleQueueRemove}
                    onSendNow={messaging.handleQueueSendNow}
                    onEdit={messaging.handleQueueEdit}
                  />
                  {selectedConversationReadOnly ? (
                    <div className="body-3 text-muted-foreground mb-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 border border-[var(--color-border)] text-center">
                      Read-only. Ask the owner for edit access.
                    </div>
                  ) : null}
                  <ComposerInputStack
                    stackActive={showComposerStack}
                    topSlot={showComposerTopAccessory ? composerTopAccessory : undefined}
                  >
                    <ChatInput
                      onSend={messaging.handleComposerSendWithQueueEdit}
                      defaultModel={defaultModel}
                      defaultModelSettings={conversationModelSettings}
                      disabled={
                        creditsExhausted ||
                        isStopping ||
                        selectedConversationReadOnly ||
                        flowBuildGateActive
                      }
                      creditsExhausted={creditsExhausted}
                      isStreaming={isStreaming}
                      onStop={messaging.handleStop}
                      conversationId={selectedConversationId}
                      spaceId={spaceId}
                      setTextRef={setTextRef}
                      composerMirrorRef={composerMirrorRef}
                      onEnqueue={messaging.editingQueueItemId ? undefined : messaging.handleEnqueue}
                      onSendNow={messaging.handleQueueSendNowNext}
                      queueLength={queue.length}
                      placeholder={
                        flowBuildGateActive
                          ? (composerBlockedMessage ??
                            'Choose create or update a flow to start chatting')
                          : selectedConversationReadOnly
                            ? 'Read-only conversation'
                            : `Message ${activeAgentName}...`
                      }
                      initialValue={messaging.composerRestore?.text}
                      initialDocuments={messaging.composerRestore?.documents}
                      restoreNonce={messaging.composerRestore?.nonce}
                      compact
                      agentKey={activeAgentKey}
                      dropZoneRef={chatPanelRef}
                    />
                  </ComposerInputStack>
                </div>
              </div>
            </div>
          }
          subPanel={
            showCheckpoints && mode === 'checkpoints' && focusedAgent?.editable ? (
              <AgentCheckpointsSidebar
                agentKey={focusedAgent.agent_key}
                agentName={focusedAgent.name}
                refreshSignal={checkpointRefreshSignal}
                onBack={() => setMode('chat')}
              />
            ) : (
              <SpaceConversationsList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                query={conversationQuery}
                onQueryChange={setConversationQuery}
                onSelectConversation={(conversationId) =>
                  void conversationActions.handleSelectConversation(conversationId)
                }
                onNewConversation={() => void conversationActions.handleNewConversation()}
                onDeleteConversation={(conversationId) =>
                  void conversationActions.handleDeleteConversation(conversationId)
                }
                onRenameConversation={conversationActions.handleRenameConversation}
                onTogglePinConversation={conversationActions.handleTogglePinConversation}
                onToggleArchiveConversation={conversationActions.handleToggleArchiveConversation}
                onMoveConversation={conversationActions.handleMoveConversation}
                onDuplicateConversation={conversationActions.handleDuplicateConversation}
                onCopyConversationLink={conversationActions.handleCopyConversationLink}
                onCopyConversationId={conversationActions.handleCopyConversationId}
                onOpenConversationInNewTab={conversationActions.handleOpenConversationInNewTab}
                onShareConversation={setShareConversation}
                onBack={() => setMode('chat')}
                loading={conversationsLoading}
                isOrgContext={isOrgContext}
              />
            )
          }
        />
      </div>
      {showBlockingOverlay ? blockingOverlay : null}
      {isOrgContext ? (
        <ConversationShareModal
          activeOrgId={activeOrgId}
          open={shareConversation !== null}
          conversation={shareConversation}
          orgName={conversationShareOrgName}
          roster={roster}
          onClose={() => setShareConversation(null)}
          onSharesChanged={() => void conversationActions.loadConversations()}
        />
      ) : null}
    </div>
  )
}
