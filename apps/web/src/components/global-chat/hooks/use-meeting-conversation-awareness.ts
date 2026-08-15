'use client'

import { useMemo } from 'react'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { readMeetingConversationLink } from '@/lib/conversations/conversation-meeting-link'
import { buildMeetingConversationAwareness } from '../lib/meeting-conversation-awareness'

export function useMeetingConversationAwareness(conversationId: string | null): string | undefined {
  const conversation = useChatStore((state) =>
    conversationId ? (state.conversations.find((row) => row.id === conversationId) ?? null) : null,
  )
  return useMemo(() => {
    const link = readMeetingConversationLink(conversation?.metadata)
    if (!link) return undefined
    return buildMeetingConversationAwareness({
      ...link,
      title: conversation?.title ?? 'Meeting',
    })
  }, [conversation])
}
