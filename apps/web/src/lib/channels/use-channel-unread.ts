'use client'

import { useCallback, useEffect } from 'react'
import { createCachedResource } from '@/lib/cache/cached-resource'
import { createClient } from '@/lib/supabase/client'
import { channelsService } from './channels-api'

type ChannelUnreadCounts = Record<string, number>

const unreadResource = createCachedResource<ChannelUnreadCounts>(
  () => channelsService.getUnreadCounts(),
  { ttlMs: 60_000 },
)

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
    .channel('channel-unread-global')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'channel_messages',
      },
      (payload) => {
        const msg = payload.new as {
          channel_id: string
          sender_id: string
          reply_to_id: string | null
        }
        if (msg.reply_to_id) return
        if (msg.sender_id === currentUserId) return
        unreadResource.mutate((prev) => ({
          ...(prev ?? {}),
          [msg.channel_id]: (prev?.[msg.channel_id] ?? 0) + 1,
        }))
      },
    )
    .subscribe()
}

export const channelUnreadCache = {
  invalidate: () => unreadResource.invalidate(),
  reload: () => unreadResource.reload(),
  peek: () => unreadResource.peek(),
  mutate: (
    next: ChannelUnreadCounts | ((prev: ChannelUnreadCounts | undefined) => ChannelUnreadCounts),
  ) => unreadResource.mutate(next),
}

export function useChannelUnread(enabled = true) {
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
    async (channelId: string) => {
      unreadResource.mutate((prev) => {
        const next = { ...prev }
        delete next[channelId]
        return next
      })
      try {
        await channelsService.markChannelRead(channelId)
      } catch {
        void reload()
      }
    },
    [reload],
  )

  return { counts: data ?? {}, loaded: !loading && data !== undefined, markRead, reload }
}
