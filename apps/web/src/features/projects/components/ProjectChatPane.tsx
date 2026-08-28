'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { ComposerInputStack } from '@/components/chat/ComposerInputStack'
import type { AttachedArtifact } from '@/features/studio/components/chat/ArtifactAttachments'
import { ComposerActiveRunTipCard } from '@/features/studio/components/chat/ComposerActiveRunTipCard'
import { MessageQueue } from '@/features/studio/components/chat/MessageQueue'
import { PlanStickyTracker } from '@/features/studio/components/chat/PlanStickyTracker'
import { RateLimitCard } from '@/features/studio/components/chat/RateLimitCard'
import { StatusIndicator } from '@/features/studio/components/chat/StatusIndicator'
import { StreamInterruptedBar } from '@/features/studio/components/chat/StreamInterruptedBar'
import { ChatInput } from '@/features/studio/components/ChatInput'
import { MessageBubble } from '@/features/studio/components/MessageBubble'
import { toastMessageForChatSendError } from '@/features/studio/config/chat-stream-errors.config'
import { CHAT_TOAST_ERRORS } from '@/features/studio/config/chat-toast-errors.config'
import {
  deleteMessagesFrom,
  fetchMessages,
  requestStopStream,
  sendMessageStreaming,
  type ChatModelSettings,
} from '@/features/studio/services/chat.service'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type {
  DocumentAttachment,
  HighlightedArtifact,
  Message,
  MessageReference,
} from '@/features/studio/types'
import { backendGet } from '@/lib/api/backend-client'
import { resolvePinnedAssistantMessageId } from '@/lib/chat/assistant-message-actions'

const BOTTOM_SCROLL_THRESHOLD = 80

interface ProjectChatPaneProps {
  conversationId: string | null
  messages: Message[]
  isStreaming: boolean
  agentPhase: string
  ready: boolean
  onSend: (
    content: string,
    documents?: DocumentAttachment[],
    artifacts?: AttachedArtifact[],
    model?: string,
    modelSettings?: ChatModelSettings,
  ) => Promise<void>
}

