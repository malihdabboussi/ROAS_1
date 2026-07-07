'use client'

import { ComposerActiveRunTipCard as SharedComposerActiveRunTipCard } from '@/components/chat/ComposerActiveRunTipCard'
import { useChatStore } from '../../store/use-chat-store'

interface ComposerActiveRunTipCardProps {
  conversationId: string | null | undefined
  agentKey?: string
  stacked?: boolean
}

export function ComposerActiveRunTipCard({
  conversationId,
  stacked,
}: ComposerActiveRunTipCardProps) {
  const isStreaming = useChatStore((s) =>
    conversationId ? s.streamingConversationIds.includes(conversationId) : false,
  )

  return (
    <SharedComposerActiveRunTipCard
      conversationId={conversationId}
      isStreaming={isStreaming}
      stacked={stacked}
    />
  )
}
