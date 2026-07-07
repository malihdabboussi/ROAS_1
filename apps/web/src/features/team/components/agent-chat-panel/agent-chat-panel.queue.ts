import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DocumentAttachment,
  HighlightedArtifact,
  MessageReference,
} from '@/lib/chat/studio-chat-runtime-adapter'
import type { AttachedArtifact, ChatModelSettings } from '@/lib/chat'

export interface AgentChatQueueItem {
  id: string
  content: string
  documents?: DocumentAttachment[]
  artifacts?: HighlightedArtifact[]
  references?: MessageReference[]
  model?: string
  modelSettings?: ChatModelSettings
}

type AgentChatQueueSend = (
  content: string,
  documents?: DocumentAttachment[],
  artifacts?: AttachedArtifact[],
  model?: string,
  references?: MessageReference[],
  modelSettings?: ChatModelSettings,
) => void | Promise<void>

export interface UseAgentChatQueueHandlersInput {
  selectedSessionId: string | null
  isStreaming: boolean
  isStopping: boolean
  queueLength: number
  enqueueMessage: (conversationId: string, item: AgentChatQueueItem) => void
  dequeueMessage: (conversationId: string) => AgentChatQueueItem | undefined
  removeQueueItem: (conversationId: string, itemId: string) => void
  updateQueueItem: (
    conversationId: string,
    itemId: string,
    updates: Partial<AgentChatQueueItem>,
  ) => void
  getQueuedItems: (conversationId: string) => AgentChatQueueItem[]
  requestStopStreamForSession: (conversationId: string) => void
  sendWithToast: AgentChatQueueSend
  handleSend: AgentChatQueueSend
  setComposerText: (text: string) => void
  createId: () => string
  wait: (ms: number) => Promise<void>
}

function toHighlightedArtifacts(
  artifacts?: AttachedArtifact[],
): HighlightedArtifact[] | undefined {
  return artifacts?.map((artifact) => ({
    id: artifact.id,
    type: artifact.type,
    label: artifact.label,
  }))
}

function toAttachedArtifacts(
  artifacts?: HighlightedArtifact[],
): AttachedArtifact[] | undefined {
  return artifacts as AttachedArtifact[] | undefined
}

export function useAgentChatQueueHandlers({
  selectedSessionId,
  isStreaming,
  isStopping,
  queueLength,
  enqueueMessage,
  dequeueMessage,
  removeQueueItem,
  updateQueueItem,
  getQueuedItems,
  requestStopStreamForSession,
  sendWithToast,
  handleSend,
  setComposerText,
  createId,
  wait,
}: UseAgentChatQueueHandlersInput) {
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(null)

  const handleEnqueue = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (!selectedSessionId) return
      enqueueMessage(selectedSessionId, {
        id: createId(),
        content,
        documents,
        artifacts: toHighlightedArtifacts(artifacts),
        model,
        references,
        modelSettings,
      })
    },
    [createId, enqueueMessage, selectedSessionId],
  )

  const processNextQueueItem = useCallback(async () => {
    if (!selectedSessionId) return
    const item = dequeueMessage(selectedSessionId)
    if (!item) return
    await sendWithToast(
      item.content,
      item.documents,
      toAttachedArtifacts(item.artifacts),
      item.model,
      item.references,
      item.modelSettings,
    )
  }, [dequeueMessage, selectedSessionId, sendWithToast])

  const handleQueueSendNow = useCallback(
    async (itemId: string) => {
      if (!selectedSessionId) return
      const item = getQueuedItems(selectedSessionId).find(
        (queuedItem) => queuedItem.id === itemId,
      )
      if (!item) return
      removeQueueItem(selectedSessionId, itemId)
      if (isStreaming) requestStopStreamForSession(selectedSessionId)
      await sendWithToast(
        item.content,
        item.documents,
        toAttachedArtifacts(item.artifacts),
        item.model,
        item.references,
        item.modelSettings,
      )
    },
    [
      getQueuedItems,
      isStreaming,
      removeQueueItem,
      requestStopStreamForSession,
      selectedSessionId,
      sendWithToast,
    ],
  )

  const handleQueueSendNowNext = useCallback(async () => {
    if (!selectedSessionId) return
    if (isStreaming) requestStopStreamForSession(selectedSessionId)
    await wait(100)
    await processNextQueueItem()
  }, [
    isStreaming,
    processNextQueueItem,
    requestStopStreamForSession,
    selectedSessionId,
    wait,
  ])

  const handleQueueRemove = useCallback(
    (itemId: string) => {
      if (!selectedSessionId) return
      removeQueueItem(selectedSessionId, itemId)
    },
    [removeQueueItem, selectedSessionId],
  )

  const handleQueueEdit = useCallback(
    (item: { id: string; content: string }) => {
      setEditingQueueItemId(item.id)
      setComposerText(item.content)
    },
    [setComposerText],
  )

  const handleComposerSendWithQueueEdit = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (editingQueueItemId && selectedSessionId) {
        updateQueueItem(selectedSessionId, editingQueueItemId, {
          content,
          documents,
          artifacts: toHighlightedArtifacts(artifacts),
          model,
          references,
          modelSettings,
        })
        setEditingQueueItemId(null)
        return
      }
      handleSend(content, documents, artifacts, model, references, modelSettings)
    },
    [editingQueueItemId, handleSend, selectedSessionId, updateQueueItem],
  )

  const prevStreamingRef = useRef(isStreaming)
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current
    prevStreamingRef.current = isStreaming
    if (wasStreaming && !isStreaming && !isStopping && queueLength > 0) {
      void processNextQueueItem()
    }
  }, [isStreaming, isStopping, processNextQueueItem, queueLength])

  return {
    editingQueueItemId,
    handleEnqueue,
    processNextQueueItem,
    handleQueueSendNow,
    handleQueueSendNowNext,
    handleQueueRemove,
    handleQueueEdit,
    handleComposerSendWithQueueEdit,
  }
}