export function ProjectChatPane({
  conversationId,
  messages,
  isStreaming,
  agentPhase: _agentPhase,
  ready,
  onSend,
}: ProjectChatPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const lastUserPromptRef = useRef<HTMLDivElement>(null)

  const [spacerHeight, setSpacerHeight] = useState(0)
  const [lastUserPromptHeight, setLastUserPromptHeight] = useState(0)
  const spacerHeightRef = useRef(0)
  const lastUserPromptHeightRef = useRef(0)
  const isProgrammaticScrollRef = useRef(false)
  const [knownSkillKeys, setKnownSkillKeys] = useState<Set<string>>(new Set())

  const streamingMessageId = useChatStore((s) =>
    conversationId ? (s.streamingMessageIdsByConversation[conversationId] ?? null) : null,
  )
  const queue = useChatStore((s) =>
    conversationId ? (s.messageQueueByConversation[conversationId] ?? EMPTY_QUEUE) : EMPTY_QUEUE,
  )
  const enqueueMessage = useChatStore((s) => s.enqueueMessage)
  const dequeueMessage = useChatStore((s) => s.dequeueMessage)
  const removeQueueItem = useChatStore((s) => s.removeQueueItem)
  const updateQueueItem = useChatStore((s) => s.updateQueueItem)
  const creditsExhausted = useChatStore((s) => s.creditsExhausted)
  const stoppingConversationIds = useChatStore((s) => s.stoppingConversationIds)
  const isStopping = conversationId ? stoppingConversationIds.includes(conversationId) : false

  const setTextRef = useRef<((text: string) => void) | null>(null)
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(null)
  const [composerRestore, setComposerRestore] = useState<{ text: string; nonce: string } | null>(
    null,
  )

  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const previousMessageCountRef = useRef(0)
  const lastScrolledConvRef = useRef<string | null>(null)

  useEffect(() => {
    backendGet<{ id: string; skill_key: string }[]>(`/api/agents/viktor/skills`)
      .then((skills) => {
        if (Array.isArray(skills)) setKnownSkillKeys(new Set(skills.map((s) => s.skill_key)))
      })
      .catch(() => null)
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
  }, [conversationId])

  // Group messages into turns (User + following responses)
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
  }, [turnData])

  // Auto-scroll logic: Anchor new turn to top on send
  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || messages.length === 0) return

    const currentCount = messages.length
    const prevCount = previousMessageCountRef.current
    previousMessageCountRef.current = currentCount

    const isNewConversation = lastScrolledConvRef.current !== conversationId
    if (isNewConversation) {
      lastScrolledConvRef.current = conversationId
    }

    // New message in current conversation OR initial load of a conversation
    if ((currentCount > prevCount && prevCount > 0) || isNewConversation) {
      const latestUserMsg = [...messages].reverse().find((m) => m.role === 'user')
      if (latestUserMsg) {
        // Wait for render
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
  }, [messages.length, conversationId, messages, ready])

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

  const sendWithToast = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      modelSettings?: ChatModelSettings,
    ) => {
      try {
        if (conversationId) {
          useChatStore.getState().promoteConversation(conversationId)
        }
        await onSend(content, documents, artifacts, model, modelSettings)
      } catch (err) {
        if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
          useChatStore.getState().setCreditsExhausted(true)
          return
        }
        setComposerRestore({ text: content, nonce: crypto.randomUUID() })
        toast.error(toastMessageForChatSendError(err))
      }
    },
    [conversationId, onSend],
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
      if (!conversationId) return
      const highlightedArtifacts: HighlightedArtifact[] | undefined = artifacts?.map((a) => ({
        id: a.id,
        type: a.type,
        label: a.label,
      }))
      enqueueMessage(conversationId, {
        id: crypto.randomUUID(),
        content,
        documents,
        artifacts: highlightedArtifacts,
        model,
        modelSettings,
      })
    },
    [conversationId, enqueueMessage],
  )

  const processNextQueueItem = useCallback(async () => {
    if (!conversationId) return
    const item = dequeueMessage(conversationId)
    if (!item) return
    await sendWithToast(
      item.content,
      item.documents,
      item.artifacts as AttachedArtifact[] | undefined,
      item.model,
      item.modelSettings,
    )
  }, [conversationId, dequeueMessage, sendWithToast])

  const handleQueueSendNow = useCallback(
    async (itemId: string) => {
      if (!conversationId) return
      const store = useChatStore.getState()
      const items = store.messageQueueByConversation[conversationId] ?? []
      const item = items.find((queuedItem) => queuedItem.id === itemId)
      if (!item) return
      store.removeQueueItem(conversationId, itemId)
      if (isStreaming) void requestStopStream(conversationId)
      await sendWithToast(
        item.content,
        item.documents,
        item.artifacts as AttachedArtifact[] | undefined,
        item.model,
        item.modelSettings,
      )
    },
    [conversationId, isStreaming, sendWithToast],
  )

  const handleQueueSendNowNext = useCallback(async () => {
    if (!conversationId) return
    if (isStreaming) void requestStopStream(conversationId)
    await new Promise((resolve) => setTimeout(resolve, 100))
    await processNextQueueItem()
  }, [conversationId, isStreaming, processNextQueueItem])

  const handleQueueRemove = useCallback(
    (itemId: string) => {
      if (!conversationId) return
      removeQueueItem(conversationId, itemId)
    },
    [conversationId, removeQueueItem],
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
      if (editingQueueItemId && conversationId) {
        const highlightedArtifacts: HighlightedArtifact[] | undefined = artifacts?.map((a) => ({
          id: a.id,
          type: a.type,
          label: a.label,
        }))
        updateQueueItem(conversationId, editingQueueItemId, {
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
    [editingQueueItemId, conversationId, updateQueueItem, handleSend],
  )

  const prevStreamingRef = useRef(isStreaming)
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current
    prevStreamingRef.current = isStreaming
    if (wasStreaming && !isStreaming && !isStopping) {
      if (queue.length > 0) void processNextQueueItem()
    }
  }, [isStreaming, isStopping, queue.length, processNextQueueItem])

  const handleStop = useCallback(() => {
    if (conversationId) void requestStopStream(conversationId)
  }, [conversationId])

  const lastUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') return messages[i]!.id
    }
    return null
  }, [messages])
  const editableUserMessageId = !isStreaming && !isStopping ? lastUserMessageId : null

  const handleEditSubmit = useCallback(
    async (
      newContent: string,
      documents?: DocumentAttachment[],
      model?: string,
      modelSettings?: ChatModelSettings,
    ) => {
      if (!conversationId || !editableUserMessageId) return
      try {
        const backendMessages = await fetchMessages(conversationId)
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
        await deleteMessagesFrom(conversationId, backendLastUser.id)
        useChatStore
          .getState()
          .setMessages(conversationId, backendMessages.slice(0, backendLastUserIndex))
        await sendMessageStreaming({
          conversation_id: conversationId,
          content: newContent,
          model,
          model_settings: modelSettings,
          documents,
        })
      } catch {
        toast.error(CHAT_TOAST_ERRORS.CHAT_RESEND_FAILED.userMessage)
      }
    },
    [conversationId, editableUserMessageId],
  )

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-muted-foreground)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="h-4 flex-shrink-0" />
      <PlanStickyTracker messages={messages} scrollContainerRef={scrollRef} />
      <div
        ref={scrollRef}
        className="px-spacing-4 flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center py-12">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                WHAT ARE WE BUILDING?
              </p>
              <p className="body-3 text-muted-foreground mt-2 max-w-xs text-center">
                Describe the app you want. Viktor will scaffold the project and you&apos;ll see it
                live on the right.
              </p>
            </div>
          )}

          <div className="flex flex-1 flex-col gap-3">
            {/* Leading non-user messages (intro, system, etc) */}
            {turnData.leadingMessages.map((m) => (
              <div key={m.id} data-message-id={m.id}>
                <MessageBubble
                  message={m}
                  isStreaming={m.id === streamingMessageId}
                  isEditable={m.id === editableUserMessageId}
                  onEditSubmit={m.id === editableUserMessageId ? handleEditSubmit : undefined}
                  conversationIdOverride={conversationId}
                  knownSkillKeys={knownSkillKeys}
                  pinAssistantActions={m.id === pinnedAssistantMessageId}
                />
              </div>
            ))}

            {/* Turns: Each Turn is a container that handles its own sticky user bubble */}
            {turnData.turns.map((turn, turnIdx) => {
              const isLastTurn = turnIdx === turnData.turns.length - 1
              return (
                <div
                  key={turn.user.id}
                  data-turn-id={turn.user.id}
                  className={`relative flex flex-col ${isLastTurn ? 'flex-1' : ''}`}
                >
                  <div ref={isLastTurn ? lastUserPromptRef : undefined}>
                    <MessageBubble
                      message={turn.user}
                      isStreaming={false}
                      isEditable={turn.user.id === editableUserMessageId}
                      onEditSubmit={
                        turn.user.id === editableUserMessageId ? handleEditSubmit : undefined
                      }
                      conversationIdOverride={conversationId}
                      knownSkillKeys={knownSkillKeys}
                    />
                  </div>

                  {/* Assistant Responses for this turn */}
                  <div
                    className="flex flex-col gap-3"
                    style={
                      isLastTurn
                        ? { minHeight: Math.max(0, spacerHeight - lastUserPromptHeight) }
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
                          conversationIdOverride={conversationId}
                          knownSkillKeys={knownSkillKeys}
                          pinAssistantActions={m.id === pinnedAssistantMessageId}
                        />
                      </div>
                    ))}
                    {isLastTurn && (
                      <div className="mt-1">
                        <StatusIndicator conversationIdOverride={conversationId} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <StreamInterruptedBar conversationId={conversationId} />

      <div
        ref={composerRef}
        className="px-spacing-4 pb-spacing-4 pt-spacing-2 relative flex shrink-0 flex-col items-center"
      >
        {userHasScrolledUp && messages.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 -top-12 z-10 flex justify-center">
            <button
              type="button"
              onClick={handleScrollToBottom}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_0_12px_4px_rgba(0,0,0,0.4)] transition-all hover:opacity-90"
              aria-label="Scroll to latest messages"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="w-full max-w-3xl">
          <RateLimitCard />
          <MessageQueue
            items={queue}
            onRemove={handleQueueRemove}
            onSendNow={handleQueueSendNow}
            onEdit={handleQueueEdit}
          />
          <ComposerInputStack
            stackActive={isStreaming}
            topSlot={<ComposerActiveRunTipCard stacked conversationId={conversationId} />}
          >
            <ChatInput
              onSend={handleComposerSendWithQueueEdit}
              disabled={creditsExhausted || isStopping}
              creditsExhausted={creditsExhausted}
              isStreaming={isStreaming}
              onStop={handleStop}
              conversationId={conversationId}
              setTextRef={setTextRef}
              onEnqueue={editingQueueItemId ? undefined : handleEnqueue}
              onSendNow={handleQueueSendNowNext}
              queueLength={queue.length}
              initialValue={composerRestore?.text}
              restoreNonce={composerRestore?.nonce}
              placeholder={
                messages.length === 0
                  ? 'Describe the app you want to build...'
                  : 'Ask Viktor to change something...'
              }
              compact
              agentKey="viktor"
            />
          </ComposerInputStack>
        </div>
      </div>
    </div>
  )
}

const EMPTY_QUEUE: Array<{
  id: string
  content: string
  documents?: DocumentAttachment[]
  artifacts?: HighlightedArtifact[]
  model?: string
}> = []
