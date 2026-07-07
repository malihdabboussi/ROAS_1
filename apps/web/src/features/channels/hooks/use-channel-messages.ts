'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { createClient } from '@/lib/supabase/client'
import {
  channelsService,
  type ChannelMessage,
  type SendChannelMessagePayload,
} from '../services/channels.service'

function sortMessagesByCreatedAt(messages: ChannelMessage[]): ChannelMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

type ChannelMessagesRealtimePayload = RealtimePostgresChangesPayload<ChannelMessage>
type ChannelMessagesRealtimeListener = (payload: ChannelMessagesRealtimePayload) => void

const realtimeSubscriptions = new Map<
  string,
  { channel: RealtimeChannel; listeners: Set<ChannelMessagesRealtimeListener> }
>()

/**
 * One `channel_messages` realtime subscription per channel id, shared by every
 * mounted hook instance (page-level awareness + chat container) instead of one
 * socket subscription per instance. The last unsubscriber tears it down.
 */
function subscribeToChannelMessages(
  channelId: string,
  listener: ChannelMessagesRealtimeListener,
): () => void {
  let entry = realtimeSubscriptions.get(channelId)
  if (!entry) {
    const listeners = new Set<ChannelMessagesRealtimeListener>()
    const channel = createClient()
      .channel(`channel-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          // Rows on this subscription are always channel_messages records.
          const typed = payload as ChannelMessagesRealtimePayload
          for (const notify of listeners) notify(typed)
        },
      )
      .subscribe()
    entry = { channel, listeners }
    realtimeSubscriptions.set(channelId, entry)
  }
  const subscription = entry
  subscription.listeners.add(listener)
  return () => {
    subscription.listeners.delete(listener)
    if (
      subscription.listeners.size === 0 &&
      realtimeSubscriptions.get(channelId) === subscription
    ) {
      realtimeSubscriptions.delete(channelId)
      void createClient().removeChannel(subscription.channel)
    }
  }
}

export function useChannelMessages(channelId: string | null) {
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!channelId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // ttl 0 = dedupe-only: concurrent hook instances (page awareness +
      // chat container, StrictMode double-effects) share one request.
      const rows = await cachedFetch(`channel-messages:${channelId}`, () =>
        channelsService.listMessages(channelId, { limit: 200 }),
      )
      setMessages(sortMessagesByCreatedAt(rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages.')
    } finally {
      setLoading(false)
    }
  }, [channelId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!channelId) return

    return subscribeToChannelMessages(channelId, (payload) => {
      const eventType = payload.eventType
      const next = payload.new as ChannelMessage
      const previous = payload.old as { id?: string } | null

      setMessages((current) => {
        if (eventType === 'INSERT') {
          if (current.some((item) => item.id === next.id)) {
            return current
          }
          return sortMessagesByCreatedAt([...current, next])
        }

        if (eventType === 'UPDATE') {
          return sortMessagesByCreatedAt(
            current.map((item) => (item.id === next.id ? { ...item, ...next } : item)),
          )
        }

        if (eventType === 'DELETE') {
          const deleteId = previous?.id
          if (!deleteId) return current
          return current.filter((item) => item.id !== deleteId)
        }

        return current
      })
    })
  }, [channelId])

  const sendMessage = useCallback(
    async (payload: SendChannelMessagePayload) => {
      if (!channelId) return null
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const optimistic: ChannelMessage = {
        id: optimisticId,
        channel_id: channelId,
        sender_type: 'user',
        sender_id: '',
        content: payload.content?.trim() ?? null,
        content_blocks: null,
        metadata: payload.mentions?.length ? { mentions: payload.mentions } : null,
        reply_to_id: payload.reply_to_id ?? null,
        thread_name: null,
        pinned: false,
        pinned_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setMessages((prev) => sortMessagesByCreatedAt([...prev, optimistic]))
      try {
        const { message } = await channelsService.sendMessage(channelId, payload)
        setMessages((prev) => {
          const without = prev.filter((item) => item.id !== optimisticId)
          if (without.some((item) => item.id === message.id)) return without
          return sortMessagesByCreatedAt([...without, message])
        })
        return message
      } catch (err) {
        setMessages((prev) => prev.filter((item) => item.id !== optimisticId))
        throw err
      }
    },
    [channelId],
  )

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!channelId) return
      await channelsService.deleteMessage(channelId, messageId)
      setMessages((prev) => prev.filter((item) => item.id !== messageId))
    },
    [channelId],
  )

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!channelId) return null
      const { message } = await channelsService.editMessage(channelId, messageId, content)
      setMessages((prev) =>
        sortMessagesByCreatedAt(prev.map((item) => (item.id === message.id ? message : item))),
      )
      return message
    },
    [channelId],
  )

  const pinMessage = useCallback(
    async (messageId: string, pinned: boolean) => {
      if (!channelId) return null
      const { message } = await channelsService.pinMessage(channelId, messageId, pinned)
      setMessages((prev) =>
        sortMessagesByCreatedAt(prev.map((item) => (item.id === message.id ? message : item))),
      )
      return message
    },
    [channelId],
  )

  const pinnedMessages = useMemo(() => messages.filter((message) => message.pinned), [messages])

  return {
    messages,
    pinnedMessages,
    loading,
    error,
    reload,
    sendMessage,
    editMessage,
    pinMessage,
    deleteMessage,
    setMessages,
  }
}
