'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dmService, type DmMessage } from '../services/dm.service'

function sortByCreatedAt(messages: DmMessage[]): DmMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

export function useHumanDmMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await dmService.listMessages(conversationId, { limit: 200 })
      setMessages(sortByCreatedAt(rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages.')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!conversationId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`human-dm-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'human_dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const eventType = payload.eventType
          const next = payload.new as DmMessage
          const previous = payload.old as { id?: string } | null

          setMessages((current) => {
            if (eventType === 'INSERT') {
              if (current.some((item) => item.id === next.id)) return current
              return sortByCreatedAt([...current, next])
            }
            if (eventType === 'UPDATE') {
              return sortByCreatedAt(
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
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId])

  const sendMessage = useCallback(
    async (payload: { content: string; attachments?: string[] }): Promise<DmMessage | null> => {
      if (!conversationId) return null
      const trimmed = payload.content.trim()
      const attachments = payload.attachments?.filter(Boolean) ?? []
      if (!trimmed && attachments.length === 0) return null
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const optimistic: DmMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: '',
        content: trimmed || null,
        content_blocks: null,
        metadata: attachments.length ? { attachments } : null,
        edited_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setMessages((prev) => sortByCreatedAt([...prev, optimistic]))
      try {
        const message = await dmService.sendMessage(conversationId, {
          content: trimmed || undefined,
          attachments: attachments.length ? attachments : undefined,
        })
        setMessages((prev) => {
          const without = prev.filter((item) => item.id !== optimisticId)
          if (without.some((item) => item.id === message.id)) return without
          return sortByCreatedAt([...without, message])
        })
        return message
      } catch (err) {
        setMessages((prev) => prev.filter((item) => item.id !== optimisticId))
        throw err
      }
    },
    [conversationId],
  )

  const editMessage = useCallback(
    async (messageId: string, content: string): Promise<DmMessage | null> => {
      if (!conversationId) return null
      const message = await dmService.editMessage(conversationId, messageId, content)
      setMessages((prev) =>
        sortByCreatedAt(prev.map((item) => (item.id === message.id ? message : item))),
      )
      return message
    },
    [conversationId],
  )

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return
      await dmService.deleteMessage(conversationId, messageId)
      setMessages((prev) => prev.filter((item) => item.id !== messageId))
    },
    [conversationId],
  )

  return {
    messages,
    loading,
    error,
    reload,
    sendMessage,
    editMessage,
    deleteMessage,
  }
}
