'use client'

import { useEffect } from 'react'
import { useChatStore } from '@/features/studio/store/use-chat-store'

const HOME_TITLE = 'Home | ROAS'

/**
 * When the shell shows a full conversation on /home, name the browser tab after it
 * ("Fork of 1DS COLLECTIVE | ROAS") instead of the generic route title — several chats
 * open in tabs are otherwise indistinguishable. Restores the route title on exit.
 */
export function useShellConversationDocumentTitle(
  conversationId: string | null,
  enabled: boolean,
): void {
  const title = useChatStore((s) => {
    if (!enabled || !conversationId) return null
    return s.conversations.find((c) => c.id === conversationId)?.title?.trim() || null
  })
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return
    const next = title ? `${title} | ROAS` : HOME_TITLE
    document.title = next
    return () => {
      // Only undo our own override — a route change may already have written the new
      // page's metadata title (e.g. "Meetings | ROAS") by the time this cleanup runs.
      if (document.title === next) document.title = HOME_TITLE
    }
  }, [enabled, title])
}
