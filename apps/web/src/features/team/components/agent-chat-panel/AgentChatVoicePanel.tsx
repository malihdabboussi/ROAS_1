import type { MissionAgent } from '@/lib/agents'
import {
  fetchMessages,
  mergeMessagesPreservingOrderedBlocks,
  useChatStore,
} from '@/lib/chat/studio-chat-runtime-adapter'
import { AgentVoiceMode } from '../voice/AgentVoiceMode'

export const VOICE_MESSAGES_REFRESH_DELAY_MS = 1500

interface AgentChatVoicePanelProps {
  agent: MissionAgent
  conversationId: string | null
  onEnd: () => void
}

export function AgentChatVoicePanel({
  agent,
  conversationId,
  onEnd,
}: AgentChatVoicePanelProps) {
  const handleEnd = () => {
    onEnd()
    if (!conversationId) return

    const convId = conversationId
    setTimeout(async () => {
      try {
        const latest = await fetchMessages(convId)
        const local = useChatStore.getState().messagesByConversation[convId] ?? []
        useChatStore
          .getState()
          .setMessages(convId, mergeMessagesPreservingOrderedBlocks(local, latest))
      } catch {}
    }, VOICE_MESSAGES_REFRESH_DELAY_MS)
  }

  return <AgentVoiceMode agent={agent} conversationId={conversationId} onEnd={handleEnd} />
}
