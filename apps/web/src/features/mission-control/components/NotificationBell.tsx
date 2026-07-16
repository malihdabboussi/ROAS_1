'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Expand, Trash2 } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Tooltip } from '@/components/ui/tooltip'
import { useOrgStore } from '@/lib/org/org-context-store'
import { createClient } from '@/lib/supabase/client'
import {
  deleteReadNotifications,
  fetchAwarenessPoints,
  fetchNotifications,
  markAwarenessPointsReadAll,
  markNotificationRead,
  markNotificationsReadAll,
} from '../services/missions.service'
import type { AwarenessPoint, UserNotification } from '../types'
import { NotificationsFeedModal } from './NotificationsFeedModal'

const NOTIFICATION_LABELS: Record<string, string> = {
  mission_blocked: 'Blocked',
  mission_completed: 'Completed',
  mission_failed: 'Failed',
  deliverable_ready: 'Deliverable',
  subtask_blocked: 'Subtask Blocked',
  plan_approval_required: 'Plan approval',
  agent_message: 'Agent Message',
  human_dm_message: 'Direct Message',
  org_invitation: 'Org Invite',
}

const NOTIFICATION_DOT_CLASS: Record<string, string> = {
  mission_blocked: 'indicator-dot-glass-orange',
  mission_completed: 'indicator-dot-glass-green',
  mission_failed: 'indicator-dot-glass-red',
  deliverable_ready: 'indicator-dot-glass-blue',
  subtask_blocked: 'indicator-dot-glass-orange',
  plan_approval_required: 'indicator-dot-glass-blue',
  agent_message: 'indicator-dot-glass-green',
  human_dm_message: 'indicator-dot-glass-green',
  org_invitation: 'indicator-dot-glass-green',
}

type UnifiedItem =
  | { kind: 'notification'; data: UserNotification }
  | { kind: 'awareness'; data: AwarenessPoint }

/** Markdown hard line breaks within paragraphs; keep blank-line paragraph splits. */
function notificationMarkdownSource(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .split(/\n\n+/)
    .map((block) => block.replace(/\n/g, '  \n'))
    .join('\n\n')
}

