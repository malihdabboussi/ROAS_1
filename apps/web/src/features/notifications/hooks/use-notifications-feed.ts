'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteAwarenessPoint,
  deleteNotification,
  deleteReadNotifications,
  fetchAwarenessPoints,
  fetchNotifications,
  markAwarenessPointRead,
  markAwarenessPointsReadAll,
  markNotificationRead,
  markNotificationsReadAll,
} from '@/features/mission-control/services/missions.service'
import type { AwarenessPoint, UserNotification } from '@/features/mission-control/types'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { createClient } from '@/lib/supabase/client'

export type UnifiedFeedItem =
  | { kind: 'notification'; data: UserNotification }
  | { kind: 'awareness'; data: AwarenessPoint }

export function useNotificationsFeed() {
  const router = useRouter()
  const prevUnreadRef = useRef(0)
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [awareness, setAwareness] = useState<AwarenessPoint[]>([])
  const [loading, setLoading] = useState(true)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const orgLoaded = useOrgStore((s) => s.isLoaded)

  const loadNotifications = useCallback(async () => {
    const data = await fetchNotifications({ limit: 100 }).catch(() => [])
    setNotifications(data)
  }, [])

  const loadAwareness = useCallback(async () => {
    const data = await fetchAwarenessPoints().catch(() => [])
    setAwareness(data)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadNotifications(), loadAwareness()])
    } finally {
      setLoading(false)
    }
  }, [loadNotifications, loadAwareness])

  useEffect(() => {
    // Gate on org store hydration: without it the feed fetched once at mount
    // (org null) and again when /api/org/my resolved.
    if (!orgLoaded) return
    void loadAll()
  }, [loadAll, activeOrgId, orgLoaded])

  useEffect(() => {
    if (!orgLoaded) return
    const supabase = createClient()
    let mounted = true
    let notifChannel: ReturnType<typeof supabase.channel> | null = null
    let awarenessChannel: ReturnType<typeof supabase.channel> | null = null

    const subscribe = async () => {
      // Local session read — no GoTrue network round-trip like auth.getUser().
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!mounted || !user) return

      notifChannel = supabase
        .channel(`user-notifications-inbox-${user.id}-${activeOrgId ?? 'personal'}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            const prev = prevUnreadRef.current
            void loadNotifications().then(() => {
              setNotifications((curr) => {
                const newUnread = curr.filter((n) => n.read_at === null).length
                if (newUnread > prev) {
                  try {
                    new Audio('/sounds/notification.wav').play().catch(() => {})
                  } catch {}
                }
                prevUnreadRef.current = newUnread
                return curr
              })
            })
          },
        )
        .subscribe()

      awarenessChannel = supabase
        .channel(`awareness-points-inbox-${user.id}-${activeOrgId ?? 'personal'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agent_awareness_points',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadAwareness()
          },
        )
        .subscribe()
    }

    void subscribe()

    return () => {
      mounted = false
      if (notifChannel) void supabase.removeChannel(notifChannel)
      if (awarenessChannel) void supabase.removeChannel(awarenessChannel)
    }
  }, [loadNotifications, loadAwareness, activeOrgId, orgLoaded])

  const unreadNotifs = notifications.filter((n) => n.read_at === null).length
  const unreadAwareness = awareness.filter((p) => p.read_at === null).length
  const totalUnread = unreadNotifs + unreadAwareness
  const readNotifCount = notifications.filter((n) => n.read_at !== null).length
  prevUnreadRef.current = unreadNotifs

  const unified: UnifiedFeedItem[] = [
    ...notifications.map((n) => ({ kind: 'notification' as const, data: n })),
    ...awareness.map((a) => ({ kind: 'awareness' as const, data: a })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())

  const handleMarkAllRead = useCallback(async () => {
    await Promise.all([
      markNotificationsReadAll().catch(() => null),
      markAwarenessPointsReadAll().catch(() => null),
    ])
    await loadAll()
  }, [loadAll])

  const handleDeleteReadNotifications = useCallback(async () => {
    await deleteReadNotifications().catch(() => null)
    await loadNotifications()
  }, [loadNotifications])

  const handleMarkFeedItemRead = useCallback(
    async (item: UnifiedFeedItem) => {
      if (item.kind === 'notification') {
        if (item.data.read_at) return
        await markNotificationRead(item.data.id).catch(() => null)
        await loadNotifications()
        return
      }
      if (item.data.read_at) return
      await markAwarenessPointRead(item.data.id).catch(() => null)
      await loadAwareness()
    },
    [loadNotifications, loadAwareness],
  )

  const handleDeleteFeedItem = useCallback(
    async (item: UnifiedFeedItem) => {
      if (item.kind === 'notification') {
        await deleteNotification(item.data.id).catch(() => null)
        await loadNotifications()
        return
      }
      await deleteAwarenessPoint(item.data.id).catch(() => null)
      await loadAwareness()
    },
    [loadNotifications, loadAwareness],
  )

  const handleNotificationClick = useCallback(
    async (notification: UserNotification) => {
      if (!notification.read_at) {
        await markNotificationRead(notification.id).catch(() => null)
        await loadNotifications()
      }
      if (notification.action_url) router.push(notification.action_url)
    },
    [router, loadNotifications],
  )

  const handleTalkToVibey = useCallback(async () => {
    const unreadContext = awareness
      .filter((p) => p.read_at === null)
      .slice(0, 50)
      .map((p) => `- [${p.point_type}] ${p.content}`)
      .join('\n')
    const agentKey = awareness[0]?.agent_key ?? ''
    await markAwarenessPointsReadAll().catch(() => null)
    await loadAwareness()
    const qs = new URLSearchParams()
    if (agentKey) qs.set('agent', agentKey)
    if (unreadContext) qs.set('inject_awareness', 'true')
    router.push(`/team${qs.toString() ? `?${qs.toString()}` : ''}`)
  }, [awareness, router, loadAwareness])

  return {
    loading,
    notifications,
    awareness,
    unified,
    totalUnread,
    unreadNotifs,
    unreadAwareness,
    readNotifCount,
    reload: loadAll,
    handleMarkAllRead,
    handleDeleteReadNotifications,
    handleMarkFeedItemRead,
    handleDeleteFeedItem,
    handleNotificationClick,
    handleTalkToVibey,
  }
}
