'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { useShellStore } from './use-shell-store'

/**
 * Restores (or keeps pinned) the shell artifact when the active conversation changes.
 */
export function useShellArtifactConversationSync(): void {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const syncArtifactViewerForConversation = useShellStore(
    (s) => s.syncArtifactViewerForConversation,
  )
  const previousConversationIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (previousConversationIdRef.current === undefined) {
      previousConversationIdRef.current = activeConversationId
      return
    }
    if (previousConversationIdRef.current === activeConversationId) return
    previousConversationIdRef.current = activeConversationId
    syncArtifactViewerForConversation(activeConversationId)
  }, [activeConversationId, syncArtifactViewerForConversation])
}