export function NotificationBell() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const prevUnreadRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [feedOpen, setFeedOpen] = useState(false)
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [awareness, setAwareness] = useState<AwarenessPoint[]>([])
  const activeOrgId = useOrgStore((s) => s.activeOrgId)

  const loadNotifications = useCallback(async () => {
    const data = await fetchNotifications({ limit: 50 }).catch(() => [])
    setNotifications(data)
  }, [])

  const loadAwareness = useCallback(async () => {
    const data = await fetchAwarenessPoints().catch(() => [])
    setAwareness(data)
  }, [])

  const loadAll = useCallback(async () => {
    await Promise.all([loadNotifications(), loadAwareness()])
  }, [loadNotifications, loadAwareness])

  useEffect(() => {
    void loadAll()
  }, [loadAll, activeOrgId])

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    let notifChannel: ReturnType<typeof supabase.channel> | null = null
    let awarenessChannel: ReturnType<typeof supabase.channel> | null = null

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted || !user) return

      notifChannel = supabase
        .channel(`user-notifications-${user.id}-${activeOrgId ?? 'personal'}`)
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
        .channel(`awareness-points-${user.id}-${activeOrgId ?? 'personal'}`)
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
  }, [loadNotifications, loadAwareness, activeOrgId])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const unreadNotifs = notifications.filter((n) => n.read_at === null)
  const unreadAwareness = awareness.filter((p) => p.read_at === null)
  const totalUnread = unreadNotifs.length + unreadAwareness.length
  const readNotifCount = notifications.filter((n) => n.read_at !== null).length
  prevUnreadRef.current = unreadNotifs.length

  const unified: UnifiedItem[] = [
    ...notifications.map((n) => ({ kind: 'notification' as const, data: n })),
    ...awareness.map((a) => ({ kind: 'awareness' as const, data: a })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())

  const handleMarkAllRead = async () => {
    await Promise.all([
      markNotificationsReadAll().catch(() => null),
      markAwarenessPointsReadAll().catch(() => null),
    ])
    await loadAll()
  }

  const handleDeleteReadNotifications = async () => {
    await deleteReadNotifications().catch(() => null)
    await loadNotifications()
  }

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.read_at) {
      await markNotificationRead(notification.id).catch(() => null)
      await loadNotifications()
    }
    if (notification.action_url) router.push(notification.action_url)
    setOpen(false)
  }

  const handleTalkToVibey = async () => {
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
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative h-9 w-9 shrink-0" data-dropdown>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="button-glass-neutral relative flex h-9 w-9 items-center justify-center rounded-full"
        aria-label="Notifications"
      >
        <Bell className="icon-sm" />
      </button>
      {totalUnread > 0 && (
        <span className="badge-glass-red typo-xs pointer-events-none absolute right-0 top-0 flex h-4 min-w-4 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full px-1 font-semibold">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
      {open && (
        <div className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 absolute right-0 z-30 mt-2 w-[360px]">
          <div className="gap-spacing-2 flex items-center justify-between">
            <p className="body-3 text-foreground font-semibold uppercase">Notifications</p>
            {totalUnread > 0 || readNotifCount > 0 ? (
              <div className="gap-spacing-1 flex shrink-0 items-center">
                {totalUnread > 0 ? (
                  <Tooltip label="Mark all as read" side="bottom">
                    <button
                      type="button"
                      onClick={() => void handleMarkAllRead()}
                      className="btn-icon-bare"
                      aria-label="Mark all as read"
                    >
                      <CheckCheck className="icon-sm" />
                    </button>
                  </Tooltip>
                ) : null}
                {readNotifCount > 0 ? (
                  <Tooltip label="Delete read notifications" side="bottom">
                    <button
                      type="button"
                      onClick={() => void handleDeleteReadNotifications()}
                      className="btn-icon-bare"
                      aria-label="Delete read notifications"
                    >
                      <Trash2 className="icon-sm" />
                    </button>
                  </Tooltip>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="gap-spacing-2 mt-spacing-2 flex items-center">
            <button
              type="button"
              onClick={() => void handleTalkToVibey()}
              className="button-glass-primary rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 flex-1"
            >
              Talk to ROAS
            </button>
            {unified.length > 0 ? (
              <Tooltip label="Open full notification feed" side="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setFeedOpen(true)
                    setOpen(false)
                  }}
                  className="button-glass-neutral rounded-spacing-2 px-spacing-2 py-spacing-2 flex shrink-0 items-center justify-center"
                  aria-label="Open full notification feed"
                >
                  <Expand className="icon-sm" />
                </button>
              </Tooltip>
            ) : null}
          </div>

          <div className="mt-spacing-2 max-h-80 overflow-y-auto">
            {unified.length === 0 ? (
              <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-3">
                No notifications yet.
              </p>
            ) : (
              unified.map((item) => {
                if (item.kind === 'notification') {
                  const n = item.data
                  return (
                    <button
                      key={`n-${n.id}`}
                      type="button"
                      onClick={() => void handleNotificationClick(n)}
                      className={`border-border px-spacing-2 py-spacing-2 flex w-full items-start gap-2 border-b text-left last:border-0 ${
                        n.read_at ? 'opacity-60' : ''
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          NOTIFICATION_DOT_CLASS[n.type] || 'indicator-dot-glass-muted'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="body-4 text-muted-foreground">
                            {NOTIFICATION_LABELS[n.type] || n.type}
                          </span>
                          <span className="body-4 text-muted-foreground shrink-0">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        <MarkdownRenderer compact className="body-3 text-foreground max-w-none">
                          {notificationMarkdownSource(n.title)}
                        </MarkdownRenderer>
                        {n.body ? (
                          <MarkdownRenderer compact muted className="body-4 mt-0.5 max-w-none">
                            {notificationMarkdownSource(n.body)}
                          </MarkdownRenderer>
                        ) : null}
                      </div>
                    </button>
                  )
                }

                const p = item.data
                return (
                  <div
                    key={`a-${p.id}`}
                    className={`border-border px-spacing-2 py-spacing-2 border-b last:border-0 ${
                      p.read_at ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="indicator-dot-glass-purple mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="body-4 text-muted-foreground">Awareness</span>
                          <span className="body-4 text-muted-foreground shrink-0">
                            {new Date(p.created_at).toLocaleString()}
                          </span>
                        </div>
                        <MarkdownRenderer compact className="body-3 text-foreground max-w-none">
                          {notificationMarkdownSource(p.content)}
                        </MarkdownRenderer>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      <NotificationsFeedModal
        open={feedOpen}
        onClose={() => setFeedOpen(false)}
        items={unified}
        onNotificationClick={(n) => void handleNotificationClick(n)}
      />
    </div>
  )
}
