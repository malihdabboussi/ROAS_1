'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { ComposerInputStack } from '@/components/chat/ComposerInputStack'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { LucideIcon } from '@/components/ui/IconPicker'
import type { AnimationState } from '@/components/vibey/animation-states.config'
import { backendGet } from '@/lib/api/backend-client'
import { resolvePinnedAssistantMessageId } from '@/lib/chat/assistant-message-actions'
import { CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import type { MissionDeliverable } from '@/lib/missions'
import { toastMessageForChatSendError } from '../config/chat-stream-errors.config'
import { useCampaignMode } from '../contexts/CampaignModeContext'
import { useActiveArtifactSelectionSignal } from '../hooks/useActiveArtifactSelectionSignal'
import { ensureGeneralCampaign, fetchCampaign, fetchCampaigns } from '../services/campaign.service'
import {
  assignConversationCampaign,
  deleteMessagesFrom,
  fetchContextBaseline,
  fetchMessages,
  readConversationModelSettings,
  requestStopStream,
  sendMessageStreaming,
  type ChatModelSettings,
} from '../services/chat.service'
import { useActiveMessages, useActiveQueue, useChatStore } from '../store/use-chat-store'
import type {
  Campaign,
  DocumentAttachment,
  HighlightedArtifact,
  Message,
  MessageReference,
} from '../types'
import type { AttachedArtifact } from './chat/ArtifactAttachments'
import { ChatTurnChangeDivider } from './chat/ChatTurnChangeDivider'
import { MessageQueue } from './chat/MessageQueue'
import { RateLimitCard } from './chat/RateLimitCard'
import { StatusIndicator } from './chat/StatusIndicator'
import { StreamInterruptedBar } from './chat/StreamInterruptedBar'
import { ChatInput } from './ChatInput'
import { MessageBubble } from './MessageBubble'
import { StudioHome } from './StudioHome'

const VibeyLoadingSphereSimple = dynamic(
  () =>
    import('@/components/vibey/vibey-loading-sphere-simple').then(
      (m) => m.VibeyLoadingSphereSimple,
    ),
  { ssr: false },
)

const PHASE_TO_ANIMATION: Record<string, AnimationState> = {
  thinking: 'thinking',
  executing: 'processing',
  streaming: 'streaming',
}

const BOTTOM_SCROLL_THRESHOLD = 80

function useVibeyState(): AnimationState {
  const isStreaming = useChatStore((s) => s.isStreaming)
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const agentPhase = useChatStore((s) => s.agentPhase)
  const messages = useActiveMessages()

  return useMemo(() => {
    if (isStreaming && agentPhase in PHASE_TO_ANIMATION) {
      return PHASE_TO_ANIMATION[agentPhase]!
    }
    if (isStreaming) return 'streaming'
    if (isLoadingMessages) return 'thinking'
    return 'idle'
  }, [isStreaming, isLoadingMessages, agentPhase, messages.length])
}

export function ChatInterface() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const lastUserPromptRef = useRef<HTMLDivElement>(null)
  const [spacerHeight, setSpacerHeight] = useState(0)
  const [lastUserPromptHeight, setLastUserPromptHeight] = useState(0)
  const spacerHeightRef = useRef(0)
  const lastUserPromptHeightRef = useRef(0)
  const stickyTopOffsetRef = useRef(0)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setContextBreakdown = useChatStore((s) => s.setContextBreakdown)
  const activeConversationStreaming = useChatStore((s) =>
    activeConversationId ? s.streamingConversationIds.includes(activeConversationId) : false,
  )
  const activeConversationStopping = useChatStore((s) =>
    activeConversationId ? s.stoppingConversationIds.includes(activeConversationId) : false,
  )
  const activeConversationStreamingMessageId = useChatStore((s) =>
    activeConversationId
      ? (s.streamingMessageIdsByConversation[activeConversationId] ?? null)
      : null,
  )
  const messages = useActiveMessages()
  const isStreaming = activeConversationStreaming

  useEffect(() => {
    if (!activeConversationId || activeConversationId.startsWith('pending-')) return
    let cancelled = false
    fetchContextBaseline(activeConversationId)
      .then((breakdown) => {
        if (!cancelled && breakdown) setContextBreakdown(activeConversationId, breakdown)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activeConversationId, setContextBreakdown])
  const streamingMessageId = activeConversationStreamingMessageId
  const creditsLow = useChatStore((s) => s.creditsLow)
  const creditsLowRemaining = useChatStore((s) => s.creditsLowRemaining)
  const creditsExhausted = useChatStore((s) => s.creditsExhausted)
  const conversations = useChatStore((s) => s.conversations)
  const updateConversation = useChatStore((s) => s.updateConversation)
  const { activeCampaignId, activeCampaignName, setActiveCampaign, minimizePanel } =
    useCampaignMode()
  const vibeyState = useVibeyState()
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([])
  const [pickedCampaignId, setPickedCampaignId] = useState<string | null>(null)
  const [composerRestore, setComposerRestore] = useState<{
    text: string
    documents?: DocumentAttachment[]
    nonce: string
  } | null>(null)
  const [campaignModelStrategy, setCampaignModelStrategy] = useState<string | null>(null)
  const [campaignConfigVersion, setCampaignConfigVersion] = useState(0)
  const [knownSkillKeys, setKnownSkillKeys] = useState<Set<string>>(new Set())
  const [previewStudioDeliverable, setPreviewStudioDeliverable] =
    useState<MissionDeliverable | null>(null)
  const chatScrollAreaMounted = messages.length > 0 || !!activeCampaignId

  useEffect(() => {
    backendGet<{ id: string; skill_key: string }[]>('/api/agents/vibey/skills')
      .then((skills) => {
        if (Array.isArray(skills)) setKnownSkillKeys(new Set(skills.map((s) => s.skill_key)))
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    const handler = () => setCampaignConfigVersion((v) => v + 1)
    window.addEventListener('campaign-config-updated', handler)
    return () => window.removeEventListener('campaign-config-updated', handler)
  }, [])

  // Fetch recent campaigns when no active campaign (new chat)
  useEffect(() => {
    if (!activeCampaignId) {
      fetchCampaigns()
        .then((campaigns) => {
          const sorted = [...campaigns].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )
          setRecentCampaigns(sorted.slice(0, 3))
        })
        .catch(() => setRecentCampaigns([]))
    } else {
      setRecentCampaigns([])
      setPickedCampaignId(null)
    }
  }, [activeCampaignId])

  useEffect(() => {
    const campaignId = activeCampaignId ?? pickedCampaignId
    if (!campaignId) {
      setCampaignModelStrategy(null)
      return
    }
    let cancelled = false
    fetchCampaign(campaignId)
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
  }, [activeCampaignId, pickedCampaignId, campaignConfigVersion])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const applyHeight = (h: number) => {
      setSpacerHeight(h)
      spacerHeightRef.current = h
    }

    stickyTopOffsetRef.current =
      parseFloat(getComputedStyle(el).getPropertyValue('--spacing-5')) || 0

    const ro = new ResizeObserver(([entry]) => {
      if (entry) applyHeight(entry.contentRect.height)
    })
    ro.observe(el)
    applyHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [chatScrollAreaMounted])

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
  }, [messages.length])

  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const previousMessageCountRef = useRef(0)
  const lastScrolledConvRef = useRef<string | null>(null)
  const isProgrammaticScrollRef = useRef(false)

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || messages.length === 0) return

    const currentCount = messages.length
    const prevCount = previousMessageCountRef.current
    previousMessageCountRef.current = currentCount

    const isNewConversation = lastScrolledConvRef.current !== activeConversationId
    if (isNewConversation) {
      lastScrolledConvRef.current = activeConversationId
    }

    const willScroll = (currentCount > prevCount && prevCount > 0) || isNewConversation

    if (willScroll) {
      const latestUserMsg = [...messages].reverse().find((m) => m.role === 'user')
      if (latestUserMsg) {
        const scrollToUser = () => {
          const scroller = scrollRef.current
          if (!scroller) return
          const el = scroller.querySelector(`[data-turn-id="${latestUserMsg.id}"]`)
          const sh = scroller.scrollHeight
          const ch = scroller.clientHeight
          const stBefore = scroller.scrollTop
          const maxScroll = Math.max(0, sh - ch)
          const spacer = spacerHeightRef.current
          const promptH = lastUserPromptHeightRef.current
          void Math.max(0, spacer - stickyTopOffsetRef.current - promptH)
          let elTop = 0
          let containerTop = 0
          let delta = 0
          if (el) {
            isProgrammaticScrollRef.current = true
            containerTop = scroller.getBoundingClientRect().top
            elTop = el.getBoundingClientRect().top
            delta = elTop - containerTop
            scroller.scrollTop = scroller.scrollTop + delta
            requestAnimationFrame(() => {
              isProgrammaticScrollRef.current = false
            })
          }
          const desiredNextTop = stBefore + delta
          const hitClamp = el ? desiredNextTop > maxScroll + 0.5 : false
          void hitClamp
        }
        setTimeout(scrollToUser, 80)
      }
      setUserHasScrolledUp(false)
    }
  }, [messages.length, activeConversationId, messages])

  useEffect(() => {
    if (!activeConversationId) {
      lastScrolledConvRef.current = null
      previousMessageCountRef.current = 0
    }
  }, [activeConversationId])

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    const atBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight <= BOTTOM_SCROLL_THRESHOLD
    setUserHasScrolledUp(!atBottom)
  }, [])

  const handleScrollToBottom = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
    setUserHasScrolledUp(false)
  }, [])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  )
  const conversationModelSettings = useMemo(
    () => readConversationModelSettings(activeConversation?.metadata),
    [activeConversation?.metadata],
  )
  const uiSelectedArtifact = useActiveArtifactSelectionSignal()
  const conversationCampaignId = activeConversation?.campaign_id ?? null
  const effectiveCampaignId = activeConversationId
    ? (conversationCampaignId ?? undefined)
    : (activeCampaignId ?? pickedCampaignId ?? undefined)
  const canAttachCampaignWithChip = activeConversationId ? conversationCampaignId === null : true

  const handleCampaignChipClick = useCallback(
    async (campaign: Campaign) => {
      if (
        activeConversationId &&
        !activeConversationId.startsWith('pending-') &&
        conversationCampaignId === null
      ) {
        await assignConversationCampaign(activeConversationId, campaign.id)
        updateConversation(activeConversationId, {
          campaign_id: campaign.id,
          updated_at: new Date().toISOString(),
        })
        const icon =
          ((campaign.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban'
        setActiveCampaign(campaign.id, campaign.name, icon)
        setPickedCampaignId(null)
        return
      }

      setPickedCampaignId((prev) => (prev === campaign.id ? null : campaign.id))
    },
    [
      activeConversationId,
      conversationCampaignId,
      setActiveCampaign,
      updateConversation,
      setPickedCampaignId,
    ],
  )

  const handleSend = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      overrideCampaignId?: string,
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (activeConversationId && activeConversationStopping) return
      try {
        let resolvedCampaignId = overrideCampaignId ?? effectiveCampaignId ?? undefined
        if (overrideCampaignId && !activeCampaignId) {
          const selectedCampaign = await fetchCampaign(overrideCampaignId)
          const selectedIcon =
            ((selectedCampaign.config as Record<string, unknown>)?.icon as string) ??
            'folder-kanban'
          setActiveCampaign(selectedCampaign.id, selectedCampaign.name ?? 'Campaign', selectedIcon)
          minimizePanel()
        }
        if (!resolvedCampaignId) {
          const hasPersistedConversation =
            activeConversationId != null && !activeConversationId.startsWith('pending-')
          if (!hasPersistedConversation) {
            const generalCampaign = await ensureGeneralCampaign()
            resolvedCampaignId = generalCampaign.id
            const generalIcon =
              ((generalCampaign.config as Record<string, unknown>)?.icon as string) ??
              'folder-kanban'
            setActiveCampaign(generalCampaign.id, generalCampaign.name ?? 'General', generalIcon)
            minimizePanel()
          }
        }
        const highlighted_artifacts: HighlightedArtifact[] | undefined = artifacts?.map((a) => ({
          id: a.id,
          type: a.type,
          label: a.label,
        }))
        const message_references = references && references.length > 0 ? references : undefined
        await sendMessageStreaming({
          conversation_id: activeConversationId ?? undefined,
          campaign_id: resolvedCampaignId,
          content,
          model,
          model_settings: modelSettings,
          documents,
          highlighted_artifacts,
          message_references,
          ui_selected_artifact: uiSelectedArtifact ?? undefined,
        })
      } catch (err) {
        if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
          useChatStore.getState().setCreditsExhausted(true)
          return
        }
        setComposerRestore({ text: content, documents, nonce: crypto.randomUUID() })
        toast.error(toastMessageForChatSendError(err))
        console.error('Failed to send message:', err)
      }
    },
    [
      activeConversationId,
      activeConversationStopping,
      activeCampaignId,
      effectiveCampaignId,
      setActiveCampaign,
      minimizePanel,
      uiSelectedArtifact,
    ],
  )

  const handleStop = useCallback(() => {
    if (!activeConversationId) return
    void requestStopStream(activeConversationId)
  }, [activeConversationId])

  // ── Message Queue ──────────────────────────────────────────────────────
  const queue = useActiveQueue()
  const enqueueMessage = useChatStore((s) => s.enqueueMessage)
  const dequeueMessage = useChatStore((s) => s.dequeueMessage)
  const removeQueueItem = useChatStore((s) => s.removeQueueItem)
  const setTextRef = useRef<((text: string) => void) | null>(null)
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(null)
  const [regenerateAdContext, setRegenerateAdContext] = useState<{
    adId: string
    headline: string
    imageUrl: string | null
  } | null>(null)

  const [addArtifactContext, setAddArtifactContext] = useState<{
    type: 'new-campaign' | 'new-ad-set' | 'new-creative'
    parentLabel: string
    campaignId?: string
    adSetId?: string
  } | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          adId: string
          prompt: string
          headline?: string
          imageUrl?: string | null
        }>
      ).detail
      if (detail?.prompt) setTextRef.current?.(detail.prompt)
      if (detail?.adId) {
        setAddArtifactContext(null)
        setRegenerateAdContext({
          adId: detail.adId,
          headline: detail.headline ?? 'Untitled ad',
          imageUrl: detail.imageUrl ?? null,
        })
      }
    }
    window.addEventListener('studio-request-regenerate-ad-image', handler)
    return () => window.removeEventListener('studio-request-regenerate-ad-image', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          prompt: string
          type: 'new-campaign' | 'new-ad-set' | 'new-creative'
          parentLabel: string
          campaignId?: string
          adSetId?: string
        }>
      ).detail
      if (detail?.prompt) setTextRef.current?.(detail.prompt)
      if (detail?.type) {
        setRegenerateAdContext(null)
        setAddArtifactContext({
          type: detail.type,
          parentLabel: detail.parentLabel ?? '',
          campaignId: detail.campaignId,
          adSetId: detail.adSetId,
        })
      }
    }
    window.addEventListener('studio-request-add-ads-artifact', handler)
    return () => window.removeEventListener('studio-request-add-ads-artifact', handler)
  }, [])

  const handleEnqueue = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (!activeConversationId) return
      const highlighted: HighlightedArtifact[] | undefined = artifacts?.map((a) => ({
        id: a.id,
        type: a.type,
        label: a.label,
      }))
      enqueueMessage(activeConversationId, {
        id: crypto.randomUUID(),
        content,
        documents,
        artifacts: highlighted,
        references,
        model,
        modelSettings,
      })
    },
    [activeConversationId, enqueueMessage],
  )

  const processNextQueueItem = useCallback(async () => {
    if (!activeConversationId) return
    const item = dequeueMessage(activeConversationId)
    if (!item) return
    await handleSend(
      item.content,
      item.documents,
      item.artifacts as AttachedArtifact[] | undefined,
      undefined,
      item.model,
      item.references,
      item.modelSettings,
    )
  }, [activeConversationId, dequeueMessage, handleSend])

  const handleQueueSendNow = useCallback(
    async (itemId: string) => {
      if (!activeConversationId) return
      const store = useChatStore.getState()
      const items = store.messageQueueByConversation[activeConversationId] ?? []
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      store.removeQueueItem(activeConversationId, itemId)
      if (isStreaming) {
        void requestStopStream(activeConversationId)
      }
      await handleSend(
        item.content,
        item.documents,
        item.artifacts as AttachedArtifact[] | undefined,
        undefined,
        item.model,
        item.references,
        item.modelSettings,
      )
    },
    [activeConversationId, isStreaming, handleSend],
  )

  const handleQueueSendNowNext = useCallback(async () => {
    if (!activeConversationId) return
    if (isStreaming) {
      void requestStopStream(activeConversationId)
    }
    await processNextQueueItem()
  }, [activeConversationId, isStreaming, processNextQueueItem])

  const handleQueueRemove = useCallback(
    (itemId: string) => {
      if (!activeConversationId) return
      removeQueueItem(activeConversationId, itemId)
    },
    [activeConversationId, removeQueueItem],
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
      if (editingQueueItemId && activeConversationId) {
        const highlighted: HighlightedArtifact[] | undefined = artifacts?.map((a) => ({
          id: a.id,
          type: a.type,
          label: a.label,
        }))
        useChatStore.getState().updateQueueItem(activeConversationId, editingQueueItemId, {
          content,
          documents,
          artifacts: highlighted,
          references,
          model,
          modelSettings,
        })
        setEditingQueueItemId(null)
        return
      }
      setRegenerateAdContext(null)
      let finalContent = content
      if (addArtifactContext) {
        const ctx = addArtifactContext
        const contextLine =
          ctx.type === 'new-campaign'
            ? ctx.campaignId
              ? `Context: Adding new campaign (campaign_id: ${ctx.campaignId}).\n\n`
              : 'Context: Adding new campaign.\n\n'
            : ctx.type === 'new-ad-set'
              ? `Context: Adding new ad set to campaign "${ctx.parentLabel}" (campaign_id: ${ctx.campaignId ?? 'unknown'}).\n\n`
              : `Context: Adding new creative to ad set "${ctx.parentLabel}" (ad_set_id: ${ctx.adSetId ?? 'unknown'}).\n\n`
        finalContent = contextLine + content
        setAddArtifactContext(null)
      }
      return handleSend(
        finalContent,
        documents,
        artifacts,
        undefined,
        model,
        references,
        modelSettings,
      )
    },
    [editingQueueItemId, activeConversationId, handleSend, addArtifactContext],
  )

  // Auto-process next queue item when streaming ends
  const prevStreamingRef = useRef(isStreaming)
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current
    prevStreamingRef.current = isStreaming
    if (wasStreaming && !isStreaming && !activeConversationStopping) {
      const convId = activeConversationId
      if (!convId) return
      const items = useChatStore.getState().messageQueueByConversation[convId] ?? []
      if (items.length > 0) {
        void processNextQueueItem()
      }
    }
  }, [isStreaming, activeConversationStopping, activeConversationId, processNextQueueItem])

  const lastUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') return messages[i]!.id
    }
    return null
  }, [messages])
  const editableUserMessageId = !isStreaming ? lastUserMessageId : null

  const handleEditSubmit = useCallback(
    async (
      newContent: string,
      documents?: DocumentAttachment[],
      model?: string,
      modelSettings?: ChatModelSettings,
    ) => {
      if (!activeConversationId || !editableUserMessageId) return

      try {
        const backendMessages = await fetchMessages(activeConversationId)
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

        await deleteMessagesFrom(activeConversationId, backendLastUser.id)
        useChatStore
          .getState()
          .setMessages(activeConversationId, backendMessages.slice(0, backendLastUserIndex))

        await sendMessageStreaming({
          conversation_id: activeConversationId,
          campaign_id: effectiveCampaignId ?? undefined,
          content: newContent,
          model,
          model_settings: modelSettings,
          documents,
        })
      } catch (err) {
        console.error('Edit submit failed:', err)
        toast.error(CHAT_TOAST_ERRORS.CHAT_RESEND_FAILED.userMessage)
      }
    },
    [activeConversationId, editableUserMessageId, messages, effectiveCampaignId],
  )

  // ThinkingIndicator removed — StatusIndicator already handles the "thinking" phase
  // with its own orb animation + rotating messages. Having both caused duplicate renders.

  const turnData = useMemo(() => {
    const leadingMessages: Message[] = []
    const turns: { user: Message; responses: Message[] }[] = []
    let currentTurn: { user: Message; responses: Message[] } | null = null

    for (const m of messages) {
      if (m.role === 'user') {
        if (currentTurn) turns.push(currentTurn)
        currentTurn = { user: m, responses: [] }
      } else if (currentTurn) {
        currentTurn.responses.push(m)
      } else {
        leadingMessages.push(m)
      }
    }
    if (currentTurn) turns.push(currentTurn)
    return { leadingMessages, turns }
  }, [messages])

  const pinnedAssistantMessageId = useMemo(
    () => resolvePinnedAssistantMessageId(messages),
    [messages],
  )

  const showHome = messages.length === 0 && !activeCampaignId

  if (showHome) {
    return (
      <div className="surface-bg flex h-full min-h-0 flex-col overflow-hidden">
        <StudioHome
          vibeyState={vibeyState}
          onSend={handleSend}
          isStreaming={isStreaming}
          onStop={handleStop}
          disabled={creditsExhausted}
        />
      </div>
    )
  }

  return (
    <div className="surface-bg flex h-full min-h-0 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="px-spacing-4 min-h-0 flex-1 overflow-y-auto pt-0"
        onScroll={handleScroll}
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          <div
            className="surface-bg pointer-events-none sticky top-0 z-10 shrink-0"
            style={{ height: 'var(--spacing-5)' }}
            aria-hidden
          />
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center py-24">
              <div className="mb-6 h-36 w-36">
                <VibeyLoadingSphereSimple size="small" state={vibeyState} showBackground={true} />
              </div>
              <h1 className="title-h2 text-center text-[var(--color-foreground)]">
                WHAT ARE WE BUILDING?
              </h1>
              {activeCampaignName && (
                <p className="body-3 text-muted-foreground mt-2 text-center">
                  Campaign:{' '}
                  <span className="text-foreground font-medium">{activeCampaignName}</span>
                </p>
              )}
            </div>
          )}

          <div className="gap-spacing-3 flex flex-1 flex-col">
            {/* Leading non-user messages (intro, system, etc) */}
            {turnData.leadingMessages.map((m) => (
              <div key={m.id} data-message-id={m.id}>
                <MessageBubble
                  message={m}
                  isStreaming={m.id === streamingMessageId}
                  isEditable={m.id === editableUserMessageId}
                  onEditSubmit={m.id === editableUserMessageId ? handleEditSubmit : undefined}
                  knownSkillKeys={knownSkillKeys}
                  agentKey="vibey"
                  onOpenDeliverablePreview={setPreviewStudioDeliverable}
                  pinAssistantActions={m.id === pinnedAssistantMessageId}
                />
              </div>
            ))}

            {/* Turns: Each Turn is a container that handles its own sticky user bubble */}
            {turnData.turns.map((turn, turnIdx) => {
              const isLastTurn = turnIdx === turnData.turns.length - 1
              const previousTurn = turnData.turns[turnIdx - 1]
              return (
                <div
                  key={turn.user.id}
                  data-turn-id={turn.user.id}
                  className={`relative flex flex-col ${isLastTurn ? 'flex-1' : ''}`}
                >
                  <ChatTurnChangeDivider
                    previousUserMessage={previousTurn?.user ?? null}
                    userMessage={turn.user}
                  />
                  {/* Sticky User Prompt — top-spacing-5 aligns bubble top with minimized header icon tops */}
                  <div
                    ref={isLastTurn ? lastUserPromptRef : undefined}
                    className="top-spacing-5 sticky z-20"
                  >
                    <div className="surface-bg">
                      <MessageBubble
                        message={turn.user}
                        isStreaming={false}
                        stickyUser
                        isEditable={turn.user.id === editableUserMessageId}
                        onEditSubmit={
                          turn.user.id === editableUserMessageId ? handleEditSubmit : undefined
                        }
                        knownSkillKeys={knownSkillKeys}
                        agentKey="vibey"
                        onOpenDeliverablePreview={setPreviewStudioDeliverable}
                      />
                    </div>
                    {/* Shadow-like fade: makes following text look like it's going "inside" as it scrolls up */}
                    <div className="pointer-events-none h-6 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
                  </div>

                  {/* Assistant Responses for this turn */}
                  <div
                    className="gap-spacing-3 flex flex-col"
                    style={
                      isLastTurn
                        ? {
                            minHeight: Math.max(
                              0,
                              spacerHeight - stickyTopOffsetRef.current - lastUserPromptHeight,
                            ),
                          }
                        : undefined
                    }
                  >
                    {turn.responses.map((m) => (
                      <div key={m.id} data-message-id={m.id}>
                        <MessageBubble
                          message={m}
                          isStreaming={m.id === streamingMessageId}
                          isEditable={m.id === editableUserMessageId}
                          onEditSubmit={
                            m.id === editableUserMessageId ? handleEditSubmit : undefined
                          }
                          knownSkillKeys={knownSkillKeys}
                          agentKey="vibey"
                          onOpenDeliverablePreview={setPreviewStudioDeliverable}
                          pinAssistantActions={m.id === pinnedAssistantMessageId}
                        />
                      </div>
                    ))}
                    {isLastTurn && (
                      <div className="mt-1">
                        <StatusIndicator />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Low credits warning */}
      {creditsLow && !creditsExhausted && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/5 px-4 py-2">
          <span className="body-3 text-amber-400">
            Running low on credits ({creditsLowRemaining} remaining)
          </span>
          <button
            onClick={() => {
              const event = new CustomEvent('open-account-settings', { detail: 'billing' })
              window.dispatchEvent(event)
            }}
            className="body-3 font-medium text-amber-400 underline hover:text-amber-300"
          >
            Buy more
          </button>
        </div>
      )}

      {/* Credits exhausted overlay */}
      {creditsExhausted && (
        <div className="bg-[var(--color-destructive)]/5 flex flex-col items-center gap-3 px-4 py-4">
          <p className="body-2 font-medium text-[var(--color-foreground)]">
            You&apos;ve run out of credits
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-credit-purchase'))
                useChatStore.getState().setCreditsExhausted(false)
              }}
              className="body-2 chip-glass-green rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
            >
              Buy More Credits
            </button>
            <button
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
      )}

      <StreamInterruptedBar conversationId={activeConversationId} />

      {/* Composer */}
      <div
        ref={composerRef}
        className="px-spacing-4 pb-spacing-4 pt-spacing-2 relative flex shrink-0 flex-col items-center"
      >
        {/* Quick jump to latest message — floats just above the composer */}
        {userHasScrolledUp && messages.length > 0 && (
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
        )}
        <div className="w-full max-w-3xl">
          {/* Campaign chips — shown when no active campaign */}
          {!activeCampaignId && canAttachCampaignWithChip && recentCampaigns.length > 0 && (
            <div className="mb-4 flex flex-col items-center gap-1.5">
              <span className="body-3 text-[var(--color-muted-foreground)]">
                Add this task to a campaign:
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {recentCampaigns.map((c) => {
                  const isSelected = pickedCampaignId === c.id
                  const iconName = (c.config as Record<string, string>)?.icon || 'folder-kanban'
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => void handleCampaignChipClick(c)}
                      className={`body-2 flex items-center gap-2 rounded-full px-4 py-2 font-medium transition-all ${
                        isSelected ? 'chip-glass-blue' : 'chip-glass-neutral'
                      }`}
                      style={{
                        opacity: pickedCampaignId && !isSelected ? 0.45 : 1,
                      }}
                    >
                      <LucideIcon name={iconName} className="h-4 w-4" />
                      <span className="max-w-[140px] truncate">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <RateLimitCard />
          {regenerateAdContext && (
            <div className="border-border bg-card flex items-center gap-3 rounded-xl border px-3 py-2">
              {regenerateAdContext.imageUrl ? (
                <img
                  src={regenerateAdContext.imageUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="bg-secondary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                  <Sparkles className="text-muted-foreground h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="typo-caption text-muted-foreground">Regenerating image for this ad</p>
                <p className="body-3 text-foreground truncate" title={regenerateAdContext.headline}>
                  {regenerateAdContext.headline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRegenerateAdContext(null)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {addArtifactContext && (
            <div className="border-border bg-card flex items-center gap-3 rounded-xl border px-3 py-2">
              <div className="bg-secondary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                <Sparkles className="text-muted-foreground h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="typo-caption text-muted-foreground">
                  {addArtifactContext.type === 'new-campaign'
                    ? 'Adding to this campaign'
                    : addArtifactContext.type === 'new-ad-set'
                      ? 'New ad set in campaign'
                      : 'New creative in ad set'}
                </p>
                <p
                  className="body-3 text-foreground truncate"
                  title={addArtifactContext.parentLabel}
                >
                  {addArtifactContext.parentLabel || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddArtifactContext(null)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <MessageQueue
            items={queue}
            onRemove={handleQueueRemove}
            onSendNow={handleQueueSendNow}
            onEdit={handleQueueEdit}
          />
          <ComposerInputStack stackActive={false}>
            <ChatInput
              onSend={handleComposerSendWithQueueEdit}
              campaignId={effectiveCampaignId}
              conversationId={activeConversationId}
              defaultModel={activeConversation?.default_model_id ?? null}
              defaultModelSettings={conversationModelSettings}
              campaignModelStrategy={campaignModelStrategy}
              disabled={creditsExhausted}
              sendDisabled={activeConversationStopping}
              creditsExhausted={creditsExhausted}
              isStreaming={isStreaming}
              onStop={handleStop}
              initialValue={composerRestore?.text}
              initialDocuments={composerRestore?.documents}
              restoreNonce={composerRestore?.nonce}
              setTextRef={setTextRef}
              onEnqueue={editingQueueItemId ? undefined : handleEnqueue}
              onSendNow={handleQueueSendNowNext}
              queueLength={queue.length}
              compact
            />
          </ComposerInputStack>
        </div>
      </div>

      {previewStudioDeliverable && (
        <DeliverablePreviewModal
          deliverable={previewStudioDeliverable}
          agents={[]}
          campaignId={activeCampaignId}
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={() => setPreviewStudioDeliverable(null)}
        />
      )}
    </div>
  )
}
