'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChatStore } from '@/lib/chat/studio-chat-runtime-adapter'
import { markConversationRead } from '@/lib/conversations'
import type { ConversationRowRuntimeState } from './SpaceConversationRows'
import {
  SpaceConversationsList as SharedSpaceConversationsList,
  type SpaceConversationsListProps,
} from './SpaceConversationsList'

export function SpaceConversationsList({
  conversationRuntimeById: runtimeOverrides,
  conversations,
  onSelectConversation,
  selectedConversationId,
  ...props
}: SpaceConversationsListProps) {
  const streamingConversationIds = useChatStore((s) => s.streamingConversationIds)
  const conversationStreamUI = useChatStore((s) => s.conversationStreamUI)
  const [locallyReadIds, setLocallyReadIds] = useState<ReadonlySet<string>>(() => new Set())
  const [locallyUnreadIds, setLocallyUnreadIds] = useState<ReadonlySet<string>>(() => new Set())
  const previousRunningIds = useRef<ReadonlySet<string>>(new Set(streamingConversationIds))

  useEffect(() => {
    const runningIds = new Set(streamingConversationIds)
    const completedIds = [...previousRunningIds.current].filter(
      (id) => !runningIds.has(id) && id !== selectedConversationId,
    )
    previousRunningIds.current = runningIds
    if (completedIds.length === 0) return
    setLocallyUnreadIds((current) => new Set([...current, ...completedIds]))
  }, [selectedConversationId, streamingConversationIds])

  const markRead = useCallback((conversationId: string) => {
    setLocallyReadIds((current) =>
      current.has(conversationId) ? current : new Set(current).add(conversationId),
    )
    setLocallyUnreadIds((current) => {
      if (!current.has(conversationId)) return current
      const next = new Set(current)
      next.delete(conversationId)
      return next
    })
    void markConversationRead(conversationId)
  }, [])

  useEffect(() => {
    if (!selectedConversationId) return
    const selected = conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    )
    if (selected?.is_unread || locallyUnreadIds.has(selectedConversationId)) {
      markRead(selectedConversationId)
    }
  }, [conversations, locallyUnreadIds, markRead, selectedConversationId])

  const conversationsWithActivity = useMemo(
    () =>
      conversations.map((conversation) => ({
        ...conversation,
        is_unread:
          !locallyReadIds.has(conversation.id) &&
          (locallyUnreadIds.has(conversation.id) || conversation.is_unread === true),
      })),
    [conversations, locallyReadIds, locallyUnreadIds],
  )

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      markRead(conversationId)
      onSelectConversation(conversationId)
    },
    [markRead, onSelectConversation],
  )

  const conversationRuntimeById = useMemo(() => {
    const runtimeById: Partial<Record<string, ConversationRowRuntimeState>> = {}
    for (const conversation of conversations) {
      const streamUi = conversationStreamUI[conversation.id]
      const isRunning = streamingConversationIds.includes(conversation.id)
      if (!isRunning && !streamUi) continue
      runtimeById[conversation.id] = {
        isRunning,
        phase: streamUi?.agentPhase ?? 'idle',
        toolLabel: streamUi?.activeTools?.[0]?.label ?? null,
        statusMessage: streamUi?.agentStatusMessage ?? null,
      }
    }
    return { ...runtimeById, ...runtimeOverrides }
  }, [conversationStreamUI, conversations, runtimeOverrides, streamingConversationIds])

  return (
    <SharedSpaceConversationsList
      {...props}
      conversations={conversationsWithActivity}
      conversationRuntimeById={conversationRuntimeById}
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleSelectConversation}
    />
  )
}
