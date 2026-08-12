'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { ChatInput } from '@/components/chat/ChatInputAdapter'
import { ChatTurnChangeDivider } from '@/components/chat/ChatTurnChangeDivider'
import { ComposerActiveRunTipCard } from '@/components/chat/ComposerActiveRunTipCard'
import { ComposerInputStack } from '@/components/chat/ComposerInputStack'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import { MessageQueue } from '@/components/chat/MessageQueue'
import { PlanStickyTracker } from '@/components/chat/PlanStickyTracker'
import { VoiceApprovalProvider } from '@/components/chat/VoiceApprovalContext'
import { ConversationHeaderTitle, ConversationShareModal } from '@/components/conversations'
import { globalChatSeedMatchesPanel } from '@/components/global-chat/lib/global-chat-seed-match'
import {
  GLOBAL_CHAT_AGENT_SWITCH_EVENT,
  GLOBAL_CHAT_SEED_EVENT,
  GLOBAL_CHAT_VOICE_START_EVENT,
  useGlobalChatStore,
  type GlobalChatAgentSwitchDetail,
  type GlobalChatSeedDetail,
  type GlobalChatVoiceStartDetail,
} from '@/components/global-chat/store/use-global-chat-store'
import { SHELL_EMPTY_CHAT_PLACEHOLDER } from '@/components/shell/shell-empty-chat-prompts.config'
import { ShellEmptyChatQuickStartPills } from '@/components/shell/ShellEmptyChatQuickStartPills'
import { ShellRightPanel } from '@/components/shell/ShellRightPanel'
import { useShellChatQuickStart } from '@/components/shell/use-shell-chat-quick-start'
import { useShellStore } from '@/components/shell/use-shell-store'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  useBrainLiveSession,
  type BrainLiveScope,
} from '@/features/brain/hooks/use-brain-live-session'
import { RateLimitCard } from '@/features/studio/components/chat/RateLimitCard'
import { StatusIndicator } from '@/features/studio/components/chat/StatusIndicator'
import { StreamInterruptedBar } from '@/features/studio/components/chat/StreamInterruptedBar'
import {
  assignConversationCampaign,
  clearConversationTeamDraft,
  createNewConversation,
  deleteConversation,
  deleteMessagesFrom,
  duplicateConversation,
  fetchConversations,
  fetchMessages,
  isStreamActive,
  mergeMessagesPreservingOrderedBlocks,
  needsStreamRecovery,
  readConversationModelSettings,
  recoverConversation,
  renameConversation,
  requestStopStream,
  selectConversation,
  sendMessageStreaming,
  setConversationArchived,
  setConversationPinned,
  shouldSkipStreamRecovery,
  suggestConversationTitle,
  type ChatModelSettings,
} from '@/features/studio/services/chat.service'
import { spaceConversationsCache } from '@/features/studio/services/space-conversations-cache'
import { initStreamResilience } from '@/features/studio/services/stream-resilience'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { useFunnelCommentsChatStore } from '@/features/studio/store/use-funnel-comments-chat-store'
import { useFunnelDesignChatStore } from '@/features/studio/store/use-funnel-design-chat-store'
import { useFunnelFullModeStore } from '@/features/studio/store/use-funnel-full-mode-store'
import { useFunnelTweaksChatStore } from '@/features/studio/store/use-funnel-tweaks-chat-store'
import { usePresentationCommentsChatStore } from '@/features/studio/store/use-presentation-comments-chat-store'
import { usePresentationDesignChatStore } from '@/features/studio/store/use-presentation-design-chat-store'
import { usePresentationFullModeStore } from '@/features/studio/store/use-presentation-full-mode-store'
import { usePresentationTweaksChatStore } from '@/features/studio/store/use-presentation-tweaks-chat-store'
import type {
  Conversation,
  DocumentAttachment,
  HighlightedArtifact,
  MessageReference,
} from '@/features/studio/types'
import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchCampaign } from '@/lib/campaigns/campaign-api'
import { resolvePinnedAssistantMessageId } from '@/lib/chat/assistant-message-actions'
import type { AttachedArtifact } from '@/lib/chat/attached-artifact'
import { toastMessageForChatSendError } from '@/lib/chat/chat-stream-errors.config'
import { CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import { getLastAssistantMessage, isAssistantTurnComplete } from '@/lib/chat/chat-turn-completion'
import { filterMessagesByQuery } from '@/lib/chat/conversation-search'
import { useActiveArtifactSelectionSignal } from '@/lib/chat/use-active-artifact-selection-signal'
import { resolveSuggestedConversationTitle } from '@/lib/conversations/conversation-title'
import { useOrgStore } from '@/lib/org/org-context-store'
import { cn } from '@/lib/utils/cn'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  SPACES_ACTIONS_TOAST_ERRORS,
  SPACES_ACTIONS_TOAST_SUCCESS,
} from '../../config/spaces-toast-errors.config'
import {
  persistActiveConversationId,
  readStoredAgentConversationId,
  useSpacesStore,
} from '../../store/use-spaces-store'
import {
  buildSpaceTaskChatDragPayload,
  resolveSpaceTaskStatusDisplay,
  resolveSpaceTaskStatusDotColor,
} from '../space-item-values'
import { buildSpaceAwarenessContext } from './build-space-awareness-context'
import { ChatPanelSlideStack } from './ChatPanelSlideTransition'
import {
  buildSpaceChatTurnData,
  buildSpaceVoiceRunTasks,
  collectVisibleUndoMessageIds,
  filterVisibleSpaceChatMessages,
  filterVoiceDelegationMessages,
  findLastEditableUserMessageId,
} from './space-vibey-chat-messages.logic'
import {
  resolveSpaceChatPanelMode,
  resolveSpaceChatSpecialMode,
  type SpaceChatMode,
} from './space-vibey-chat-mode-sync'
import {
  BOTTOM_SCROLL_THRESHOLD,
  EMPTY_MESSAGES,
  EMPTY_QUEUE,
  VIBEY_ROSTER_FALLBACK,
} from './space-vibey-chat-panel.constants'
import {
  buildSpaceChatConversationUrl,
  bumpSpaceVibeyChatPanelLoadEpoch,
  conversationBelongsToChannel,
  conversationBelongsToSpace,
  conversationNeedsMessageHydration,
  DEFAULT_SPACE_CHAT_AGENT_KEY,
  getConversationAgentKey,
  getSpaceVibeyChatPanelLoadEpoch,
  HOME_CHAT_SEED_STORAGE_KEY,
  isHomeChatSeedPending,
  isSpaceVibeyChatPanelLoadCurrent,
  mergeConversationLists,
  readHomeChatSeedForSpace,
  resolvePendingConversationSelection,
  resolvePostLoadConversationSelection,
  resolvePreferredConversationOpenId,
  resolveSpaceChatAutoFocusTarget,
  resolveSpaceChatScope,
  resolveSpaceChatSeedSendOptions,
  resolveSpaceChatSendAgentKey,
} from './space-vibey-chat-panel.logic'
import type { SpaceVibeyChatPanelProps } from './space-vibey-chat-panel.types'
import {
  resolveSpaceChatEmptyStateAgent,
  SpaceChatAgentEmptyState,
} from './SpaceChatAgentEmptyState'
import { SpaceChatAgentPicker } from './SpaceChatAgentPicker'
import { SpaceChatHeaderActions } from './SpaceChatHeaderActions'
import { SpaceChatSubPanel } from './SpaceChatSubPanel'
import { SpaceUndoButton } from './SpaceUndoButton'
import type { SpaceVoiceRunTask } from './SpaceVoiceRunsView'
import { SpaceVoiceSessionView } from './SpaceVoiceSessionView'
import { stripLegacySpacesConversationTitle } from './strip-legacy-spaces-conversation-title'

type ChatMode = SpaceChatMode
type ConversationAgentScope = 'active' | 'all'
type FocusedArtifact = {
  type: string
  id: string
  name: string
  spaceId?: string
  docSource?: string
  docKind?: string
}

