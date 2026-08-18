'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { fetchWorkRequestReviewChat, mapWorkRequestReviewChatMessages } from '@/lib/work-requests'

/**
 * Signed-in `/home?conv=&wr=` can mount a blank Pixel pane when the scoped
 * conversation list never hydrates that thread. The review-token chat API
 * already has the messages — seed the store so the same cards can render.
 */
export function useWorkRequestHomeChatSeed() {
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conv')?.trim() || null
  const token = searchParams.get('wr')?.trim() || null
  const cachedCount = useChatStore((state) =>
    conversationId ? (state.messagesByConversation[conversationId]?.length ?? 0) : 0,
  )

  useEffect(() => {
    if (!conversationId || !token || cachedCount > 0) return
    let cancelled = false
    let attempts = 0

    const seed = () => {
      attempts += 1
      void fetchWorkRequestReviewChat(token)
        .then((payload) => {
          if (cancelled || payload.messages.length === 0) return
          const id = payload.conversation_id || conversationId
          const existing = useChatStore.getState().messagesByConversation?.[id]?.length ?? 0
          if (existing > 0) return
          useChatStore
            .getState()
            .setMessages(id, mapWorkRequestReviewChatMessages(id, payload.messages))
          useChatStore.getState().setActiveConversationId(id)
        })
        .catch(() => {
          // Retry once — first paint can race auth/session before the token chat API is ready.
          if (!cancelled && attempts < 2) {
            window.setTimeout(seed, 400)
          }
        })
    }

    seed()
    // Second pass after hydration races that briefly leave the pane empty.
    const retryId = window.setTimeout(seed, 700)
    return () => {
      cancelled = true
      window.clearTimeout(retryId)
    }
  }, [cachedCount, conversationId, token])
}
