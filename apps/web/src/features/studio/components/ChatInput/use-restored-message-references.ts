import { useEffect, useState } from 'react'
import {
  GLOBAL_CHAT_SEED_EVENT,
  useGlobalChatStore,
  type GlobalChatSeedDetail,
} from '@/components/global-chat/store/use-global-chat-store'
import { useChatStore } from '../../store/use-chat-store'
import type { MessageReference } from '../../types'

export function useRestoredRefs(
  initialReferences: MessageReference[] | undefined,
  restoreNonce: string | undefined,
) {
  const [references, setReferences] = useState<MessageReference[]>(initialReferences ?? [])
  useEffect(() => {
    if (!restoreNonce) return
    setReferences(initialReferences ?? [])
  }, [initialReferences, restoreNonce])

  useEffect(() => {
    const handleReplySeed = (event: Event) => {
      const detail = (event as CustomEvent<GlobalChatSeedDetail>).detail
      if (detail?.seedMode !== 'attach' || !detail.conversationId) return
      if (detail.conversationId !== useChatStore.getState().activeConversationId) return

      const nextReferences = detail.references as MessageReference[] | undefined
      if (!nextReferences?.length) return
      setReferences(nextReferences)
      useGlobalChatStore.getState().consumePendingSeed()
    }

    window.addEventListener(GLOBAL_CHAT_SEED_EVENT, handleReplySeed)
    return () => window.removeEventListener(GLOBAL_CHAT_SEED_EVENT, handleReplySeed)
  }, [])

  return [references, setReferences] as const
}
