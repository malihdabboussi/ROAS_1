'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, MessageCircle, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { NotificationFeedEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
import { HomeListCardShell } from '@/features/home/components/HomeListCardShell'
import type { UserNotification } from '@/features/mission-control/types'
import {
  NotificationFeedFilterPicker,
  NOTIFICATION_FEED_HEADER_ICON_BUTTON,
} from '@/features/notifications/components/NotificationFeedFilterPicker'
import { NotificationFeedRow } from '@/features/notifications/components/NotificationFeedRow'
import { useNotificationsFeed } from '@/features/notifications/hooks/use-notifications-feed'
import {
  DEFAULT_NOTIFICATION_FEED_FILTERS,
  filterNotificationFeedItems,
  listNotificationFeedTypeOptions,
  notificationFeedFilterSummary,
  type NotificationFeedFilters,
} from '@/features/notifications/lib/notification-feed-filters'

const INITIAL_ROWS = 15
const LOAD_MORE_ROWS = 15

function filteredEmptyMessage(filters: NotificationFeedFilters): string {
  const summary = notificationFeedFilterSummary(filters).toLowerCase()
  return summary === 'all' ? 'No notifications match this filter.' : `No ${summary} notifications.`
}

export function NotificationFeedCard({
  onNotificationClick,
}: {
  onNotificationClick: (notification: UserNotification) => void | Promise<void>
}) {
  const {
    loading,
    unified,
    totalUnread,
    unreadAwareness,
    readNotifCount,
    reload,
    handleTalkToVibey,
    handleMarkAllRead,
    handleDeleteReadNotifications,
    handleMarkFeedItemRead,
    handleDeleteFeedItem,
  } = useNotificationsFeed()

  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS)
  const [filters, setFilters] = useState<NotificationFeedFilters>(DEFAULT_NOTIFICATION_FEED_FILTERS)

  const typeOptions = useMemo(() => listNotificationFeedTypeOptions(unified), [unified])

  useEffect(() => {
    setVisibleCount(INITIAL_ROWS)
  }, [filters.status, filters.type])

  useEffect(() => {
    if (filters.type === 'all') return
    if (typeOptions.some((option) => option.id === filters.type)) return
    setFilters((prev) => ({ ...prev, type: 'all' }))
  }, [filters.type, typeOptions])

  const handleRowClick = async (notification: UserNotification) => {
    await onNotificationClick(notification)
    await reload()
  }

  const filteredItems = useMemo(
    () => filterNotificationFeedItems(unified, filters),
    [unified, filters],
  )
  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  )
  const hasMore = visibleCount < filteredItems.length

  const emptyMessage =
    unified.length === 0 ? (
      <div className="flex flex-col items-center gap-4 py-8">
        <NotificationFeedEmptyIllustration />
        <p className="body-3 text-muted-foreground max-w-[240px] text-center">
          All caught up. Agent updates and awareness will show up here.
        </p>
      </div>
    ) : (
      filteredEmptyMessage(filters)
    )

  return (
    <HomeListCardShell
      icon={Bell}
      title="Notification feed"
      titleSuffix={totalUnread > 0 ? `(${totalUnread} unread)` : undefined}
      headerRight={
        <div className="flex h-6 items-center gap-0.5">
          <NotificationFeedFilterPicker
            filters={filters}
            typeOptions={typeOptions}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          />
          {unreadAwareness > 0 ? (
            <Tooltip label="Talk to ROAS" side="bottom" triggerClassName="inline-flex items-center">
              <button
                type="button"
                onClick={() => void handleTalkToVibey()}
                className={NOTIFICATION_FEED_HEADER_ICON_BUTTON}
                aria-label="Talk to ROAS"
              >
                <MessageCircle className="icon-sm" />
              </button>
            </Tooltip>
          ) : null}
          {totalUnread > 0 ? (
            <Tooltip label="Mark all read" side="bottom" triggerClassName="inline-flex items-center">
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className={NOTIFICATION_FEED_HEADER_ICON_BUTTON}
                aria-label="Mark all read"
              >
                <CheckCheck className="icon-sm" />
              </button>
            </Tooltip>
          ) : null}
          {readNotifCount > 0 ? (
            <Tooltip
              label="Delete read notifications"
              side="bottom"
              triggerClassName="inline-flex items-center"
            >
              <button
                type="button"
                onClick={() => void handleDeleteReadNotifications()}
                className={NOTIFICATION_FEED_HEADER_ICON_BUTTON}
                aria-label="Delete read notifications"
              >
                <Trash2 className="icon-sm" />
              </button>
            </Tooltip>
          ) : null}
        </div>
      }
      loading={loading}
      emptyMessage={emptyMessage}
      hasRows={visibleItems.length > 0}
      footer={
        hasMore ? (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + LOAD_MORE_ROWS)}
            className="body-4 text-muted-foreground hover:text-foreground w-full rounded-md py-1 text-center font-medium transition-colors"
          >
            Load more
          </button>
        ) : null
      }
    >
      <ul className="space-y-0.5">
        {visibleItems.map((item) => (
          <NotificationFeedRow
            key={`${item.kind}:${item.data.id}`}
            item={item}
            onNotificationClick={(n) => void handleRowClick(n)}
            onMarkRead={() => void handleMarkFeedItemRead(item)}
            onDelete={() => void handleDeleteFeedItem(item)}
            compact
          />
        ))}
      </ul>
    </HomeListCardShell>
  )
}