export function SpaceVibeyChatPanel({
  spaceId,
  chatSurface,
  campaignId,
  campaignName,
  channelContext,
  brainContext,
  teamOpsContext,
  onCollapseChat,
  shellSidebarChrome = false,
  headerLayout = 'compact',
  headerLeadingAction,
  composerContextSlot,
  preferredConversationId,
  awarenessContextOverride,
}: SpaceVibeyChatPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isChannelScope = Boolean(channelContext?.channelId)
  const chatScopeId = channelContext?.channelId ?? spaceId ?? ''
  const chatScopeStorageId = isChannelScope ? `channel:${chatScopeId}` : chatScopeId || 'general'
  const [mode, setMode] = useState<ChatMode>('chat')
  const presentationCommentsSession = usePresentationCommentsChatStore((s) => s.session)
  const presentationCommentsActive = usePresentationCommentsChatStore((s) => s.commentsChatActive)
  const presentationComments = usePresentationCommentsChatStore((s) => s.comments)
  const addPresentationComment = usePresentationCommentsChatStore((s) => s.addComment)
  const resolvePresentationComment = usePresentationCommentsChatStore((s) => s.resolveComment)
  const sendPresentationCommentsToVibe = usePresentationCommentsChatStore(
    (s) => s.sendCommentsToVibe,
  )
  const setPresentationCommentsChatActive = usePresentationCommentsChatStore(
    (s) => s.setCommentsChatActive,
  )
  const presentationDesignSession = usePresentationDesignChatStore((s) => s.session)
  const presentationDesignActive = usePresentationDesignChatStore((s) => s.designChatActive)
  const presentationDesignBundle = usePresentationDesignChatStore((s) => s.bundle)
  const presentationDesignSelectedTrace = usePresentationDesignChatStore((s) => s.selectedTrace)
  const savePresentationDesignFile = usePresentationDesignChatStore((s) => s.saveFile)
  const setPresentationDesignChatActive = usePresentationDesignChatStore(
    (s) => s.setDesignChatActive,
  )
  const presentationTweaksSession = usePresentationTweaksChatStore((s) => s.session)
  const presentationTweaksActive = usePresentationTweaksChatStore((s) => s.tweaksChatActive)
  const presentationTweaksBundle = usePresentationTweaksChatStore((s) => s.bundle)
  const setPresentationTweaksChatActive = usePresentationTweaksChatStore(
    (s) => s.setTweaksChatActive,
  )
  const setPresentationFullMode = usePresentationFullModeStore((s) => s.setMode)
  const funnelCommentsSession = useFunnelCommentsChatStore((s) => s.session)
  const funnelCommentsActive = useFunnelCommentsChatStore((s) => s.commentsChatActive)
  const funnelComments = useFunnelCommentsChatStore((s) => s.comments)
  const addFunnelComment = useFunnelCommentsChatStore((s) => s.addComment)
  const resolveFunnelComment = useFunnelCommentsChatStore((s) => s.resolveComment)
  const sendFunnelCommentsToVibe = useFunnelCommentsChatStore((s) => s.sendCommentsToVibe)
  const setFunnelCommentsChatActive = useFunnelCommentsChatStore((s) => s.setCommentsChatActive)
  const funnelDesignSession = useFunnelDesignChatStore((s) => s.session)
  const funnelDesignActive = useFunnelDesignChatStore((s) => s.designChatActive)
  const funnelDesignBundle = useFunnelDesignChatStore((s) => s.bundle)
  const funnelDesignSelectedTrace = useFunnelDesignChatStore((s) => s.selectedTrace)
  const saveFunnelDesignFile = useFunnelDesignChatStore((s) => s.saveFile)
  const setFunnelDesignChatActive = useFunnelDesignChatStore((s) => s.setDesignChatActive)
  const funnelTweaksSession = useFunnelTweaksChatStore((s) => s.session)
  const funnelTweaksActive = useFunnelTweaksChatStore((s) => s.tweaksChatActive)
  const setFunnelTweaksChatActive = useFunnelTweaksChatStore((s) => s.setTweaksChatActive)
  const setFunnelFullMode = useFunnelFullModeStore((s) => s.setMode)
  // Paint cached conversations and valid selection before background revalidation.
  const [conversations, setConversations] = useState<Conversation[]>(
    () => spaceConversationsCache.get(chatScopeStorageId) ?? [],
  )
  const [conversationAgentScope, setConversationAgentScope] =
    useState<ConversationAgentScope>('active')
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationQuery, setConversationQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    const cached = spaceConversationsCache.get(chatScopeStorageId)
    if (!cached?.length) return null
    const stored = readStoredAgentConversationId(chatScopeStorageId, DEFAULT_SPACE_CHAT_AGENT_KEY)
    if (!stored) return null
    const match = cached.find((conversation) => conversation.id === stored)
    return match && getConversationAgentKey(match) === DEFAULT_SPACE_CHAT_AGENT_KEY ? stored : null
  })
  const [knownSkillKeys, setKnownSkillKeys] = useState<Set<string>>(new Set())
  const [campaignModelStrategy, setCampaignModelStrategy] = useState<string | null>(null)
  const [campaignConfigVersion, setCampaignConfigVersion] = useState(0)
  const [composerRestore, setComposerRestore] = useState<{
    text: string
    documents?: DocumentAttachment[]
    nonce: string
  } | null>(null)
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(null)
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const [draftAgentKey, setDraftAgentKey] = useState(
    () => useGlobalChatStore.getState().activeAgentKey || DEFAULT_SPACE_CHAT_AGENT_KEY,
  )
  const [voiceActive, setVoiceActive] = useState(false)
  const spacesRoster = useSpacesStore((s) => s.roster)
  const spacesRosterLoaded = useSpacesStore((s) => s.rosterLoaded)
  const [spacerHeight, setSpacerHeight] = useState(0)
  const [lastUserPromptHeight, setLastUserPromptHeight] = useState(0)
  const activeViewId = useSpacesStore((s) => s.activeViewId)
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const items = useSpacesStore((s) => s.items)
  const pendingOpenConversationId = useSpacesStore((s) => s.pendingOpenConversationId)
  const clearPendingOpenConversation = useSpacesStore((s) => s.clearPendingOpenConversation)
  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? null
  const activeView = activeSpace?.schema?.views?.find((view) => view.id === activeViewId) ?? null
  const spaceStatusFieldDef = useMemo(
    () => activeSpace?.schema?.fields?.find((f) => f.id === 'status') ?? null,
    [activeSpace],
  )

  const spaceComposerSpaceTasks = useMemo(() => {
    if (!spaceId) return []
    const rows = items.filter(
      (item) =>
        item.space_id === spaceId && !(item.custom_data as Record<string, unknown>)?._view_type,
    )
    return [...rows]
      .sort((a, b) =>
        buildSpaceTaskChatDragPayload(a).label.localeCompare(
          buildSpaceTaskChatDragPayload(b).label,
        ),
      )
      .map((item) => {
        const { id, label } = buildSpaceTaskChatDragPayload(item)
        return {
          id,
          label,
          statusLabel: resolveSpaceTaskStatusDisplay(item, spaceStatusFieldDef),
          statusDotColor: resolveSpaceTaskStatusDotColor(item, spaceStatusFieldDef),
        }
      })
  }, [items, spaceId, spaceStatusFieldDef])
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const conversationShareOrgName = useOrgStore(
    (s) => s.getActiveOrg()?.organizations.name ?? 'Workspace',
  )
  const isOrgContext = activeOrgId !== null
  const uiSelectedArtifact = useActiveArtifactSelectionSignal()
  const focusedArtifactRef = useRef<FocusedArtifact | null>(null)
  const lastAutoFocusKeyRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const lastUserPromptRef = useRef<HTMLDivElement>(null)
  const spacerHeightRef = useRef(0)
  const lastUserPromptHeightRef = useRef(0)
  const setTextRef = useRef<((text: string) => void) | null>(null)
  const composerMirrorRef = useRef('')
  const quickStart = useShellChatQuickStart(setTextRef, () => undefined)
  const previousMessageCountRef = useRef(0)
  const isProgrammaticScrollRef = useRef(false)
  const initialHydrationRef = useRef<string | null>(null)
  const prevStreamingRef = useRef(false)
  const homeSeedConsumedRef = useRef(false)
  const globalSeedConsumedRef = useRef<string | null>(null)
  const loadConversationsSeqRef = useRef(0)
  const lastConversationsLoadSigRef = useRef<string | null>(null)
  const voiceStartedRef = useRef(false)
  const externalSendInFlightRef = useRef(false)
  useEffect(() => {
    homeSeedConsumedRef.current = false
  }, [chatScopeStorageId])

  // Invalidate in-flight list loads when this panel instance unmounts/remounts.
  // Instance seq refs alone cannot stop orphaned completions from wiping the global store.
  useEffect(() => {
    const epoch = bumpSpaceVibeyChatPanelLoadEpoch()
    return () => {
      if (getSpaceVibeyChatPanelLoadEpoch() === epoch) {
        bumpSpaceVibeyChatPanelLoadEpoch()
      }
    }
  }, [])

  // Reset local state from the new scope cache before syncing it.
  const conversationsScopeRef = useRef(chatScopeStorageId)
  useEffect(() => {
    if (conversationsScopeRef.current !== chatScopeStorageId) {
      conversationsScopeRef.current = chatScopeStorageId
      setConversations(spaceConversationsCache.get(chatScopeStorageId) ?? [])
      return
    }
    spaceConversationsCache.set(chatScopeStorageId, conversations)
  }, [chatScopeStorageId, conversations])

  // Hydrate a synchronously restored cached selection.
  const initialCachedSelectionRef = useRef(selectedConversationId)
  useEffect(() => {
    const conversationId = initialCachedSelectionRef.current
    if (conversationId) void selectConversation(conversationId)
  }, [])

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
  const voiceDelegationMessages = useMemo(
    () => filterVoiceDelegationMessages(allMessages),
    [allMessages],
  )
  const messages = useMemo(() => filterVisibleSpaceChatMessages(allMessages), [allMessages])

  const displayMessages = useMemo(
    () => filterMessagesByQuery(messages, searchQuery),
    [messages, searchQuery],
  )

  const visibleUndoMessageIds = useMemo(() => collectVisibleUndoMessageIds(messages), [messages])

  const isStreaming = selectedConversationId
    ? streamingConversationIds.includes(selectedConversationId)
    : false
  const isStopping = selectedConversationId
    ? stoppingConversationIds.includes(selectedConversationId)
    : false

  const queue = useChatStore((s) =>
    selectedConversationId
      ? (s.messageQueueByConversation[selectedConversationId] ?? EMPTY_QUEUE)
      : EMPTY_QUEUE,
  )

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )
  const [scopeOverride, setScopeOverride] = useState<{
    campaignId: string | null
    spaceId: string | null
  } | null>(null)
  useEffect(() => {
    setScopeOverride(null)
  }, [chatScopeStorageId, selectedConversationId])
  const effectiveScope = resolveSpaceChatScope(
    selectedConversation,
    { campaignId, spaceId: spaceId ?? null },
    scopeOverride,
  )
  const effectiveCampaignId = effectiveScope.campaignId
  const effectiveSpaceId = effectiveScope.spaceId
  const scopeMatchesVisibleSpace = effectiveSpaceId === (spaceId ?? null)
  const selectedConversationLevel = selectedConversation?.effective_level ?? 'admin'
  const selectedConversationReadOnly = selectedConversationLevel === 'view'
  const externalSendStateRef = useRef({
    campaignId: effectiveCampaignId,
    enqueueMessage,
    isStopping,
    isStreaming,
    selectedConversationId,
    selectedConversationReadOnly,
  })
  externalSendStateRef.current = {
    campaignId: effectiveCampaignId,
    enqueueMessage,
    isStopping,
    isStreaming,
    selectedConversationId,
    selectedConversationReadOnly,
  }

  const chatAgents = useMemo(() => {
    // Loop is the Flows specialist and stays hidden on every other surface.
    const allowLoop = chatSurface === 'flows'
    const agents = spacesRoster.filter(
      (entry) =>
        entry.kind === 'agent' && entry.agent_key && (allowLoop || entry.agent_key !== 'loop'),
    )
    const sorted = [...agents].sort((a, b) => a.display_name.localeCompare(b.display_name))
    if (sorted.some((entry) => entry.agent_key === DEFAULT_SPACE_CHAT_AGENT_KEY)) return sorted
    return [VIBEY_ROSTER_FALLBACK, ...sorted]
  }, [chatSurface, spacesRoster])

  const activeAgentKey =
    selectedConversation?.agent_id?.trim() || draftAgentKey || DEFAULT_SPACE_CHAT_AGENT_KEY

  // Re-run only when the actual agent-key set changes.
  const chatAgentKeysKey = useMemo(
    () =>
      Array.from(
        new Set([
          activeAgentKey,
          ...chatAgents
            .map((agent) => agent.agent_key)
            .filter((key): key is string => typeof key === 'string' && key.length > 0),
        ]),
      )
        .sort()
        .join(','),
    [activeAgentKey, chatAgents],
  )

  const activeAgentConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) => getConversationAgentKey(conversation) === activeAgentKey,
      ),
    [activeAgentKey, conversations],
  )

  const visibleConversations = useMemo(
    () => (conversationAgentScope === 'all' ? conversations : activeAgentConversations),
    [activeAgentConversations, conversationAgentScope, conversations],
  )

  const conversationAgentByKey = useMemo(() => {
    const entries: Record<string, { name: string; avatarUrl: string | null }> = {}
    for (const agent of chatAgents) {
      if (!agent.agent_key) continue
      entries[agent.agent_key] = {
        name: agent.display_name,
        avatarUrl: agent.avatar_url ?? null,
      }
    }
    return entries
  }, [chatAgents])

  const activeAgentName = useMemo(() => {
    const match = chatAgents.find((entry) => entry.agent_key === activeAgentKey)
    return match?.display_name ?? activeAgentKey
  }, [activeAgentKey, chatAgents])

  const activeVoiceAgent = useMemo(
    () => chatAgents.find((entry) => entry.agent_key === activeAgentKey) ?? VIBEY_ROSTER_FALLBACK,
    [activeAgentKey, chatAgents],
  )

  const voiceScope: BrainLiveScope = useMemo(
    () => ({
      type: 'agent',
      agentId: activeAgentKey,
      label: activeVoiceAgent.display_name,
      avatarUrl: activeVoiceAgent.avatar_url ?? undefined,
      conversationId: selectedConversationId,
    }),
    [
      activeAgentKey,
      activeVoiceAgent.avatar_url,
      activeVoiceAgent.display_name,
      selectedConversationId,
    ],
  )

  const voiceSession = useBrainLiveSession(voiceScope)
  const voiceRunTasks = useMemo<SpaceVoiceRunTask[]>(
    () => buildSpaceVoiceRunTasks(voiceDelegationMessages, voiceSession.delegationTasks),
    [voiceDelegationMessages, voiceSession.delegationTasks],
  )
  const hasRunningVoiceTasks = voiceRunTasks.some((task) => task.status === 'running')
  const hasVoiceTasks = voiceRunTasks.length > 0

  const emptyStateAgent = useMemo(
    () => resolveSpaceChatEmptyStateAgent(chatAgents, activeAgentKey, VIBEY_ROSTER_FALLBACK),
    [activeAgentKey, chatAgents],
  )
  const turnData = useMemo(() => buildSpaceChatTurnData(displayMessages), [displayMessages])
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

  // The share modal reuses the store's full human roster.
  const roster = useMemo(
    () => (isOrgContext ? spacesRoster.filter((entry) => entry.kind === 'human') : []),
    [isOrgContext, spacesRoster],
  )

  useEffect(() => {
    initStreamResilience()
  }, [])

  useEffect(() => {
    const handler = () => {
      invalidateCachedFetch('campaign:')
      setCampaignConfigVersion((v) => v + 1)
    }
    window.addEventListener('campaign-config-updated', handler)
    return () => window.removeEventListener('campaign-config-updated', handler)
  }, [])

  useEffect(() => {
    if (!effectiveCampaignId) {
      setCampaignModelStrategy(null)
      return
    }
    let cancelled = false
    cachedFetch(`campaign:${effectiveCampaignId}`, () => fetchCampaign(effectiveCampaignId), {
      ttlMs: 60_000,
    })
      .then((campaign) => {
        if (cancelled) return
        const config = (campaign.config ?? {}) as Record<string, unknown>
        const agentSettings = (config.agent_settings as Record<string, unknown> | undefined) ?? {}
        const strategy = agentSettings.model_strategy as string | undefined
        setCampaignModelStrategy(strategy && strategy.trim().length > 0 ? strategy : null)
      })
      .catch(() => {
        if (!cancelled) setCampaignModelStrategy(null)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveCampaignId, campaignConfigVersion])

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

  const loadConversations = useCallback(
    async (options?: { force?: boolean }) => {
      if (!chatScopeId) {
        return
      }
      if (!isChannelScope && spaceId && isHomeChatSeedPending(spaceId, searchParams)) {
        return
      }
      // Wait for the full roster before the single legacy-agent fetch.
      if (!isChannelScope && !spacesRosterLoaded) {
        return
      }

      // Ignore dependency identity churn and channel-only roster changes.
      const loadSignature = isChannelScope
        ? `${chatScopeStorageId}|${activeAgentKey}`
        : `${chatScopeStorageId}|${chatAgentKeysKey}|${activeAgentKey}`
      if (!options?.force && lastConversationsLoadSigRef.current === loadSignature) {
        return
      }

      const epochAtStart = getSpaceVibeyChatPanelLoadEpoch()
      const seq = ++loadConversationsSeqRef.current
      // Only show the loading state when there's nothing cached to paint —
      // otherwise this is a background revalidation of visible rows.
      const hasCachedList = (spaceConversationsCache.get(chatScopeStorageId)?.length ?? 0) > 0
      if (!hasCachedList) setConversationsLoading(true)
      try {
        const legacyAgentKeys = isChannelScope ? [] : chatAgentKeysKey.split(',').filter(Boolean)
        // One space-scoped request + one multi-agent legacy request (the backend
        // accepts a comma-separated agent_id list) instead of N per-agent calls.
        // cachedFetch (ttl 0) only dedupes concurrent duplicates — StrictMode
        // double-effects and duplicate mounts share a single request.
        const [scopeResult, legacyResult] = await Promise.allSettled([
          cachedFetch(`conversations:scope:${chatScopeStorageId}`, () =>
            isChannelScope
              ? fetchConversations(undefined, undefined, undefined, { channelId: chatScopeId })
              : fetchConversations(undefined, undefined, undefined, { spaceId }),
          ),
          legacyAgentKeys.length > 0
            ? cachedFetch(`conversations:agents:${legacyAgentKeys.join(',')}`, () =>
                fetchConversations(undefined, legacyAgentKeys.join(',')),
              )
            : Promise.resolve<Conversation[]>([]),
        ])
        const scopeList = scopeResult.status === 'fulfilled' ? scopeResult.value : []
        const legacyList = legacyResult.status === 'fulfilled' ? legacyResult.value : []
        if (scopeResult.status === 'rejected' && legacyResult.status === 'rejected') {
          throw scopeResult.reason
        }
        // Remount/unmount invalidates epoch; newer same-instance loads bump seq.
        if (!isSpaceVibeyChatPanelLoadCurrent(epochAtStart)) return
        if (seq !== loadConversationsSeqRef.current) return
        lastConversationsLoadSigRef.current = loadSignature
        const list = mergeConversationLists(scopeList, legacyList)
        list.forEach((c) => useChatStore.getState().addConversation(c))
        setConversations(list)

        const drawerConversationId = shellSidebarChrome
          ? useShellStore.getState().chatDrawer.conversationId
          : null
        const preferredOpenId = resolvePreferredConversationOpenId({
          pendingOpenConversationId:
            preferredConversationId ??
            useGlobalChatStore.getState().meetingContext?.conversationId ??
            useSpacesStore.getState().pendingOpenConversationId,
          shellDrawerConversationId: drawerConversationId,
        })

        const chatRailIntentIsNew = useSpacesStore.getState().chatRailIntent === 'new'
        if (chatRailIntentIsNew && preferredOpenId) {
          useSpacesStore.getState().setChatRailIntent(null)
        }

        const stored = readStoredAgentConversationId(chatScopeStorageId, activeAgentKey)
        const storedValid = Boolean(
          stored &&
          list.some(
            (conversation) =>
              conversation.id === stored &&
              getConversationAgentKey(conversation) === activeAgentKey,
          ),
        )
        const selection = resolvePostLoadConversationSelection({
          chatRailIntentIsNew: chatRailIntentIsNew && !preferredOpenId,
          preferredOpenId,
          storeActiveConversationId: useChatStore.getState().activeConversationId,
          storedValidConversationId: storedValid ? stored : null,
          conversationIdsInList: new Set(list.map((conversation) => conversation.id)),
        })

        if (selection.action === 'select') {
          if (useSpacesStore.getState().pendingOpenConversationId) {
            useSpacesStore.getState().clearPendingOpenConversation()
          }
          setSelectedConversationId(selection.conversationId)
          persistActiveConversationId(chatScopeStorageId, selection.conversationId, activeAgentKey)
          useChatStore.getState().setActiveConversationId(selection.conversationId)
          if (
            conversationNeedsMessageHydration(selection.conversationId, useChatStore.getState())
          ) {
            void selectConversation(selection.conversationId)
          }
          return
        }

        setSelectedConversationId(null)
        persistActiveConversationId(chatScopeStorageId, null, activeAgentKey)
        useChatStore.getState().setActiveConversationId(null)
      } finally {
        if (
          isSpaceVibeyChatPanelLoadCurrent(epochAtStart) &&
          seq === loadConversationsSeqRef.current
        ) {
          setConversationsLoading(false)
        }
      }
    },
    [
      activeAgentKey,
      chatAgentKeysKey,
      chatScopeId,
      chatScopeStorageId,
      isChannelScope,
      searchParams,
      spaceId,
      spacesRosterLoaded,
      shellSidebarChrome,
      preferredConversationId,
    ],
  )

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  // Meeting / task open paths set preferredConversationId before (or without) list hydration.
  // Do not wait for loadConversations — it can early-return on roster/scope and leave a blank Pixel pane
  // while the shell store already has activeConversationId stamped.
  useEffect(() => {
    if (!preferredConversationId) return
    const conversation =
      resolvePendingConversationSelection(conversations, preferredConversationId) ??
      resolvePendingConversationSelection(
        useChatStore.getState().conversations,
        preferredConversationId,
      )
    if (conversation) {
      setConversations((current) => {
        if (current.some((row) => row.id === conversation.id)) return current
        return mergeConversationLists(current, [conversation])
      })
    }
    // Unknown meeting threads default to vibey — never inherit a leftover Delegator filter.
    const conversationAgentKey = conversation
      ? getConversationAgentKey(conversation)
      : DEFAULT_SPACE_CHAT_AGENT_KEY
    setDraftAgentKey(conversationAgentKey)
    useGlobalChatStore.getState().setActiveAgentKey(conversationAgentKey)
    if (selectedConversationId !== preferredConversationId) {
      setSelectedConversationId(preferredConversationId)
      persistActiveConversationId(chatScopeStorageId, preferredConversationId, conversationAgentKey)
      useChatStore.getState().setActiveConversationId(preferredConversationId)
    }
    if (conversationNeedsMessageHydration(preferredConversationId, useChatStore.getState())) {
      void selectConversation(preferredConversationId)
    }
    setMode('chat')
  }, [preferredConversationId, selectedConversationId, conversations, chatScopeStorageId])

  useEffect(() => {
    if (!pendingOpenConversationId || conversationsLoading) return
    const conversationId = pendingOpenConversationId
    const conversation =
      resolvePendingConversationSelection(conversations, conversationId) ??
      resolvePendingConversationSelection(useChatStore.getState().conversations, conversationId)
    if (conversation) {
      setConversations((current) => {
        if (current.some((row) => row.id === conversation.id)) return current
        return mergeConversationLists(current, [conversation])
      })
    }
    clearPendingOpenConversation()
    const conversationAgentKey = conversation
      ? getConversationAgentKey(conversation)
      : DEFAULT_SPACE_CHAT_AGENT_KEY
    setDraftAgentKey(conversationAgentKey)
    useGlobalChatStore.getState().setActiveAgentKey(conversationAgentKey)
    setSelectedConversationId(conversationId)
    persistActiveConversationId(chatScopeStorageId, conversationId, conversationAgentKey)
    if (conversationNeedsMessageHydration(conversationId, useChatStore.getState())) {
      void selectConversation(conversationId)
    }
    setMode('chat')
  }, [
    pendingOpenConversationId,
    conversationsLoading,
    conversations,
    chatScopeStorageId,
    clearPendingOpenConversation,
  ])

  // Keep shell drawer conversation id in sync so pen restore reopens this thread.
  useEffect(() => {
    if (!shellSidebarChrome || !selectedConversationId) return
    if (useSpacesStore.getState().chatRailIntent === 'new') return
    const drawer = useShellStore.getState().chatDrawer
    if (!drawer.open) return
    if (drawer.conversationId === selectedConversationId) return
    useShellStore.getState().openChatDrawer(selectedConversationId)
  }, [selectedConversationId, shellSidebarChrome])

  useEffect(() => {
    const handleArtifactFocus = (event: Event) => {
      const detail = (event as CustomEvent).detail as FocusedArtifact | undefined
      if (!detail?.id || !detail.type || !detail.name) return
      focusedArtifactRef.current = detail
    }
    const clearFocus = () => {
      focusedArtifactRef.current = null
    }
    window.addEventListener('space:artifact-focus', handleArtifactFocus as EventListener)
    window.addEventListener('space:focus-view-type', clearFocus)
    return () => {
      window.removeEventListener('space:artifact-focus', handleArtifactFocus as EventListener)
      window.removeEventListener('space:focus-view-type', clearFocus)
    }
  }, [])

  useEffect(() => {
    const target = resolveSpaceChatAutoFocusTarget(messages)
    if (!target || lastAutoFocusKeyRef.current === target.key) return
    lastAutoFocusKeyRef.current = target.key
    window.dispatchEvent(
      new CustomEvent('space:focus-view-type', { detail: { view_type: target.viewType } }),
    )
  }, [messages])

  const buildContextForSend = useCallback(() => {
    if (awarenessContextOverride?.trim()) return awarenessContextOverride.trim()
    if (isChannelScope) return channelContext?.awarenessContext ?? ''
    if (chatSurface === 'brain') return brainContext?.awarenessContext ?? ''
    if (chatSurface === 'team' && teamOpsContext?.awarenessContext) {
      return teamOpsContext.awarenessContext
    }
    if (chatSurface !== 'spaces') return ''
    return buildSpaceAwarenessContext({
      activeViewType: scopeMatchesVisibleSpace ? activeView?.type : undefined,
      activeViewName: scopeMatchesVisibleSpace ? activeView?.name : undefined,
      campaignName: scopeMatchesVisibleSpace ? campaignName : undefined,
      focusedArtifact: scopeMatchesVisibleSpace ? focusedArtifactRef.current : null,
    })
  }, [
    activeView?.name,
    activeView?.type,
    awarenessContextOverride,
    brainContext,
    campaignName,
    channelContext,
    chatSurface,
    isChannelScope,
    scopeMatchesVisibleSpace,
    teamOpsContext,
  ])

  const lastUserMessageId = findLastEditableUserMessageId(messages, isStreaming)

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
        const row = conversations.find((s) => s.id === selectedConversationId)
        const meta = row?.metadata as Record<string, unknown> | undefined
        const hadTeamDraft = meta?.team_draft === true
        if (hadTeamDraft) await clearConversationTeamDraft(selectedConversationId)

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

        await deleteMessagesFrom(selectedConversationId, backendLastUser.id)
        useChatStore
          .getState()
          .setMessages(selectedConversationId, backendMessages.slice(0, backendLastUserIndex))

        const systemContext = buildContextForSend()
        await sendMessageStreaming({
          conversation_id: selectedConversationId,
          content: newContent,
          model: model || defaultModel || undefined,
          documents,
          campaign_id: isChannelScope ? null : effectiveCampaignId,
          space_id: isChannelScope ? null : effectiveSpaceId,
          scope_kind: isChannelScope ? undefined : effectiveCampaignId ? 'campaign' : 'personal',
          model_settings: modelSettings,
          system_context: systemContext,
        })
      } catch (err) {
        console.error('Edit submit failed:', err)
        toast.error(CHAT_TOAST_ERRORS.CHAT_RESEND_FAILED.userMessage)
      }
    },
    [
      buildContextForSend,
      activeAgentKey,
      effectiveCampaignId,
      effectiveSpaceId,
      conversations,
      isChannelScope,
      lastUserMessageId,
      selectedConversationId,
      selectedConversation?.default_model_id,
    ],
  )
  const spaceSend = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
      extraSystemContext?: string,
      options?: { forceNewConversation?: boolean; agentKey?: string },
    ) => {
      const forceNew = Boolean(options?.forceNewConversation)
      const sendAgentKey = resolveSpaceChatSendAgentKey(activeAgentKey, options?.agentKey)
      if (!forceNew && selectedConversationId && isStopping) return
      const systemContext = [
        buildContextForSend(),
        extraSystemContext ?? quickStart.buildSendContext(content),
      ]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join('\n\n')
      const msgsBefore =
        (!forceNew && selectedConversationId
          ? useChatStore.getState().messagesByConversation[selectedConversationId]
          : null) ?? []
      const isFirstMessageInThread = forceNew || msgsBefore.length === 0

      let conversationId = forceNew ? null : selectedConversationId
      if (!conversationId) {
        const conversation = await createNewConversation({
          agent_id: sendAgentKey,
          ...(!isChannelScope && effectiveCampaignId ? { campaign_id: effectiveCampaignId } : {}),
          metadata: isChannelScope
            ? {
                channel_id: channelContext?.channelId,
                channel_name: channelContext?.channelName,
              }
            : { space_id: effectiveSpaceId },
        })
        useChatStore.getState().addConversation(conversation)
        useChatStore.getState().setMessages(conversation.id, [])
        setConversations((prev) => [
          conversation,
          ...prev.filter((item) => item.id !== conversation.id),
        ])
        setSelectedConversationId(conversation.id)
        persistActiveConversationId(chatScopeStorageId, conversation.id, sendAgentKey)
        useChatStore.getState().setActiveConversationId(conversation.id)
        conversationId = conversation.id
      }

      const nextConversationId = await sendMessageStreaming({
        conversation_id: conversationId,
        campaign_id: isChannelScope ? null : effectiveCampaignId,
        space_id: isChannelScope ? null : effectiveSpaceId,
        scope_kind: isChannelScope ? undefined : effectiveCampaignId ? 'campaign' : 'personal',
        content,
        documents,
        highlighted_artifacts: artifacts?.map((artifact) => ({
          id: artifact.id,
          type: artifact.type,
          label: artifact.label,
        })),
        message_references: references,
        model,
        model_settings: modelSettings,
        system_context: systemContext,
        ui_selected_artifact: uiSelectedArtifact ?? undefined,
      })
      setSelectedConversationId(nextConversationId)
      persistActiveConversationId(chatScopeStorageId, nextConversationId, sendAgentKey)

      const storeConv = useChatStore
        .getState()
        .conversations.find((c) => c.id === nextConversationId)
      const storeConvBelongs = isChannelScope
        ? conversationBelongsToChannel(storeConv, chatScopeId)
        : spaceId
          ? conversationBelongsToSpace(storeConv, spaceId)
          : false
      if (storeConv && storeConvBelongs) {
        setConversations((prev) => {
          const rest = prev.filter((c) => c.id !== nextConversationId)
          return [storeConv, ...rest]
        })
      }

      if (isFirstMessageInThread && content.trim()) {
        const firstMessage = content.trim()
        void suggestConversationTitle(firstMessage)
          .then(async (res) => {
            const title = resolveSuggestedConversationTitle(res.title, firstMessage, 200)
            if (!title) return
            await renameConversation(nextConversationId, title)
            setConversations((prev) =>
              prev.map((c) => (c.id === nextConversationId ? { ...c, title } : c)),
            )
            useChatStore.getState().updateConversation(nextConversationId, { title })
          })
          .catch(async () => {
            const title = resolveSuggestedConversationTitle(null, firstMessage, 200)
            if (!title) return
            try {
              await renameConversation(nextConversationId, title)
              setConversations((prev) =>
                prev.map((c) => (c.id === nextConversationId ? { ...c, title } : c)),
              )
              useChatStore.getState().updateConversation(nextConversationId, { title })
            } catch {
              // Non-critical — chat.service already set a first-message title.
            }
          })
      }
    },
    [
      buildContextForSend,
      effectiveCampaignId,
      effectiveSpaceId,
      channelContext?.channelId,
      channelContext?.channelName,
      chatScopeId,
      chatScopeStorageId,
      isChannelScope,
      isStopping,
      selectedConversationId,
      spaceId,
      activeAgentKey,
      quickStart,
      uiSelectedArtifact,
    ],
  )

  const sendWithToast = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
      extraSystemContext?: string,
      options?: { forceNewConversation?: boolean; agentKey?: string },
    ) => {
      try {
        await spaceSend(
          content,
          documents,
          artifacts,
          model,
          references,
          modelSettings,
          extraSystemContext,
          options,
        )
      } catch (err) {
        if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
          useChatStore.getState().setCreditsExhausted(true)
          return
        }
        setComposerRestore({ text: content, documents, nonce: crypto.randomUUID() })
        toast.error(toastMessageForChatSendError(err))
      }
    },
    [spaceSend],
  )

  const dispatchExternalSendToVibe = useCallback(
    async (payload: {
      content: string
      documents?: DocumentAttachment[]
      artifacts: AttachedArtifact[]
      references: MessageReference[]
      extraSystemContext?: string
    }) => {
      setPresentationCommentsChatActive(false)
      setFunnelCommentsChatActive(false)
      setMode('chat')
      const state = externalSendStateRef.current
      if (state.selectedConversationReadOnly) {
        toast.error('Read-only. Ask the owner for edit access.')
        return
      }
      const queueItem = {
        id: crypto.randomUUID(),
        content: payload.content,
        documents: payload.documents,
        artifacts: payload.artifacts,
        references: payload.references,
        extraSystemContext: payload.extraSystemContext,
      }
      const shouldQueue = Boolean(
        state.selectedConversationId &&
        (state.isStreaming || state.isStopping || externalSendInFlightRef.current),
      )
      if (state.selectedConversationId && shouldQueue) {
        state.enqueueMessage(state.selectedConversationId, queueItem)
        return
      }
      if (externalSendInFlightRef.current) return
      externalSendInFlightRef.current = true
      try {
        await sendWithToast(
          payload.content,
          payload.documents,
          payload.artifacts,
          undefined,
          payload.references,
          undefined,
          payload.extraSystemContext,
        )
      } finally {
        externalSendInFlightRef.current = false
      }
    },
    [sendWithToast, setFunnelCommentsChatActive, setPresentationCommentsChatActive],
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          presentationId?: string
          presentationName?: string
          content?: string
          systemContext?: string
          drawingDataUrl?: string
        }>
      ).detail
      if (!detail?.presentationId || !detail.content) return
      const documents: DocumentAttachment[] | undefined = detail.drawingDataUrl
        ? [
            {
              filename: `${detail.presentationName ?? 'presentation'}-markup.png`,
              type: 'image',
              dataUrl: detail.drawingDataUrl,
              mimeType: 'image/png',
            },
          ]
        : undefined
      const label = detail.presentationName ?? 'Presentation'
      const artifacts: AttachedArtifact[] = [
        { id: detail.presentationId, type: 'presentation', label },
      ]
      const references: MessageReference[] = [
        {
          kind: 'artifact',
          id: detail.presentationId,
          type: 'presentation',
          label,
          ...(externalSendStateRef.current.campaignId
            ? { campaign_id: externalSendStateRef.current.campaignId }
            : {}),
        },
      ]
      void dispatchExternalSendToVibe({
        content: detail.content,
        documents,
        artifacts,
        references,
        extraSystemContext: detail.systemContext,
      })
    }
    window.addEventListener('presentation-editor:send-to-vibe', handler as EventListener)
    return () =>
      window.removeEventListener('presentation-editor:send-to-vibe', handler as EventListener)
  }, [dispatchExternalSendToVibe])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          funnelId?: string
          funnelName?: string
          content?: string
          systemContext?: string
          drawingDataUrl?: string
        }>
      ).detail
      if (!detail?.funnelId || !detail.content) return
      const documents: DocumentAttachment[] | undefined = detail.drawingDataUrl
        ? [
            {
              filename: `${detail.funnelName ?? 'funnel'}-markup.png`,
              type: 'image',
              dataUrl: detail.drawingDataUrl,
              mimeType: 'image/png',
            },
          ]
        : undefined
      const label = detail.funnelName ?? 'Funnel'
      const artifacts: AttachedArtifact[] = [{ id: detail.funnelId, type: 'funnel', label }]
      const references: MessageReference[] = [
        {
          kind: 'artifact',
          id: detail.funnelId,
          type: 'funnel',
          label,
          ...(externalSendStateRef.current.campaignId
            ? { campaign_id: externalSendStateRef.current.campaignId }
            : {}),
        },
      ]
      void dispatchExternalSendToVibe({
        content: detail.content,
        documents,
        artifacts,
        references,
        extraSystemContext: detail.systemContext,
      })
    }
    window.addEventListener('funnel-editor:send-to-vibe', handler as EventListener)
    return () => window.removeEventListener('funnel-editor:send-to-vibe', handler as EventListener)
  }, [dispatchExternalSendToVibe])

  const handleSend = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      void sendWithToast(content, documents, artifacts, model, references, modelSettings)
    },
    [sendWithToast],
  )

  const handleEnqueue = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
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
        references,
        model,
        modelSettings,
        extraSystemContext: quickStart.buildSendContext(content),
      })
    },
    [quickStart, selectedConversationId, enqueueMessage],
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
      item.references,
      item.modelSettings,
      item.extraSystemContext,
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
        item.references,
        item.modelSettings,
        item.extraSystemContext,
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
      references?: MessageReference[],
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
          references,
          modelSettings,
        })
        setEditingQueueItemId(null)
        return
      }
      handleSend(content, documents, artifacts, model, references, modelSettings)
    },
    [editingQueueItemId, selectedConversationId, updateQueueItem, handleSend],
  )

  useEffect(() => {
    const wasStreaming = prevStreamingRef.current
    prevStreamingRef.current = isStreaming
    if (wasStreaming && !isStreaming && !isStopping) {
      if (queue.length > 0) void processNextQueueItem()
    }
  }, [isStreaming, isStopping, queue.length, processNextQueueItem])

  const handleStop = useCallback(() => {
    if (selectedConversationId) void requestStopStream(selectedConversationId)
  }, [selectedConversationId])

  const ensureVoiceConversation = useCallback(async (): Promise<string> => {
    if (selectedConversationId) return selectedConversationId

    const conversation = await createNewConversation({
      agent_id: activeAgentKey,
      ...(!isChannelScope && effectiveCampaignId ? { campaign_id: effectiveCampaignId } : {}),
      metadata: isChannelScope
        ? {
            channel_id: channelContext?.channelId,
            channel_name: channelContext?.channelName,
          }
        : { space_id: effectiveSpaceId },
    })
    useChatStore.getState().addConversation(conversation)
    useChatStore.getState().setMessages(conversation.id, [])
    setConversations((prev) => [
      conversation,
      ...prev.filter((item) => item.id !== conversation.id),
    ])
    setSelectedConversationId(conversation.id)
    persistActiveConversationId(chatScopeStorageId, conversation.id, activeAgentKey)
    useChatStore.getState().setActiveConversationId(conversation.id)
    return conversation.id
  }, [
    activeAgentKey,
    effectiveCampaignId,
    effectiveSpaceId,
    channelContext?.channelId,
    channelContext?.channelName,
    chatScopeStorageId,
    isChannelScope,
    selectedConversationId,
  ])

  const handleVoiceStart = useCallback(() => {
    if (creditsExhausted || selectedConversationReadOnly || voiceActive) return
    void ensureVoiceConversation()
      .then(() => {
        setMode('chat')
        setVoiceActive(true)
      })
      .catch((error) => {
        console.error('Voice conversation start failed:', error)
        toast.error(toastMessageForChatSendError(error))
      })
  }, [creditsExhausted, ensureVoiceConversation, selectedConversationReadOnly, voiceActive])

  const handleVoiceEnd = useCallback(() => {
    voiceSession.endSession()
    setVoiceActive(false)
    setMode('chat')
    voiceStartedRef.current = false

    if (!selectedConversationId) return
    const conversationId = selectedConversationId
    setTimeout(async () => {
      try {
        const latest = await fetchMessages(conversationId)
        const local = useChatStore.getState().messagesByConversation[conversationId] ?? []
        useChatStore
          .getState()
          .setMessages(conversationId, mergeMessagesPreservingOrderedBlocks(local, latest))
      } catch {}
    }, 1500)
  }, [selectedConversationId, voiceSession])

  useEffect(() => {
    if (!voiceActive) {
      voiceStartedRef.current = false
      return
    }
    if (!selectedConversationId || voiceStartedRef.current) return
    voiceStartedRef.current = true
    voiceSession.startSession()
  }, [selectedConversationId, voiceActive, voiceSession])

  const setChatCollapsed = useSpacesStore((s) => s.setChatCollapsed)
  const chatRailIntent = useSpacesStore((s) => s.chatRailIntent)
  const setChatRailIntent = useSpacesStore((s) => s.setChatRailIntent)
  const handleNewConversation = useCallback(() => {
    setConversationAgentScope('active')
    setSelectedConversationId(null)
    persistActiveConversationId(chatScopeStorageId, null, activeAgentKey)
    useChatStore.getState().setActiveConversationId(null)
    setMode('chat')
  }, [activeAgentKey, chatScopeStorageId])

  const handleAgentChange = useCallback(
    (agentKey: string) => {
      if (agentKey === activeAgentKey) return
      setConversationAgentScope('active')
      setDraftAgentKey(agentKey)
      setSelectedConversationId(null)
      useChatStore.getState().setActiveConversationId(null)
      setMode('chat')
    },
    [activeAgentKey],
  )

  useEffect(() => {
    if (isChannelScope || homeSeedConsumedRef.current || conversationsLoading || !spaceId) return
    if (searchParams.get('home_seed') !== '1') return
    const requestedSpaceId = searchParams.get('space')
    if (requestedSpaceId && requestedSpaceId !== spaceId) return

    const clearHomeSeed = () => {
      window.sessionStorage.removeItem(HOME_CHAT_SEED_STORAGE_KEY)
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('home_seed')
      const query = nextParams.toString()
      router.replace(query ? `/spaces?${query}` : '/spaces', { scroll: false })
    }

    const payload = readHomeChatSeedForSpace(spaceId)
    if (!payload) {
      homeSeedConsumedRef.current = true
      clearHomeSeed()
      return
    }

    homeSeedConsumedRef.current = true

    void (async () => {
      try {
        const conversation =
          payload.conversation ??
          (await createNewConversation({
            agent_id: activeAgentKey,
            ...(campaignId ? { campaign_id: campaignId } : {}),
            metadata: { space_id: spaceId },
          }))
        useChatStore.getState().addConversation(conversation)
        useChatStore.getState().setMessages(conversation.id, [])
        setConversations((prev) => [
          conversation,
          ...prev.filter((item) => item.id !== conversation.id),
        ])
        setSelectedConversationId(conversation.id)
        persistActiveConversationId(spaceId, conversation.id, activeAgentKey)
        useChatStore.getState().setActiveConversationId(conversation.id)
        setMode('chat')

        const systemContext = buildContextForSend()
        const nextConversationId = await sendMessageStreaming({
          conversation_id: conversation.id,
          campaign_id: campaignId ?? null,
          space_id: spaceId,
          scope_kind: campaignId ? 'campaign' : 'personal',
          content: payload.content,
          documents: payload.documents,
          highlighted_artifacts: payload.artifacts?.map((artifact) => ({
            id: artifact.id,
            type: artifact.type,
            label: artifact.label,
          })),
          message_references: payload.references,
          model: payload.model,
          model_settings: payload.modelSettings,
          system_context: systemContext,
          ui_selected_artifact: uiSelectedArtifact ?? undefined,
        })
        setSelectedConversationId(nextConversationId)
        persistActiveConversationId(spaceId, nextConversationId, activeAgentKey)

        if (payload.content.trim()) {
          const firstMessage = payload.content.trim()
          void suggestConversationTitle(firstMessage)
            .then(async (res) => {
              const title = resolveSuggestedConversationTitle(res.title, firstMessage, 200)
              if (!title) return
              await renameConversation(nextConversationId, title)
              setConversations((prev) =>
                prev.map((c) => (c.id === nextConversationId ? { ...c, title } : c)),
              )
              useChatStore.getState().updateConversation(nextConversationId, { title })
            })
            .catch(async () => {
              const title = resolveSuggestedConversationTitle(null, firstMessage, 200)
              if (!title) return
              try {
                await renameConversation(nextConversationId, title)
                setConversations((prev) =>
                  prev.map((c) => (c.id === nextConversationId ? { ...c, title } : c)),
                )
                useChatStore.getState().updateConversation(nextConversationId, { title })
              } catch {
                // Non-critical — chat.service already set a first-message title.
              }
            })
        }
      } catch (error) {
        toast.error(sanitizeUserError(error, CHAT_TOAST_ERRORS.CHAT_SEND_ERROR.userMessage))
      } finally {
        clearHomeSeed()
      }
    })()
  }, [
    activeAgentKey,
    buildContextForSend,
    campaignId,
    conversationsLoading,
    router,
    searchParams,
    spaceId,
    uiSelectedArtifact,
  ])

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      const conversation = conversations.find((item) => item.id === conversationId) ?? null
      const conversationAgentKey = getConversationAgentKey(conversation)
      setDraftAgentKey(conversationAgentKey)
      setSelectedConversationId(conversationId)
      persistActiveConversationId(chatScopeStorageId, conversationId, conversationAgentKey)
      await selectConversation(conversationId)
      setMode('chat')
    },
    [chatScopeStorageId, conversations],
  )

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      const conversation = conversations.find((item) => item.id === conversationId) ?? null
      const conversationAgentKey = getConversationAgentKey(conversation)
      await deleteConversation(conversationId)
      useChatStore.getState().removeConversation(conversationId)
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null)
        persistActiveConversationId(chatScopeStorageId, null, conversationAgentKey)
      }
      setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId))
    },
    [chatScopeStorageId, conversations, selectedConversationId],
  )

  const handleRenameConversation = useCallback(async (conversationId: string, title: string) => {
    try {
      await renameConversation(conversationId, title)
      useChatStore.getState().updateConversation(conversationId, { title })
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title } : c)))
    } catch (err) {
      console.error('Rename conversation failed:', err)
      toast.error(SPACES_ACTIONS_TOAST_ERRORS.RENAME_CONVERSATION_FAILED.userMessage)
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
            ? SPACES_ACTIONS_TOAST_ERRORS.PIN_CONVERSATION_FAILED.userMessage
            : SPACES_ACTIONS_TOAST_ERRORS.UNPIN_CONVERSATION_FAILED.userMessage,
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
        setConversations((prev) => {
          return prev.map((c) =>
            c.id === conversationId ? { ...c, campaign_id: updated.campaign_id } : c,
          )
        })
        toast.success(SPACES_ACTIONS_TOAST_SUCCESS.MOVED_TO_CAMPAIGN.userMessage)
      } catch (err) {
        console.error('Move conversation failed:', err)
        toast.error(SPACES_ACTIONS_TOAST_ERRORS.MOVE_CONVERSATION_FAILED.userMessage)
      }
    },
    [],
  )

  const handleConversationScopeUpdated = useCallback((updated: Conversation) => {
    useChatStore.getState().updateConversation(updated.id, updated)
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === updated.id ? { ...conversation, ...updated } : conversation,
      ),
    )
  }, [])

  const handleDuplicateConversation = useCallback(
    async (conversationId: string, targetCampaignId?: string | null) => {
      try {
        const newConv = await duplicateConversation(conversationId, {
          campaignId: targetCampaignId === undefined ? (campaignId ?? null) : targetCampaignId,
        })
        const newConversationBelongs = isChannelScope
          ? conversationBelongsToChannel(newConv, chatScopeId)
          : spaceId
            ? conversationBelongsToSpace(newConv, spaceId)
            : false
        if (newConversationBelongs) {
          setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)])
        }
        toast.success('Conversation duplicated')
      } catch (err) {
        console.error('Duplicate conversation failed:', err)
        toast.error('Could not duplicate conversation.')
      }
    },
    [campaignId, chatScopeId, isChannelScope, spaceId],
  )

  const buildConversationUrl = useCallback(
    (conversationId: string) => {
      if (typeof window === 'undefined') return ''
      return buildSpaceChatConversationUrl({
        origin: window.location.origin,
        isChannelScope,
        chatScopeId,
        spaceId,
        conversationId,
      })
    },
    [chatScopeId, isChannelScope, spaceId],
  )

  const handleCopyConversationLink = useCallback(
    (conversationId: string) => {
      const url = buildConversationUrl(conversationId)
      if (!url) return
      try {
        void navigator.clipboard.writeText(url)
        toast.success('Link copied')
      } catch {
        toast.error(SPACES_ACTIONS_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [buildConversationUrl],
  )

  const handleCopyConversationId = useCallback((conversationId: string) => {
    try {
      void navigator.clipboard.writeText(conversationId)
      toast.success('ID copied')
    } catch {
      toast.error(SPACES_ACTIONS_TOAST_ERRORS.COPY_FAILED.userMessage)
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
    if (!chatRailIntent) return
    if (chatRailIntent === 'new') {
      const drawerConversationId = shellSidebarChrome
        ? useShellStore.getState().chatDrawer.conversationId
        : null
      // Drawer / meeting preferred thread already targets a conversation — do not wipe it.
      if (!drawerConversationId && !preferredConversationId) void handleNewConversation()
    } else if (chatRailIntent === 'list') {
      setMode('conversations')
    }
    setChatRailIntent(null)
  }, [
    chatRailIntent,
    handleNewConversation,
    preferredConversationId,
    setChatRailIntent,
    shellSidebarChrome,
  ])

  const applyGlobalChatSeed = useCallback(
    async (seed: GlobalChatSeedDetail) => {
      if (isChannelScope || conversationsLoading) return
      if (!globalChatSeedMatchesPanel(seed, spaceId)) return

      const content = seed.content?.trim() ?? ''
      const documents = seed.documents as DocumentAttachment[] | undefined
      const isAttach = seed.seedMode === 'attach'
      if (!isAttach && !content) return
      if (isAttach && !content && !(documents && documents.length > 0)) return

      const seedKey = `${spaceId ?? 'general'}:${seed.seedMode ?? 'send'}:${seed.conversationId ?? ''}:${content}:${documents?.map((d) => d.mediaAssetId ?? d.fileUrl).join(',') ?? ''}`
      if (globalSeedConsumedRef.current === seedKey) return
      globalSeedConsumedRef.current = seedKey

      if (seed.agentKey && seed.agentKey !== activeAgentKey) {
        handleAgentChange(seed.agentKey)
      }

      if (seed.conversationId) {
        useSpacesStore.getState().openConversationInSpaceChat(seed.conversationId)
      } else if (seed.railIntent === 'new') {
        handleNewConversation()
      }
      setMode('chat')

      if (isAttach) {
        setComposerRestore({
          text: content,
          documents,
          nonce: crypto.randomUUID(),
        })
        return
      }

      await sendWithToast(
        content,
        documents,
        seed.artifacts as AttachedArtifact[] | undefined,
        seed.model,
        seed.references as MessageReference[] | undefined,
        seed.modelSettings as ChatModelSettings | undefined,
        undefined,
        resolveSpaceChatSeedSendOptions(seed, activeAgentKey),
      )
    },
    [
      activeAgentKey,
      conversationsLoading,
      handleAgentChange,
      handleNewConversation,
      isChannelScope,
      sendWithToast,
      spaceId,
    ],
  )

  useEffect(() => {
    globalSeedConsumedRef.current = null
  }, [spaceId])

  useEffect(() => {
    const onSeed = (event: Event) => {
      const detail = (event as CustomEvent<GlobalChatSeedDetail>).detail
      if (!detail) return
      void applyGlobalChatSeed(detail)
    }
    window.addEventListener(GLOBAL_CHAT_SEED_EVENT, onSeed)
    return () => window.removeEventListener(GLOBAL_CHAT_SEED_EVENT, onSeed)
  }, [applyGlobalChatSeed])

  // Mirror the active agent so the recommendation banner stays accurate.
  useEffect(() => {
    const store = useGlobalChatStore.getState()
    if (store.activeAgentKey !== activeAgentKey) {
      store.setActiveAgentKey(activeAgentKey)
    }
  }, [activeAgentKey])

  // The recommendation banner's "Switch" button drives the panel through this
  // event so the two share one source of truth for the active agent.
  useEffect(() => {
    const onAgentSwitch = (event: Event) => {
      const detail = (event as CustomEvent<GlobalChatAgentSwitchDetail>).detail
      if (detail?.agentKey) handleAgentChange(detail.agentKey)
    }
    window.addEventListener(GLOBAL_CHAT_AGENT_SWITCH_EVENT, onAgentSwitch)
    return () => window.removeEventListener(GLOBAL_CHAT_AGENT_SWITCH_EVENT, onAgentSwitch)
  }, [handleAgentChange])

  const applyGlobalVoiceStart = useCallback(
    (detail: GlobalChatVoiceStartDetail) => {
      if (detail.agentKey !== activeAgentKey) {
        handleAgentChange(detail.agentKey)
        return
      }
      if (voiceActive) return
      useGlobalChatStore.getState().consumePendingVoiceStart()
      handleVoiceStart()
    },
    [activeAgentKey, handleAgentChange, handleVoiceStart, voiceActive],
  )

  useEffect(() => {
    const onVoiceStart = (event: Event) => {
      const detail = (event as CustomEvent<GlobalChatVoiceStartDetail>).detail
      if (!detail?.agentKey) return
      applyGlobalVoiceStart(detail)
    }
    window.addEventListener(GLOBAL_CHAT_VOICE_START_EVENT, onVoiceStart)
    return () => window.removeEventListener(GLOBAL_CHAT_VOICE_START_EVENT, onVoiceStart)
  }, [applyGlobalVoiceStart])

  useEffect(() => {
    if (conversationsLoading || voiceActive) return
    const pending = useGlobalChatStore.getState().pendingVoiceStart
    if (!pending || pending.agentKey !== activeAgentKey) return
    useGlobalChatStore.getState().consumePendingVoiceStart()
    handleVoiceStart()
  }, [activeAgentKey, conversationsLoading, handleVoiceStart, voiceActive])

  useEffect(() => {
    if (conversationsLoading) return
    const pending = useGlobalChatStore.getState().consumePendingSeed()
    if (pending) void applyGlobalChatSeed(pending)
  }, [applyGlobalChatSeed, conversationsLoading, spaceId])

  useEffect(() => {
    const nextMode = resolveSpaceChatSpecialMode({
      mode,
      presentationCommentsActive,
      hasPresentationCommentsSession: presentationCommentsSession !== null,
      presentationDesignActive,
      hasPresentationDesignSession: presentationDesignSession !== null,
      presentationTweaksActive,
      hasPresentationTweaksSession: presentationTweaksSession !== null,
      funnelCommentsActive,
      hasFunnelCommentsSession: funnelCommentsSession !== null,
      funnelDesignActive,
      hasFunnelDesignSession: funnelDesignSession !== null,
      funnelTweaksActive,
      hasFunnelTweaksSession: funnelTweaksSession !== null,
    })
    if (nextMode !== mode) setMode(nextMode)
  }, [
    funnelCommentsActive,
    funnelCommentsSession,
    funnelDesignActive,
    funnelDesignSession,
    funnelTweaksActive,
    funnelTweaksSession,
    mode,
    presentationCommentsActive,
    presentationCommentsSession,
    presentationDesignActive,
    presentationDesignSession,
    presentationTweaksActive,
    presentationTweaksSession,
  ])

  const panelMode: ChatMode = resolveSpaceChatPanelMode({
    mode,
    presentationCommentsActive,
    hasPresentationCommentsSession: presentationCommentsSession !== null,
    presentationDesignActive,
    hasPresentationDesignSession: presentationDesignSession !== null,
    presentationTweaksActive,
    hasPresentationTweaksSession: presentationTweaksSession !== null,
    funnelCommentsActive,
    hasFunnelCommentsSession: funnelCommentsSession !== null,
    funnelDesignActive,
    hasFunnelDesignSession: funnelDesignSession !== null,
    funnelTweaksActive,
    hasFunnelTweaksSession: funnelTweaksSession !== null,
  })

  const defaultModel = selectedConversation?.default_model_id ?? null
  const conversationModelSettings = useMemo(
    () => readConversationModelSettings(selectedConversation?.metadata),
    [selectedConversation?.metadata],
  )
  const sessionTitle = stripLegacySpacesConversationTitle(selectedConversation?.title)
  const chatPanelRef = useRef<HTMLDivElement | null>(null)
  const agentPickerDisabled =
    isStreaming || isStopping || selectedConversationReadOnly || voiceActive
  const renderAgentPicker = (variant?: 'hero') => (
    <SpaceChatAgentPicker
      agents={chatAgents}
      value={activeAgentKey}
      onChange={handleAgentChange}
      disabled={agentPickerDisabled}
      variant={variant}
    />
  )

  const rightPanelOpen = useShellStore((s) => s.rightPanel.open)
  const toggleRightPanel = useShellStore((s) => s.toggleRightPanel)

  const chatHeaderActions = (
    <SpaceChatHeaderActions
      searchOpen={searchOpen}
      searchQuery={searchQuery}
      voiceActive={voiceActive}
      hasVoiceTasks={hasVoiceTasks}
      hasRunningVoiceTasks={hasRunningVoiceTasks}
      onCollapse={() => (onCollapseChat ? onCollapseChat() : setChatCollapsed(true))}
      onSearchOpen={() => setSearchOpen(true)}
      onSearchClose={() => {
        setSearchOpen(false)
        setSearchQuery('')
      }}
      onSearchQueryChange={setSearchQuery}
      onNewConversation={() => void handleNewConversation()}
      onShowVoiceRuns={() => setMode('voice-runs')}
      onShowConversations={() => setMode('conversations')}
      hideHistoryChrome={shellSidebarChrome}
      summaryOpen={rightPanelOpen}
      onToggleSummary={() => toggleRightPanel()}
    />
  )

  const chatHeaderBlock = (
    <div className="pt-spacing-2 pb-spacing-1 relative shrink-0 px-3 md:px-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="min-h-spacing-10 gap-spacing-2 flex items-center">
          {headerLeadingAction ? (
            <div className="flex shrink-0 items-center">{headerLeadingAction}</div>
          ) : null}
          {messages.length > 0 || isLoadingMessages || voiceActive ? (
            <div className="flex shrink-0 items-center">{renderAgentPicker()}</div>
          ) : null}
          {headerLayout === 'full' && sessionTitle && selectedConversationId ? (
            <ConversationHeaderTitle
              title={sessionTitle}
              onRename={(title) => handleRenameConversation(selectedConversationId, title)}
            />
          ) : (
            <div className="min-w-0 flex-1" aria-hidden />
          )}
          <div className="flex shrink-0 items-center">{chatHeaderActions}</div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-[var(--color-background)] to-transparent" />
    </div>
  )

  return (
    <div
      data-spaces-chat-panel
      ref={chatPanelRef}
      className={cn(
        'relative flex h-full min-h-0 min-w-0 flex-row overflow-hidden',
        shellSidebarChrome ? 'bg-background' : 'rounded-2xl border border-[var(--border)]',
        !shellSidebarChrome &&
          (panelMode === 'conversations' ||
          panelMode === 'voice-runs' ||
          panelMode === 'presentation-comments' ||
          panelMode === 'presentation-design' ||
          panelMode === 'presentation-tweaks' ||
          panelMode === 'funnel-comments' ||
          panelMode === 'funnel-design' ||
          panelMode === 'funnel-tweaks'
            ? 'surface-bg'
            : 'surface-card'),
      )}
    >
      <VoiceApprovalProvider value={voiceActive ? voiceSession.sendApproval : null}>
        <ChatPanelSlideStack
          panelKey={panelMode}
          chatPanel={
            <div
              className={cn(
                'group flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
                shellSidebarChrome ? 'bg-background' : 'surface-bg',
              )}
            >
              {chatHeaderBlock}

              {voiceActive ? (
                <SpaceVoiceSessionView
                  agentName={activeVoiceAgent.display_name}
                  conversationId={selectedConversationId}
                  state={voiceSession.state}
                  turnData={turnData}
                  inputTranscript={voiceSession.inputTranscript}
                  outputTranscript={voiceSession.outputTranscript}
                  micInputLevelRef={voiceSession.micInputLevelRef}
                  audioLevelRef={voiceSession.audioLevelRef}
                  error={voiceSession.error}
                  isMuted={voiceSession.isMuted}
                  onReconnect={voiceSession.reconnectSession}
                  onToggleMute={voiceSession.toggleMute}
                  onEnd={handleVoiceEnd}
                />
              ) : (
                <>
                  <PlanStickyTracker messages={messages} scrollContainerRef={scrollRef} />
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-4"
                  >
                    <div
                      ref={contentRef}
                      className="mx-auto flex min-h-full w-full max-w-3xl flex-col"
                    >
                      {isLoadingMessages && messages.length === 0 && selectedConversationId ? (
                        <div className="flex flex-1 flex-col items-center justify-center py-24">
                          <VibeyLoadingOrb
                            text="Loading conversation…"
                            state="processing"
                            size="md"
                          />
                        </div>
                      ) : null}
                      {messages.length === 0 && !isLoadingMessages ? (
                        <SpaceChatAgentEmptyState
                          agent={emptyStateAgent}
                          agentPicker={renderAgentPicker('hero')}
                        />
                      ) : null}
                      <div className="flex flex-1 flex-col gap-3">
                        {turnData.leadingMessages.map((m) => (
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
                              campaignId={effectiveCampaignId ?? undefined}
                              assistantInlineAction={
                                visibleUndoMessageIds.has(m.id) ? (
                                  <SpaceUndoButton message={m} />
                                ) : null
                              }
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
                                      turn.user.id === lastUserMessageId
                                        ? handleEditSubmit
                                        : undefined
                                    }
                                    conversationIdOverride={selectedConversationId}
                                    knownSkillKeys={knownSkillKeys}
                                    agentKey={activeAgentKey}
                                    campaignId={effectiveCampaignId ?? undefined}
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
                                      campaignId={effectiveCampaignId ?? undefined}
                                      assistantInlineAction={
                                        visibleUndoMessageIds.has(m.id) ? (
                                          <SpaceUndoButton message={m} />
                                        ) : null
                                      }
                                      pinAssistantActions={m.id === pinnedAssistantMessageId}
                                    />
                                  </div>
                                ))}
                                {isLastTurn ? (
                                  <div className="mt-1">
                                    <StatusIndicator
                                      conversationIdOverride={selectedConversationId}
                                    />
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
                        onRemove={handleQueueRemove}
                        onSendNow={handleQueueSendNow}
                        onEdit={handleQueueEdit}
                      />
                      {selectedConversationReadOnly ? (
                        <div className="body-3 text-muted-foreground mb-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 border border-[var(--color-border)] text-center">
                          Read-only. Ask the owner for edit access.
                        </div>
                      ) : null}
                      {messages.length === 0 &&
                      !isLoadingMessages &&
                      !selectedConversationReadOnly ? (
                        <ShellEmptyChatQuickStartPills onSelect={quickStart.selectQuickStart} />
                      ) : null}
                      <ComposerInputStack
                        stackActive={isStreaming && !selectedConversationReadOnly}
                        topSlot={
                          <ComposerActiveRunTipCard
                            stacked
                            conversationId={selectedConversationId}
                            isStreaming={isStreaming}
                          />
                        }
                      >
                        <ChatInput
                          onSend={handleComposerSendWithQueueEdit}
                          defaultModel={defaultModel}
                          defaultModelSettings={conversationModelSettings}
                          campaignModelStrategy={campaignModelStrategy}
                          disabled={creditsExhausted || selectedConversationReadOnly}
                          sendDisabled={isStopping}
                          creditsExhausted={creditsExhausted}
                          isStreaming={isStreaming}
                          onStop={handleStop}
                          conversationId={selectedConversationId}
                          setTextRef={setTextRef}
                          composerMirrorRef={composerMirrorRef}
                          onComposerValueChange={quickStart.handleComposerValueChange}
                          activeCapabilityChip={quickStart.activeCapabilityChip}
                          onClearCapabilityChip={quickStart.clearQuickStart}
                          onCreateMenuSelect={quickStart.selectQuickStart}
                          onEnqueue={editingQueueItemId ? undefined : handleEnqueue}
                          composerFooterAfterIntegrationsSlot={composerContextSlot}
                          onSendNow={handleQueueSendNowNext}
                          queueLength={queue.length}
                          placeholder={
                            selectedConversationReadOnly
                              ? 'Read-only conversation'
                              : messages.length === 0
                                ? SHELL_EMPTY_CHAT_PLACEHOLDER
                                : `Message ${activeAgentName}...`
                          }
                          initialValue={composerRestore?.text}
                          initialDocuments={composerRestore?.documents}
                          restoreNonce={composerRestore?.nonce}
                          campaignId={effectiveCampaignId ?? undefined}
                          spaceId={isChannelScope ? null : effectiveSpaceId}
                          scopeKind={
                            isChannelScope
                              ? undefined
                              : effectiveCampaignId
                                ? 'campaign'
                                : 'personal'
                          }
                          compact
                          agentKey={activeAgentKey}
                          dropZoneRef={chatPanelRef}
                          spaceComposerSpaceTasks={
                            scopeMatchesVisibleSpace ? spaceComposerSpaceTasks : []
                          }
                          spaceComposerListenExternalAttach
                          onVoiceStart={handleVoiceStart}
                        />
                      </ComposerInputStack>
                    </div>
                  </div>
                </>
              )}
            </div>
          }
          subPanel={
            <SpaceChatSubPanel
              panelMode={panelMode}
              selectedConversationId={selectedConversationId}
              voiceRunTasks={voiceRunTasks}
              voiceDelegationMessages={voiceDelegationMessages}
              setMode={setMode}
              presentationCommentsSession={presentationCommentsSession}
              presentationComments={presentationComments}
              addPresentationComment={addPresentationComment}
              resolvePresentationComment={resolvePresentationComment}
              sendPresentationCommentsToVibe={sendPresentationCommentsToVibe}
              setPresentationCommentsChatActive={setPresentationCommentsChatActive}
              setPresentationFullMode={setPresentationFullMode}
              presentationDesignSession={presentationDesignSession}
              presentationDesignBundle={presentationDesignBundle}
              presentationDesignSelectedTrace={presentationDesignSelectedTrace}
              savePresentationDesignFile={savePresentationDesignFile}
              setPresentationDesignChatActive={setPresentationDesignChatActive}
              presentationTweaksSession={presentationTweaksSession}
              presentationTweaksBundle={presentationTweaksBundle}
              setPresentationTweaksChatActive={setPresentationTweaksChatActive}
              funnelCommentsSession={funnelCommentsSession}
              funnelComments={funnelComments}
              addFunnelComment={addFunnelComment}
              resolveFunnelComment={resolveFunnelComment}
              sendFunnelCommentsToVibe={sendFunnelCommentsToVibe}
              setFunnelCommentsChatActive={setFunnelCommentsChatActive}
              setFunnelFullMode={setFunnelFullMode}
              funnelDesignSession={funnelDesignSession}
              funnelDesignBundle={funnelDesignBundle}
              funnelDesignSelectedTrace={funnelDesignSelectedTrace}
              saveFunnelDesignFile={saveFunnelDesignFile}
              setFunnelDesignChatActive={setFunnelDesignChatActive}
              funnelTweaksSession={funnelTweaksSession}
              setFunnelTweaksChatActive={setFunnelTweaksChatActive}
              visibleConversations={visibleConversations}
              conversationQuery={conversationQuery}
              setConversationQuery={setConversationQuery}
              handleSelectConversation={handleSelectConversation}
              handleNewConversation={handleNewConversation}
              handleDeleteConversation={handleDeleteConversation}
              handleRenameConversation={handleRenameConversation}
              handleTogglePinConversation={handleTogglePinConversation}
              handleToggleArchiveConversation={handleToggleArchiveConversation}
              handleMoveConversation={handleMoveConversation}
              handleDuplicateConversation={handleDuplicateConversation}
              handleCopyConversationLink={handleCopyConversationLink}
              handleCopyConversationId={handleCopyConversationId}
              handleOpenConversationInNewTab={handleOpenConversationInNewTab}
              setShareConversation={setShareConversation}
              conversationsLoading={conversationsLoading}
              isOrgContext={isOrgContext}
              conversationAgentScope={conversationAgentScope}
              setConversationAgentScope={setConversationAgentScope}
              conversationAgentByKey={conversationAgentByKey}
            />
          }
        />
      </VoiceApprovalProvider>
      {isOrgContext ? (
        <ConversationShareModal
          activeOrgId={activeOrgId}
          open={shareConversation !== null}
          conversation={shareConversation}
          orgName={conversationShareOrgName}
          roster={roster}
          onClose={() => setShareConversation(null)}
          onSharesChanged={() => void loadConversations({ force: true })}
        />
      ) : null}
      <ShellRightPanel
        conversationId={selectedConversationId}
        conversation={selectedConversation}
        campaignId={effectiveCampaignId}
        spaceId={effectiveSpaceId}
        showScope={!isChannelScope}
        onConversationUpdated={handleConversationScopeUpdated}
        onScopeChanged={setScopeOverride}
      />
    </div>
  )
}
