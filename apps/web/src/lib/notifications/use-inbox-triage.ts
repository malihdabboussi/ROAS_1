'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useOrgStore } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import {
  isSystemNotification,
  notificationInboxView,
  notificationMatchesInboxView,
  SYSTEM_NOTIFICATION_TYPES,
} from './inbox-view-predicates'
import { INBOX_MESSAGES } from './inbox.config'
import {
  clearNotification,
  clearNotificationView,
  fetchInboxTriageCounts,
  fetchNotifications,
  markNotificationRead,
  markNotificationsReadAll,
  markNotificationUnread,
  moveNotificationBucket,
  snoozeNotification,
  unclearNotification,
  unsnoozeNotification,
} from './notifications-api'
import type { InboxTriageCounts, InboxView, UserNotification } from './types'

const EMPTY_COUNTS: InboxTriageCounts = {
  primary: 0,
  system: 0,
  other: 0,
  later: 0,
  cleared: 0,
}

export function useInboxTriage(initialView: InboxView = 'primary') {
  const [view, setView] = useState<InboxView>(initialView)
  const [type, setType] = useState<string>('all')
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [counts, setCounts] = useState<InboxTriageCounts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const orgLoaded = useOrgStore((state) => state.isLoaded)
  const viewRef = useRef(view)
  const typeRef = useRef(type)
  const hasLoadedOnceRef = useRef(false)

  useEffect(() => {
    viewRef.current = view
    typeRef.current = type
  }, [type, view])

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!orgLoaded) return
      const silent = Boolean(options?.silent && hasLoadedOnceRef.current)
      if (!silent) setLoading(true)
      try {
        const [rows, nextCounts, systemRows] = await Promise.all([
          fetchNotifications({
            limit: 200,
            view,
            types:
              type === 'all' ? (view === 'system' ? [...SYSTEM_NOTIFICATION_TYPES] : []) : [type],
          }),
          fetchInboxTriageCounts(),
          fetchNotifications({
            limit: 200,
            unreadOnly: true,
            view: 'all',
            types: [...SYSTEM_NOTIFICATION_TYPES],
          }),
        ])
        const systemUnreadCount = systemRows.filter(isSystemNotification).length
        setNotifications(
          rows.filter((notification) => notificationMatchesInboxView(notification, view)),
        )
        setCounts({
          ...nextCounts,
          primary: Math.max(0, nextCounts.primary - systemUnreadCount),
          system: systemUnreadCount,
        })
        hasLoadedOnceRef.current = true
      } catch {
        toast.error(INBOX_MESSAGES.ERRORS.load)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [orgLoaded, type, view],
  )

  useEffect(() => {
    hasLoadedOnceRef.current = false
    void load()
  }, [activeOrgId, load])

  useEffect(() => {
    if (!orgLoaded) return
    const supabase = createClient()
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    void supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!mounted || !user) return
      channel = supabase
        .channel(`user-notifications-triage-${user.id}-${activeOrgId ?? 'personal'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType !== 'INSERT') {
              void load({ silent: true })
              return
            }
            const inserted = payload.new as UserNotification
            if ((inserted.org_id ?? null) !== (activeOrgId ?? null)) return
            const insertedView = notificationInboxView(inserted)
            if (!inserted.read_at) {
              setCounts((current) => ({
                ...current,
                [insertedView]: current[insertedView] + 1,
              }))
            }
            if (
              notificationMatchesInboxView(inserted, viewRef.current) &&
              (typeRef.current === 'all' || inserted.type === typeRef.current)
            ) {
              setNotifications((current) => [inserted, ...current])
            }
          },
        )
        .subscribe()
    })

    return () => {
      mounted = false
      if (channel) void supabase.removeChannel(channel)
    }
  }, [activeOrgId, load, orgLoaded])

  const optimistic = useCallback(
    async (id: string, patch: Partial<UserNotification>, request: () => Promise<unknown>) => {
      const beforeRows = notifications
      const beforeCounts = counts
      const target = notifications.find((notification) => notification.id === id)
      if (!target) return
      const updated = { ...target, ...patch }
      const oldView = notificationInboxView(target)
      const newView = notificationInboxView(updated)
      setNotifications((current) =>
        current
          .map((notification) => (notification.id === id ? updated : notification))
          .filter(
            (notification) =>
              notificationMatchesInboxView(notification, view) &&
              (type === 'all' || notification.type === type),
          ),
      )
      if (!target.read_at && oldView !== newView) {
        setCounts((current) => ({
          ...current,
          [oldView]: Math.max(0, current[oldView] - 1),
          [newView]: current[newView] + 1,
        }))
      } else if (target.read_at !== updated.read_at) {
        setCounts((current) => ({
          ...current,
          [oldView]: Math.max(0, current[oldView] + (updated.read_at ? -1 : 1)),
        }))
      }
      try {
        await request()
      } catch {
        setNotifications(beforeRows)
        setCounts(beforeCounts)
        toast.error(INBOX_MESSAGES.ERRORS.update)
      }
    },
    [counts, notifications, type, view],
  )

  const clearCurrentView = useCallback(async () => {
    if (view === 'all' || view === 'cleared') return
    const beforeRows = notifications
    const beforeCounts = counts
    setNotifications([])
    setCounts((current) => ({
      ...current,
      [view]: 0,
      cleared: current.cleared + current[view],
    }))
    try {
      if (view === 'system') {
        await Promise.all(beforeRows.map((notification) => clearNotification(notification.id)))
      } else {
        await clearNotificationView(view)
      }
    } catch {
      setNotifications(beforeRows)
      setCounts(beforeCounts)
      toast.error(INBOX_MESSAGES.ERRORS.update)
    }
  }, [counts, notifications, view])

  const markAllRead = useCallback(async () => {
    const beforeRows = notifications
    const beforeCounts = counts
    const readAt = new Date().toISOString()
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read_at: notification.read_at ?? readAt })),
    )
    setCounts(EMPTY_COUNTS)
    try {
      await markNotificationsReadAll()
    } catch {
      setNotifications(beforeRows)
      setCounts(beforeCounts)
      toast.error(INBOX_MESSAGES.ERRORS.update)
    }
  }, [counts, notifications])

  return {
    view,
    setView,
    type,
    setType,
    notifications,
    counts,
    loading,
    reload: load,
    clearCurrentView,
    markAllRead,
    clear: (notification: UserNotification) =>
      optimistic(notification.id, { cleared_at: new Date().toISOString() }, () =>
        clearNotification(notification.id),
      ),
    restore: (notification: UserNotification) =>
      optimistic(notification.id, { cleared_at: null }, () => unclearNotification(notification.id)),
    snooze: (notification: UserNotification) => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      return optimistic(notification.id, { snoozed_until: tomorrow, cleared_at: null }, () =>
        snoozeNotification(notification.id, tomorrow),
      )
    },
    unsnooze: (notification: UserNotification) =>
      optimistic(notification.id, { snoozed_until: null }, () =>
        unsnoozeNotification(notification.id),
      ),
    move: (notification: UserNotification, bucket: 'primary' | 'other') =>
      optimistic(
        notification.id,
        { inbox_bucket: bucket, snoozed_until: null, cleared_at: null },
        () => moveNotificationBucket(notification.id, bucket),
      ),
    toggleRead: (notification: UserNotification) =>
      optimistic(
        notification.id,
        { read_at: notification.read_at ? null : new Date().toISOString() },
        () =>
          notification.read_at
            ? markNotificationUnread(notification.id)
            : markNotificationRead(notification.id),
      ),
  }
}
