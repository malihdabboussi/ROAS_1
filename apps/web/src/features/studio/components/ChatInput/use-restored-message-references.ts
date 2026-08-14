import { useEffect, useState } from 'react'
import {
  GLOBAL_CHAT_SEED_EVENT,
  type GlobalChatSeedDetail,
} from '@/components/global-chat/store/use-global-chat-store'
import type { MessageReference } from '../../types'

export function useRestoredRefs(
  initialReferences: MessageReference[] | undefined,
  restoreNonce: string | undefined,
  conversationId: string | null,
) {
  const [references, setReferences] = useState<MessageReference[]>(initialReferences ?? [])
  useEffect(() => {
    if (!restoreNonce) return
    setReferences(initialReferences ?? [])
  }, [initialReferences, restoreNonce])

  useEffect(() => {
    const handleComposerSeed = (event: Event) => {
      const detail = (event as CustomEvent<GlobalChatSeedDetail>).detail
      if (detail?.seedMode !== 'attach' || detail.conversationId !== conversationId) return
      const nextReferences = detail.references as MessageReference[] | undefined
      if (nextReferences?.length) setReferences(nextReferences)
    }

    window.addEventListener(GLOBAL_CHAT_SEED_EVENT, handleComposerSeed)
    return () => window.removeEventListener(GLOBAL_CHAT_SEED_EVENT, handleComposerSeed)
  }, [conversationId])

  return [references, setReferences] as const
}
