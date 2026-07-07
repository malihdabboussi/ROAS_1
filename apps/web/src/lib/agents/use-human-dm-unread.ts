'use client'

import { useCallback, useEffect } from 'react'
import { createCachedResource } from '@/lib/cache/cached-resource'
import { createClient } from '@/lib/supabase/client'
import { dmService } from './human-dm-api'

type DmUnreadCounts = Record<string, number>

const unreadResource = createCachedResource<DmUnreadCounts>(() => dmService.getUnreadCounts(), {
  ttlMs: 60_000,
})

let realtimeStarted = false
let currentUserId: string | null = null

function ensureRealtimeSubscription() {
  if (realtimeStarted || typeof window === 'undefined') return
  realtimeStarted = true

  const supabase = createClient()
  void supabase.auth.getUser().then(({ data }) => {
    currentUserId = data.user?.id ?? null
  })

  supabase
    .channel('human-dm-unread-global')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'human_dm_messages',
      },
      (payload) => {
        const msg = payload.new as {
          conversation_id: string
          sender_id: string
        }
        if (msg.sender_id === currentUserId) return
        unreadResource.mutate((prev) => ({
          ...(prev ?? {}),
          [msg.conversation_id]: (prev?.[msg.conversation_id] ?? 0) + 1,
        }))
      },
    )
    .subscribe()
}

export const dmUnreadCache = {
  invalidate: () => unreadResource.invalidate(),
  reload: () => unreadResource.reload(),
  peek: () => unreadResource.peek(),
  mutate: (next: DmUnreadCounts | ((prev: DmUnreadCounts | undefined) => DmUnreadCounts)) =>
    unreadResource.mutate(next),
}

export function useDmUnread(enabled = true) {
  const { data, loading, reload } = unreadResource.use({ enabled })

  useEffect(() => {
    ensureRealtimeSubscription()
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  const markRead = useCallback(
    async (conversationId: string) => {
      unreadResource.mutate((prev) => {
        const next = { ...(prev ?? {}) }
        delete next[conversationId]
        return next
      })
      try {
        await dmService.markRead(conversationId)
      } catch {
        void reload()
      }
    },
    [reload],
  )

  return { counts: data ?? {}, loaded: !loading && data !== undefined, markRead, reload }
}
