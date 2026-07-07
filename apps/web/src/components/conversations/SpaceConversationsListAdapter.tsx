'use client'

import { useMemo } from 'react'
import { useChatStore } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  SpaceConversationsList as SharedSpaceConversationsList,
  type SpaceConversationsListProps,
} from './SpaceConversationsList'
import type { ConversationRowRuntimeState } from './SpaceConversationRows'

export function SpaceConversationsList({
  conversationRuntimeById: runtimeOverrides,
  conversations,
  ...props
}: SpaceConversationsListProps) {
  const streamingConversationIds = useChatStore((s) => s.streamingConversationIds)
  const conversationStreamUI = useChatStore((s) => s.conversationStreamUI)

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
      conversations={conversations}
      conversationRuntimeById={conversationRuntimeById}
    />
  )
}
