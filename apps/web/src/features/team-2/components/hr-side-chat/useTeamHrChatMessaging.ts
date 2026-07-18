'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import type { ChatModelSettings, DocumentAttachment } from '@/lib/chat'
import type { AttachedArtifact } from '@/lib/chat/attached-artifact'
import { toastMessageForChatSendError } from '@/lib/chat/chat-stream-errors.config'
import { CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import {
  deleteMessagesFrom,
  fetchMessages,
  requestStopStream,
  sendMessageStreaming,
  suggestConversationTitle,
  useChatStore,
  type Conversation,
  type HighlightedArtifact,
  type Message,
  type MessageReference,
} from '@/lib/chat/studio-chat-runtime-adapter'
import { createNewConversation, renameConversation } from '@/lib/conversations'
import { resolveSuggestedConversationTitle } from '@/lib/conversations/conversation-title'

interface UseTeamHrChatMessagingOptions {
  activeAgentKey: string
  getAwarenessContext: () => string
  storageScope: 'hr' | 'atlas' | 'loop'
  resolveSpaceIdBeforeSend?: () => Promise<string | null>
  spaceId: string | null
  setTextRef: React.MutableRefObject<((text: string) => void) | null>
  selectedConversationId: string | null
  selectedConversation: Conversation | null
  messages: Message[]
  isStreaming: boolean
  isStopping: boolean
  queueLength: number
  showCheckpoints: boolean
  focusedAgentEditable: boolean | undefined
  onStreamSettled?: () => void
  persistConversationId: (conversationId: string | null) => void
  notifyLoopConversationChanged: (conversationId: string | null) => void
  setSelectedConversationId: Dispatch<SetStateAction<string | null>>
  setConversations: Dispatch<SetStateAction<Conversation[]>>
  setCheckpointRefreshSignal: Dispatch<SetStateAction<number>>
  processQueueDeps: {
    dequeueMessage: ReturnType<typeof useChatStore.getState>['dequeueMessage']
    enqueueMessage: ReturnType<typeof useChatStore.getState>['enqueueMessage']
    removeQueueItem: ReturnType<typeof useChatStore.getState>['removeQueueItem']
    updateQueueItem: ReturnType<typeof useChatStore.getState>['updateQueueItem']
  }
}

export function useTeamHrChatMessaging({
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
  queueLength,
  showCheckpoints,
  focusedAgentEditable,
  onStreamSettled,
  persistConversationId,
  notifyLoopConversationChanged,
  setSelectedConversationId,
  setConversations,
  setCheckpointRefreshSignal,
  processQueueDeps,
}: UseTeamHrChatMessagingOptions) {
  const { dequeueMessage, enqueueMessage, removeQueueItem, updateQueueItem } = processQueueDeps
  const [composerRestore, setComposerRestore] = useState<{
    text: string
    documents?: DocumentAttachment[]
    nonce: string
  } | null>(null)
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(null)
  const prevStreamingRef = useRef(false)

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
      resolveSpaceIdBeforeSend,
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
      activeAgentKey,
      getAwarenessContext,
      isStopping,
      notifyLoopConversationChanged,
      persistConversationId,
      resolveActiveSpaceId,
      resolveSpaceIdBeforeSend,
      selectedConversationId,
      setConversations,
      setSelectedConversationId,
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

  const handleQueueEdit = useCallback(
    (item: { id: string; content: string }) => {
      setEditingQueueItemId(item.id)
      setTextRef.current?.(item.content)
    },
    [setTextRef],
  )

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
      if (queueLength > 0) void processNextQueueItem()
      if (showCheckpoints && focusedAgentEditable) setCheckpointRefreshSignal((value) => value + 1)
      onStreamSettled?.()
    }
  }, [
    isStreaming,
    isStopping,
    queueLength,
    processNextQueueItem,
    focusedAgentEditable,
    showCheckpoints,
    onStreamSettled,
    setCheckpointRefreshSignal,
  ])

  const handleStop = useCallback(() => {
    if (selectedConversationId) void requestStopStream(selectedConversationId)
  }, [selectedConversationId])

  return {
    composerRestore,
    setComposerRestore,
    editingQueueItemId,
    lastUserMessageId,
    handleEditSubmit,
    sendWithToast,
    handleSend,
    handleEnqueue,
    handleQueueSendNow,
    handleQueueSendNowNext,
    handleQueueRemove,
    handleQueueEdit,
    handleComposerSendWithQueueEdit,
    handleStop,
  }
}
