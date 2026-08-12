'use client'

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  autoTitleConversation,
  needsGeneratedConversationTitle,
  type Conversation,
} from '@/lib/conversations'

export function useShellConversationAutoTitles(
  conversations: Conversation[],
  setConversations: Dispatch<SetStateAction<Conversation[]>>,
) {
  const attemptedRef = useRef(new Set<string>())

  useEffect(() => {
    const candidates = conversations
      .filter(
        (row) => needsGeneratedConversationTitle(row.title) && !attemptedRef.current.has(row.id),
      )
      .slice(0, 12)
    if (candidates.length === 0) return

    let cancelled = false
    const run = async () => {
      for (const row of candidates) {
        if (cancelled) return
        attemptedRef.current.add(row.id)
        try {
          const result = await autoTitleConversation(row.id)
          if (!result.updated || !result.title || cancelled) continue
          useChatStore.getState().updateConversation(row.id, { title: result.title })
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === row.id ? { ...conversation, title: result.title } : conversation,
            ),
          )
        } catch {
          // Non-critical: keep the existing title.
        }
      }
      invalidateCachedFetch('shell-conversations:')
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [conversations, setConversations])
}
