'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RxDoubleArrowLeft } from 'react-icons/rx'
import { motion } from 'framer-motion'
import { ArrowDown, GitBranch, List, Lock, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  ChatPanelSlideStack,
  ChatTurnChangeDivider,
  ComposerActiveRunTipCard,
  ComposerInputStack,
  MessageQueue,
  PlanStickyTracker,
} from '@/components/chat'
import { ChatInput } from '@/components/chat/ChatInputAdapter'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import { RateLimitCard } from '@/components/chat/RateLimitCardAdapter'
import { StatusIndicator } from '@/components/chat/StatusIndicatorAdapter'
import { StreamInterruptedBar } from '@/components/chat/StreamInterruptedBarAdapter'
import { ConversationShareModal } from '@/components/conversations'
import { SpaceConversationsList } from '@/components/conversations/SpaceConversationsListAdapter'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
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
import {
  readConversationModelSettings,
  type ChatModelSettings,
  type DocumentAttachment,
} from '@/lib/chat'
import type { AttachedArtifact } from '@/lib/chat/attached-artifact'
import { toastMessageForChatSendError } from '@/lib/chat/chat-stream-errors.config'
import { CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import { filterMessagesByQuery } from '@/lib/chat/conversation-search'
import { resolvePinnedAssistantMessageId } from '@/lib/chat/assistant-message-actions'
import {
  deleteMessagesFrom,
  duplicateConversation,
  fetchMessages,
  initStreamResilience,
  needsStreamRecovery,
  recoverConversation,
  requestStopStream,
  selectConversation,
  sendMessageStreaming,
  shouldSkipStreamRecovery,
  isStreamActive,
  suggestConversationTitle,
  useChatStore,
  type Conversation,
  type HighlightedArtifact,
  type Message,
  type MessageReference,
} from '@/lib/chat/studio-chat-runtime-adapter'
import {
  assignConversationCampaign,
  createNewConversation,
  deleteConversation,
  fetchConversations,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
} from '@/lib/conversations'
import { stripLegacySpacesConversationTitle } from '@/lib/conversations/conversation-title'
import {
  CONVERSATION_ACTIONS_TOAST_ERRORS,
  CONVERSATION_ACTIONS_TOAST_SUCCESS,
} from '@/lib/conversations/conversation-toast-errors.config'
import {
  dispatchLoopChatConversationChanged,
  LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT,
  LOOP_CHAT_SELECT_CONVERSATION_EVENT,
  type LoopChatActivateConversationDetail,
  type LoopChatSelectConversationDetail,
} from '@/lib/flows/loop-chat-conversation'
import { useOrgStore } from '@/lib/org'
import { fetchTeamRoster, type TeamRosterEntry } from '@/lib/team'
import { cn } from '@/lib/utils/cn'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { missionAgentToRosterEntry } from '../../lib/mission-agent-to-roster'
import { useTeamFocusStore } from '../../store/use-team-focus-store'
import { AgentCheckpointsSidebar } from '../checkpoints/AgentCheckpointsPanel'
import { buildTeamHrAwarenessContext } from './build-team-hr-awareness-context'
import { TeamHrChatAgentIdentity } from './TeamHrChatAgentIdentity'
import { TeamHrChatEmptyState } from './TeamHrChatEmptyState'
import {
  getLastAssistantMessage,
  isAssistantTurnComplete,
} from '@/features/studio/lib/chat-turn-completion'

const HR_AGENT_KEY = 'hr'
const HR_AGENT_NAME = 'Jaime'
const EMPTY_MESSAGES: Message[] = []
const EMPTY_QUEUE: Array<{
  id: string
  content: string
  documents?: DocumentAttachment[]
  artifacts?: HighlightedArtifact[]
  model?: string
}> = []
const BOTTOM_SCROLL_THRESHOLD = 80

type ChatMode = 'chat' | 'conversations' | 'checkpoints'
export type TeamHrChatRailIntent = 'new' | 'list' | null

interface TeamHrSideChatPanelProps {
  agent: MissionAgent | null
  agentKey?: string
  fallbackAgentName?: string
  fallbackRoleLabel?: string
  emptyStateGreeting?: string
  blockingOverlay?: ReactNode
  composerTopAccessory?: ReactNode
  composerBlocked?: boolean
  composerBlockedMessage?: string
  loading?: boolean
  onCollapseChat?: () => void
  railIntent?: TeamHrChatRailIntent
  onRailIntentConsumed?: () => void
  buildAwarenessContext?: () => string
  showCheckpoints?: boolean
  storageScope?: 'hr' | 'atlas' | 'loop'
  spaceId?: string | null
  resolveSpaceIdBeforeSend?: () => Promise<string | null>
  onStreamSettled?: () => void
  onNewConversation?: () => void
}

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
  const pathname = usePathname()
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
  const [composerRestore, setComposerRestore] = useState<{
    text: string
    documents?: DocumentAttachment[]
    nonce: string
  } | null>(null)
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(null)
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
  const prevStreamingRef = useRef(false)
  const loadConversationsSeqRef = useRef(0)
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
  const showComposerStack =
    (isStreaming && !selectedConversationReadOnly) || showComposerTopAccessory

  const turnData = useMemo(() => {
    const leadingMessages: Message[] = []
    const turns: { user: Message; responses: Message[] }[] = []
    let currentTurn: { user: Message; responses: Message[] } | null = null

    for (const m of displayMessages) {
      if (m.role === 'user') {
        const isVoice = (m.metadata as Record<string, unknown>)?.source === 'voice_live'
        if (isVoice && currentTurn) {
          currentTurn.responses.push(m)
        } else {
          if (currentTurn) turns.push(currentTurn)
          currentTurn = { user: m, responses: [] }
        }
      } else if (currentTurn) {
        currentTurn.responses.push(m)
      } else {
        leadingMessages.push(m)
      }
    }
    if (currentTurn) turns.push(currentTurn)
    return { leadingMessages, turns }
  }, [displayMessages])

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

  useEffect(() => {
    // Same key ChatInput's slash menu uses — TTL reuse instead of a raw
    // duplicate fetch per mount (the panel remounts on every expand).
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
  }, [selectedConversationId, streamRecoveryTriggerKey])

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

  const loadConversations = useCallback(async () => {
    const seq = ++loadConversationsSeqRef.current
    setConversationsLoading(true)
    try {
      // ttl 0 = dedupe only — StrictMode double-effects and any concurrent
      // same-agent fetch share a single request.
      const list = await cachedFetch(`conversations:agent:${activeAgentKey}`, () =>
        fetchConversations(undefined, activeAgentKey),
      )
      if (seq !== loadConversationsSeqRef.current) return
      list.forEach((c) => useChatStore.getState().addConversation(c))
      setConversations(list)

      const stored = readStoredConversationId()

      if (stored) {
        setSelectedConversationId(stored)
        persistConversationId(stored)
        notifyLoopConversationChanged(stored)
        await selectConversation(stored)
        return
      }

      setSelectedConversationId(null)
      persistConversationId(null)
      notifyLoopConversationChanged(null)
      useChatStore.getState().setActiveConversationId(null)
    } finally {
      if (seq === loadConversationsSeqRef.current) {
        setConversationsLoading(false)
      }
    }
  }, [
    activeAgentKey,
    notifyLoopConversationChanged,
    persistConversationId,
    readStoredConversationId,
    spaceId,
    storageScope,
  ])

  useEffect(() => {
    if (!activeAgentKey) return
    if (storageScope === 'loop' && !spaceId) return
    void loadConversations()
  }, [activeAgentKey, loadConversations, spaceId, storageScope])

  const resolveActiveSpaceId = useCallback(async (): Promise<string | null> => {
    if (spaceId) return spaceId
    if (!resolveSpaceIdBeforeSend) return null
    return resolveSpaceIdBeforeSend()
  }, [resolveSpaceIdBeforeSend, spaceId])

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
      if (!selectedConversationId || !lastUserMessageId) return
      const defaultModel = selectedConversation?.default_model_id ?? undefined
      try {
        const backendMessages = await fetchMessages(selectedConversationId)
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
        const activeSpaceId = await resolveActiveSpaceId()
        if (storageScope === 'loop' && !activeSpaceId) {
          if (!resolveSpaceIdBeforeSend) {
            toast.error('Flow sandbox is not ready yet. Try again in a moment.')
          }
          return
        }

        await deleteMessagesFrom(selectedConversationId, backendLastUser.id)
        useChatStore
          .getState()
          .setMessages(selectedConversationId, backendMessages.slice(0, backendLastUserIndex))

        await sendMessageStreaming({
          conversation_id: selectedConversationId,
          content: newContent,
          model: model || defaultModel || undefined,
          documents,
          scope_kind: 'personal',
          space_id: activeSpaceId ?? undefined,
          model_settings: modelSettings,
          system_context: getAwarenessContext(),
        })
      } catch (err) {
        console.error('Edit submit failed:', err)
        toast.error(CHAT_TOAST_ERRORS.CHAT_RESEND_FAILED.userMessage)
      }
    },
    [
      getAwarenessContext,
      lastUserMessageId,
      resolveActiveSpaceId,
      selectedConversationId,
      selectedConversation?.default_model_id,
      storageScope,
    ],
  )

  const hrSend = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      modelSettings?: ChatModelSettings,
    ) => {
      if (selectedConversationId && isStopping) return
      const activeSpaceId = await resolveActiveSpaceId()
      if (storageScope === 'loop' && !activeSpaceId) {
        if (!resolveSpaceIdBeforeSend) {
          toast.error('Flow sandbox is not ready yet. Try again in a moment.')
        }
        return
      }

      const msgsBefore =
        (selectedConversationId
          ? useChatStore.getState().messagesByConversation[selectedConversationId]
          : null) ?? []
      const isFirstMessageInThread = msgsBefore.length === 0

      let conversationId = selectedConversationId
      if (!conversationId) {
        const conversation = await createNewConversation({ agent_id: activeAgentKey })
        useChatStore.getState().addConversation(conversation)
        useChatStore.getState().setMessages(conversation.id, [])
        setConversations((prev) => [
          conversation,
          ...prev.filter((item) => item.id !== conversation.id),
        ])
        setSelectedConversationId(conversation.id)
        persistConversationId(conversation.id)
        notifyLoopConversationChanged(conversation.id)
        useChatStore.getState().setActiveConversationId(conversation.id)
        conversationId = conversation.id
      }

      const systemContext = getAwarenessContext()

      const nextConversationId = await sendMessageStreaming({
        conversation_id: conversationId,
        scope_kind: 'personal',
        content,
        documents,
        highlighted_artifacts: artifacts?.map((artifact) => ({
          id: artifact.id,
          type: artifact.type,
          label: artifact.label,
        })),
        model,
        model_settings: modelSettings,
        space_id: activeSpaceId ?? undefined,
        system_context: systemContext,
      })
      setSelectedConversationId(nextConversationId)
      persistConversationId(nextConversationId)
      notifyLoopConversationChanged(nextConversationId)

      const storeConv = useChatStore
        .getState()
        .conversations.find((c) => c.id === nextConversationId)
      if (storeConv && (storeConv.agent_id ?? activeAgentKey) === activeAgentKey) {
        setConversations((prev) => {
          const rest = prev.filter((c) => c.id !== nextConversationId)
          return [storeConv, ...rest]
        })
      }

      if (isFirstMessageInThread && content.trim()) {
        void suggestConversationTitle(content.trim())
          .then(async (res) => {
            const title = (res.title ?? '').trim().slice(0, 200)
            if (!title) return
            await renameConversation(nextConversationId, title)
            setConversations((prev) =>
              prev.map((c) => (c.id === nextConversationId ? { ...c, title } : c)),
            )
            useChatStore.getState().updateConversation(nextConversationId, { title })
          })
          .catch(() => {})
      }
    },
    [
      activeAgentKey,
      getAwarenessContext,
      isStopping,
      notifyLoopConversationChanged,
      persistConversationId,
      resolveActiveSpaceId,
      selectedConversationId,
      storageScope,
    ],
  )

  const sendWithToast = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      modelSettings?: ChatModelSettings,
    ) => {
      try {
        await hrSend(content, documents, artifacts, model, modelSettings)
      } catch (err) {
        if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
          useChatStore.getState().setCreditsExhausted(true)
          return
        }
        setComposerRestore({ text: content, documents, nonce: crypto.randomUUID() })
        toast.error(toastMessageForChatSendError(err))
      }
    },
    [hrSend],
  )

  const handleSend = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      _references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      void sendWithToast(content, documents, artifacts, model, modelSettings)
    },
    [sendWithToast],
  )

  const handleEnqueue = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      _references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (!selectedConversationId) return
      const highlightedArtifacts: HighlightedArtifact[] | undefined = artifacts?.map((a) => ({
        id: a.id,
        type: a.type,
        label: a.label,
      }))
      enqueueMessage(selectedConversationId, {
        id: crypto.randomUUID(),
        content,
        documents,
        artifacts: highlightedArtifacts,
        model,
        modelSettings,
      })
    },
    [selectedConversationId, enqueueMessage],
  )

  const processNextQueueItem = useCallback(async () => {
    if (!selectedConversationId) return
    const item = dequeueMessage(selectedConversationId)
    if (!item) return
    await sendWithToast(
      item.content,
      item.documents,
      item.artifacts as AttachedArtifact[] | undefined,
      item.model,
      item.modelSettings,
    )
  }, [selectedConversationId, dequeueMessage, sendWithToast])

  const handleQueueSendNow = useCallback(
    async (itemId: string) => {
      if (!selectedConversationId) return
      const store = useChatStore.getState()
      const items = store.messageQueueByConversation[selectedConversationId] ?? []
      const item = items.find((queuedItem) => queuedItem.id === itemId)
      if (!item) return
      store.removeQueueItem(selectedConversationId, itemId)
      if (isStreaming) void requestStopStream(selectedConversationId)
      await sendWithToast(
        item.content,
        item.documents,
        item.artifacts as AttachedArtifact[] | undefined,
        item.model,
        item.modelSettings,
      )
    },
    [selectedConversationId, isStreaming, sendWithToast],
  )

  const handleQueueSendNowNext = useCallback(async () => {
    if (!selectedConversationId) return
    if (isStreaming) void requestStopStream(selectedConversationId)
    await new Promise((resolve) => setTimeout(resolve, 100))
    await processNextQueueItem()
  }, [selectedConversationId, isStreaming, processNextQueueItem])

  const handleQueueRemove = useCallback(
    (itemId: string) => {
      if (!selectedConversationId) return
      removeQueueItem(selectedConversationId, itemId)
    },
    [selectedConversationId, removeQueueItem],
  )

  const handleQueueEdit = useCallback((item: { id: string; content: string }) => {
    setEditingQueueItemId(item.id)
    setTextRef.current?.(item.content)
  }, [])

  const handleComposerSendWithQueueEdit = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      _references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (editingQueueItemId && selectedConversationId) {
        const highlightedArtifacts: HighlightedArtifact[] | undefined = artifacts?.map((a) => ({
          id: a.id,
          type: a.type,
          label: a.label,
        }))
        updateQueueItem(selectedConversationId, editingQueueItemId, {
          content,
          documents,
          artifacts: highlightedArtifacts,
          model,
          modelSettings,
        })
        setEditingQueueItemId(null)
        return
      }
      handleSend(content, documents, artifacts, model, undefined, modelSettings)
    },
    [editingQueueItemId, selectedConversationId, updateQueueItem, handleSend],
  )

  useEffect(() => {
    const wasStreaming = prevStreamingRef.current
    prevStreamingRef.current = isStreaming
    if (wasStreaming && !isStreaming && !isStopping) {
      if (queue.length > 0) void processNextQueueItem()
      if (showCheckpoints && focusedAgent?.editable)
        setCheckpointRefreshSignal((value) => value + 1)
      onStreamSettled?.()
    }
  }, [
    isStreaming,
    isStopping,
    queue.length,
    processNextQueueItem,
    focusedAgent,
    showCheckpoints,
    onStreamSettled,
  ])

  const handleStop = useCallback(() => {
    if (selectedConversationId) void requestStopStream(selectedConversationId)
  }, [selectedConversationId])

  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null)
    persistConversationId(null)
    notifyLoopConversationChanged(null)
    useChatStore.getState().setActiveConversationId(null)
    setMode('chat')
    onNewConversation?.()
  }, [notifyLoopConversationChanged, onNewConversation, persistConversationId])

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      setSelectedConversationId(conversationId)
      persistConversationId(conversationId)
      notifyLoopConversationChanged(conversationId)
      await selectConversation(conversationId)
      setMode('chat')
    },
    [notifyLoopConversationChanged, persistConversationId],
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LoopChatSelectConversationDetail>).detail
      if (!detail || storageScope !== 'loop' || !spaceId || detail.spaceId !== spaceId) return
      void handleSelectConversation(detail.conversationId)
    }
    window.addEventListener(LOOP_CHAT_SELECT_CONVERSATION_EVENT, handler)
    return () => window.removeEventListener(LOOP_CHAT_SELECT_CONVERSATION_EVENT, handler)
  }, [handleSelectConversation, spaceId, storageScope])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LoopChatActivateConversationDetail>).detail
      if (!detail || storageScope !== 'loop' || !spaceId || detail.spaceId !== spaceId) return
      const conversation = detail.conversation
      useChatStore.getState().addConversation(conversation)
      useChatStore.getState().setMessages(conversation.id, [])
      setConversations((prev) => [
        conversation,
        ...prev.filter((row) => row.id !== conversation.id),
      ])
      void handleSelectConversation(conversation.id)
      setMode('chat')
    }
    window.addEventListener(LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT, handler)
    return () => window.removeEventListener(LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT, handler)
  }, [handleSelectConversation, spaceId, storageScope])

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      await deleteConversation(conversationId)
      useChatStore.getState().removeConversation(conversationId)
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null)
        persistConversationId(null)
      }
      setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId))
    },
    [persistConversationId, selectedConversationId],
  )

  const handleRenameConversation = useCallback(async (conversationId: string, title: string) => {
    try {
      await renameConversation(conversationId, title)
      useChatStore.getState().updateConversation(conversationId, { title })
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title } : c)))
    } catch (err) {
      console.error('Rename conversation failed:', err)
      toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.RENAME_CONVERSATION_FAILED.userMessage)
    }
  }, [])

  const handleTogglePinConversation = useCallback(
    async (conversationId: string, pinned: boolean) => {
      try {
        const updated = await setConversationPinned(conversationId, pinned)
        useChatStore.getState().updateConversation(conversationId, { metadata: updated.metadata })
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, metadata: updated.metadata } : c)),
        )
      } catch (err) {
        console.error('Pin conversation failed:', err)
        toast.error(
          pinned
            ? CONVERSATION_ACTIONS_TOAST_ERRORS.PIN_CONVERSATION_FAILED.userMessage
            : CONVERSATION_ACTIONS_TOAST_ERRORS.UNPIN_CONVERSATION_FAILED.userMessage,
        )
      }
    },
    [],
  )

  const handleToggleArchiveConversation = useCallback(
    async (conversationId: string, archived: boolean) => {
      try {
        const updated = await setConversationArchived(conversationId, archived)
        useChatStore.getState().updateConversation(conversationId, { status: updated.status })
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, status: updated.status } : c)),
        )
      } catch (err) {
        console.error('Archive conversation failed:', err)
        toast.error(
          archived ? 'Could not archive conversation' : 'Could not unarchive conversation',
        )
      }
    },
    [],
  )

  const handleMoveConversation = useCallback(
    async (conversationId: string, nextCampaignId: string | null) => {
      try {
        const updated = await assignConversationCampaign(conversationId, nextCampaignId)
        useChatStore
          .getState()
          .updateConversation(conversationId, { campaign_id: updated.campaign_id })
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, campaign_id: updated.campaign_id } : c,
          ),
        )
        toast.success(CONVERSATION_ACTIONS_TOAST_SUCCESS.MOVED_TO_CAMPAIGN.userMessage)
      } catch (err) {
        console.error('Move conversation failed:', err)
        toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.MOVE_CONVERSATION_FAILED.userMessage)
      }
    },
    [],
  )

  const handleDuplicateConversation = useCallback(
    async (conversationId: string) => {
      try {
        const newConv = await duplicateConversation(conversationId, {})
        if ((newConv.agent_id ?? activeAgentKey) === activeAgentKey) {
          setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)])
        }
        toast.success('Conversation duplicated')
      } catch (err) {
        console.error('Duplicate conversation failed:', err)
        toast.error('Could not duplicate conversation.')
      }
    },
    [activeAgentKey],
  )

  const buildConversationUrl = useCallback(
    (conversationId: string) => {
      if (typeof window === 'undefined') return ''
      return `${window.location.origin}${pathname}?hr_conv=${encodeURIComponent(conversationId)}`
    },
    [pathname],
  )

  const handleCopyConversationLink = useCallback(
    (conversationId: string) => {
      const url = buildConversationUrl(conversationId)
      if (!url) return
      try {
        void navigator.clipboard.writeText(url)
        toast.success('Link copied')
      } catch {
        toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [buildConversationUrl],
  )

  const handleCopyConversationId = useCallback((conversationId: string) => {
    try {
      void navigator.clipboard.writeText(conversationId)
      toast.success('ID copied')
    } catch {
      toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.COPY_FAILED.userMessage)
    }
  }, [])

  const handleOpenConversationInNewTab = useCallback(
    (conversationId: string) => {
      const url = buildConversationUrl(conversationId)
      if (!url) return
      openInNewTab(url)
    },
    [buildConversationUrl],
  )

  useEffect(() => {
    if (!railIntent) return
    if (railIntent === 'new') {
      handleNewConversation()
    } else if (railIntent === 'list') {
      setMode('conversations')
    }
    onRailIntentConsumed?.()
  }, [railIntent, handleNewConversation, onRailIntentConsumed])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TeamHrChatComposeDetail>).detail
      if (!detail?.text) return

      const panel = chatPanelRef.current
      if (!panel) return
      const rect = panel.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      if (detail.newConversation) {
        handleNewConversation()
      }
      setMode('chat')
      if (detail.submit) {
        void sendWithToast(detail.text)
        return
      }
      setComposerRestore({ text: detail.text, nonce: crypto.randomUUID() })
    }

    window.addEventListener(TEAM_HR_CHAT_COMPOSE_EVENT, handler)
    return () => window.removeEventListener(TEAM_HR_CHAT_COMPOSE_EVENT, handler)
  }, [handleNewConversation, sendWithToast])

  useEffect(() => {
    if (mode === 'checkpoints' && (!showCheckpoints || !focusedAgent?.editable)) setMode('chat')
  }, [mode, focusedAgent, showCheckpoints])

  const defaultModel = selectedConversation?.default_model_id ?? null
  const conversationModelSettings = useMemo(
    () => readConversationModelSettings(selectedConversation?.metadata),
    [selectedConversation?.metadata],
  )
  const sessionTitle = stripLegacySpacesConversationTitle(selectedConversation?.title)
  const chatHeaderActions = (
    <div
      className={cn(
        'gap-spacing-0 flex shrink-0 items-center transition-[opacity,transform] duration-200 ease-out',
        searchOpen
          ? 'pointer-events-auto translate-x-0 opacity-100'
          : 'pointer-events-none translate-x-4 opacity-0 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onCollapseChat?.()}
        className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
        aria-label={`Collapse ${activeAgentName} chat`}
        title={`Collapse ${activeAgentName} chat`}
      >
        <RxDoubleArrowLeft className="icon-sm" aria-hidden />
      </button>
      <motion.div
        initial={false}
        animate={{ width: searchOpen ? 180 : 0, opacity: searchOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="shrink-0 overflow-hidden"
      >
        <div className="relative w-[180px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="input-glass body-3 text-foreground h-spacing-8 rounded-spacing-2 py-spacing-1 pl-spacing-3 pr-spacing-8 w-full"
            autoFocus={searchOpen}
          />
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false)
              setSearchQuery('')
            }}
            className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
            aria-label="Close search"
            title="Close search"
          >
            <X className="icon-sm" />
          </button>
        </div>
      </motion.div>
      {!searchOpen ? (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
          aria-label="Search in conversation"
          title="Search"
        >
          <Search className="icon-sm" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void handleNewConversation()}
        className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
        aria-label="New conversation"
        title="New conversation"
      >
        <Plus className="icon-sm" />
      </button>
      {showCheckpoints && focusedAgent?.editable ? (
        <button
          type="button"
          onClick={() => setMode('checkpoints')}
          className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
          aria-label={`History for ${focusedAgent.name}`}
          title={`History · ${focusedAgent.name}`}
        >
          <GitBranch className="icon-sm" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setMode('conversations')}
        className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
        aria-label="Show conversations"
        title="Conversations"
      >
        <List className="icon-sm" />
      </button>
    </div>
  )

  const chatHeaderBlock = (
    <div className="pt-spacing-2 pb-spacing-1 relative shrink-0 px-3 md:px-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="min-h-spacing-10 gap-spacing-2 group flex items-center">
          <div className="flex shrink-0 items-center">
            {hrRosterEntry ? <TeamHrChatAgentIdentity entry={hrRosterEntry} /> : null}
          </div>
          {focusedAgent ? (
            <div className="px-spacing-2 min-w-0 flex-1 text-center leading-tight">
              <span
                className={cn(
                  'badge-glass body-4 rounded-spacing-2 px-spacing-2 gap-spacing-1 inline-flex max-w-full items-center truncate py-0.5 font-medium',
                  focusedAgent.editable ? 'badge-glass-orange' : 'badge-glass-muted',
                )}
              >
                {focusedAgent.editable ? null : <Lock className="icon-xs shrink-0" aria-hidden />}
                {focusedAgent.editable
                  ? `Editing ${focusedAgent.name}`
                  : `${focusedAgent.name} · read-only`}
              </span>
            </div>
          ) : sessionTitle ? (
            <Tooltip label={sessionTitle} side="bottom" wide triggerClassName="flex min-w-0 flex-1">
              <div className="body-3 text-muted-foreground px-spacing-2 w-full min-w-0 truncate text-center leading-tight">
                {sessionTitle}
              </div>
            </Tooltip>
          ) : (
            <div className="min-w-0 flex-1" aria-hidden />
          )}
          <div className="flex shrink-0 items-center">{chatHeaderActions}</div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-[var(--color-background)] to-transparent" />
    </div>
  )

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
              {chatHeaderBlock}

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

                  <div className="flex flex-1 flex-col gap-3">
                    {turnData.leadingMessages.map((m) => (
                      <div key={m.id} data-message-id={m.id}>
                        <MessageBubble
                          message={m}
                          isStreaming={m.id === streamingMessageId}
                          isEditable={m.id === lastUserMessageId}
                          onEditSubmit={m.id === lastUserMessageId ? handleEditSubmit : undefined}
                          conversationIdOverride={selectedConversationId}
                          knownSkillKeys={knownSkillKeys}
                          agentKey={activeAgentKey}
                          pinAssistantActions={m.id === pinnedAssistantMessageId}
                        />
                      </div>
                    ))}

                    {turnData.turns.map((turn, turnIdx) => {
                      const isLastTurn = turnIdx === turnData.turns.length - 1
                      const previousTurn = turnData.turns[turnIdx - 1]
                      return (
                        <div
                          key={turn.user.id}
                          data-turn-id={turn.user.id}
                          className={cn('relative flex flex-col', isLastTurn && 'flex-1')}
                        >
                          <ChatTurnChangeDivider
                            previousUserMessage={previousTurn?.user ?? null}
                            userMessage={turn.user}
                          />
                          <div
                            ref={isLastTurn ? lastUserPromptRef : undefined}
                            className="sticky top-0 z-10"
                          >
                            <div className="surface-bg">
                              <MessageBubble
                                message={turn.user}
                                isStreaming={false}
                                stickyUser
                                isEditable={turn.user.id === lastUserMessageId}
                                onEditSubmit={
                                  turn.user.id === lastUserMessageId ? handleEditSubmit : undefined
                                }
                                conversationIdOverride={selectedConversationId}
                                knownSkillKeys={knownSkillKeys}
                                agentKey={activeAgentKey}
                              />
                            </div>
                            <div className="pointer-events-none h-6 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
                          </div>

                          <div
                            className="flex flex-col gap-3"
                            style={
                              isLastTurn
                                ? {
                                    minHeight: Math.max(0, spacerHeight - lastUserPromptHeight),
                                  }
                                : undefined
                            }
                          >
                            {turn.responses.map((m) => (
                              <div key={m.id} data-message-id={m.id}>
                                <MessageBubble
                                  message={m}
                                  isStreaming={m.id === streamingMessageId}
                                  isEditable={m.id === lastUserMessageId}
                                  onEditSubmit={
                                    m.id === lastUserMessageId ? handleEditSubmit : undefined
                                  }
                                  conversationIdOverride={selectedConversationId}
                                  knownSkillKeys={knownSkillKeys}
                                  agentKey={activeAgentKey}
                                  pinAssistantActions={m.id === pinnedAssistantMessageId}
                                />
                              </div>
                            ))}
                            {isLastTurn ? (
                              <div className="mt-1">
                                <StatusIndicator conversationIdOverride={selectedConversationId} />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {creditsLow && !creditsExhausted ? (
                <div className="flex items-center justify-center gap-2 bg-amber-500/5 px-4 py-2">
                  <span className="body-3 text-amber-400">
                    Running low on credits ({creditsLowRemaining} remaining)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('open-account-settings', { detail: 'billing' }),
                      )
                    }}
                    className="body-3 font-medium text-amber-400 underline hover:text-amber-300"
                  >
                    Buy more
                  </button>
                </div>
              ) : null}

              {creditsExhausted ? (
                <div className="bg-[var(--color-destructive)]/5 flex flex-col items-center gap-3 px-4 py-4">
                  <p className="body-2 font-medium text-[var(--color-foreground)]">
                    You&apos;ve run out of credits
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-credit-purchase'))
                        useChatStore.getState().setCreditsExhausted(false)
                      }}
                      className="body-2 chip-glass-green rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
                    >
                      Buy More Credits
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('open-account-settings', { detail: 'billing' }),
                        )
                        useChatStore.getState().setCreditsExhausted(false)
                      }}
                      className="body-2 chip-glass-neutral rounded-lg px-4 py-2 font-medium transition-colors"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                </div>
              ) : null}

              <StreamInterruptedBar conversationId={selectedConversationId} />

              <div
                className={cn(
                  'relative flex flex-col items-center px-3 pb-3 pt-2 md:px-4',
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
                    onRemove={handleQueueRemove}
                    onSendNow={handleQueueSendNow}
                    onEdit={handleQueueEdit}
                  />
                  {selectedConversationReadOnly ? (
                    <div className="body-3 text-muted-foreground mb-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 border border-[var(--color-border)] text-center">
                      Read-only. Ask the owner for edit access.
                    </div>
                  ) : null}
                  <ComposerInputStack
                    stackActive={showComposerStack}
                    topSlot={
                      <>
                        {isStreaming && !selectedConversationReadOnly ? (
                          <ComposerActiveRunTipCard
                            stacked
                            conversationId={selectedConversationId}
                            isStreaming={isStreaming}
                          />
                        ) : null}
                        {showComposerTopAccessory ? composerTopAccessory : null}
                      </>
                    }
                  >
                    <ChatInput
                      onSend={handleComposerSendWithQueueEdit}
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
                      onStop={handleStop}
                      conversationId={selectedConversationId}
                      spaceId={spaceId}
                      setTextRef={setTextRef}
                      composerMirrorRef={composerMirrorRef}
                      onEnqueue={editingQueueItemId ? undefined : handleEnqueue}
                      onSendNow={handleQueueSendNowNext}
                      queueLength={queue.length}
                      placeholder={
                        flowBuildGateActive
                          ? (composerBlockedMessage ??
                            'Choose create or update a flow to start chatting')
                          : selectedConversationReadOnly
                            ? 'Read-only conversation'
                            : `Message ${activeAgentName}...`
                      }
                      initialValue={composerRestore?.text}
                      initialDocuments={composerRestore?.documents}
                      restoreNonce={composerRestore?.nonce}
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
                  void handleSelectConversation(conversationId)
                }
                onNewConversation={() => void handleNewConversation()}
                onDeleteConversation={(conversationId) =>
                  void handleDeleteConversation(conversationId)
                }
                onRenameConversation={handleRenameConversation}
                onTogglePinConversation={handleTogglePinConversation}
                onToggleArchiveConversation={handleToggleArchiveConversation}
                onMoveConversation={handleMoveConversation}
                onDuplicateConversation={handleDuplicateConversation}
                onCopyConversationLink={handleCopyConversationLink}
                onCopyConversationId={handleCopyConversationId}
                onOpenConversationInNewTab={handleOpenConversationInNewTab}
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
          onSharesChanged={() => void loadConversations()}
        />
      ) : null}
    </div>
  )
}
