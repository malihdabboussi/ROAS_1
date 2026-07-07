'use client'

import { useState } from 'react'
import { Brain, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  acceptCrossSuggestion,
  rejectCrossSuggestion,
} from '@/features/brain/services/brain-cross-suggestions.service'
import { retryBrainImportJobFromNotification } from '@/features/mission-control/services/missions.service'
import type { UserNotification } from '@/features/mission-control/types'
import type { UnifiedFeedItem } from '../hooks/use-notifications-feed'
import {
  notificationDotClass,
  notificationMarkdownSource,
  notificationRetryJobId,
  notificationTypeLabel,
} from '../lib/notification-meta'
import { NotificationFeedRowMeta } from './NotificationFeedRowMeta'

function itemCreatedAt(item: UnifiedFeedItem): Date {
  return new Date(item.data.created_at)
}

function itemReadAt(item: UnifiedFeedItem): string | null {
  return item.data.read_at
}

export function formatNotificationShortDate(d: Date, now: Date = new Date()): string {
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NotificationFeedRow({
  item,
  onNotificationClick,
  onMarkRead,
  onDelete,
  compact = false,
}: {
  item: UnifiedFeedItem
  onNotificationClick: (n: UserNotification) => void
  onMarkRead?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
  compact?: boolean
}) {
  const read = itemReadAt(item) !== null
  const dateText = formatNotificationShortDate(itemCreatedAt(item), new Date())

  if (item.kind === 'notification' && item.data.type === 'brain_cross_suggestion') {
    return (
      <CrossSuggestionRow
        notification={item.data}
        read={read}
        dateText={dateText}
        compact={compact}
        onMarkRead={onMarkRead}
        onDelete={onDelete}
      />
    )
  }

  if (item.kind === 'notification') {
    const n = item.data
    const dotClass = notificationDotClass(n.type)
    const label = notificationTypeLabel(n.type)
    const retryJobId = n.type === 'brain_import_failed' ? notificationRetryJobId(n) : null
    return (
      <li>
        <div
          className={`group/feed-row hover:bg-hover-subtle flex w-full min-w-0 items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors ${
            read ? 'opacity-60' : ''
          }`}
        >
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
                {label}
              </span>
              <NotificationFeedRowMeta
                dateText={dateText}
                read={read}
                onMarkRead={onMarkRead}
                onRetry={
                  retryJobId
                    ? async () => {
                        try {
                          await retryBrainImportJobFromNotification(retryJobId)
                          toast.success("Got it. I'm retrying that import.")
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Couldn't retry that import.",
                          )
                        }
                      }
                    : undefined
                }
                onDelete={onDelete}
              />
            </div>
            <button
              type="button"
              onClick={() => onNotificationClick(n)}
              className="w-full text-left"
            >
              <MarkdownRenderer
                compact
                className={`text-foreground max-w-none ${compact ? 'body-3 mt-0.5 line-clamp-2' : 'body-2 mt-0.5'}`}
              >
                {notificationMarkdownSource(n.title)}
              </MarkdownRenderer>
              {!compact && n.body ? (
                <MarkdownRenderer compact muted className="body-3 mt-0.5 max-w-none">
                  {notificationMarkdownSource(n.body)}
                </MarkdownRenderer>
              ) : null}
            </button>
          </div>
        </div>
      </li>
    )
  }

  const p = item.data
  return (
    <li>
      <div
        className={`group/feed-row flex w-full min-w-0 items-start gap-2.5 rounded-md px-2.5 py-2 ${
          read ? 'opacity-60' : ''
        }`}
      >
        <span
          className="indicator-dot-glass-purple mt-1.5 h-2 w-2 shrink-0 rounded-full"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
              Awareness
            </span>
            <NotificationFeedRowMeta
              dateText={dateText}
              read={read}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          </div>
          <MarkdownRenderer
            compact
            className={`text-foreground max-w-none ${compact ? 'body-3 mt-0.5 line-clamp-2' : 'body-2 mt-0.5'}`}
          >
            {notificationMarkdownSource(p.content)}
          </MarkdownRenderer>
        </div>
      </div>
    </li>
  )
}

function CrossSuggestionRow({
  notification,
  read,
  dateText,
  compact,
  onMarkRead,
  onDelete,
}: {
  notification: UserNotification
  read: boolean
  dateText: string
  compact?: boolean
  onMarkRead?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
}) {
  const [deciding, setDeciding] = useState(false)
  const [decided, setDecided] = useState<'accepted' | 'rejected' | null>(null)
  const meta = (notification as unknown as { metadata?: Record<string, unknown> }).metadata
  const suggestionId = typeof meta?.suggestion_id === 'string' ? meta.suggestion_id : null

  const handleAccept = async () => {
    if (!suggestionId || deciding) return
    setDeciding(true)
    try {
      await acceptCrossSuggestion(suggestionId)
      setDecided('accepted')
    } catch {
      setDeciding(false)
    }
  }

  const handleReject = async () => {
    if (!suggestionId || deciding) return
    setDeciding(true)
    try {
      await rejectCrossSuggestion(suggestionId)
      setDecided('rejected')
    } catch {
      setDeciding(false)
    }
  }

  return (
    <li>
      <div
        className={`group/feed-row flex w-full min-w-0 items-start gap-2.5 rounded-md px-2.5 py-2 ${
          read || decided ? 'opacity-60' : ''
        }`}
      >
        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
          <Brain className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
              Brain Suggestion
            </span>
            <NotificationFeedRowMeta
              dateText={dateText}
              read={read || decided !== null}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          </div>
          <MarkdownRenderer
            compact
            className={`text-foreground max-w-none ${compact ? 'body-3 mt-0.5 line-clamp-2' : 'body-2 mt-0.5'}`}
          >
            {notificationMarkdownSource(notification.title)}
          </MarkdownRenderer>
          {!compact && notification.body ? (
            <MarkdownRenderer compact muted className="body-3 mt-0.5 max-w-none">
              {notificationMarkdownSource(notification.body)}
            </MarkdownRenderer>
          ) : null}
          {!decided && !read && suggestionId ? (
            <div className="mt-1.5 flex items-center gap-1">
              <button
                type="button"
                disabled={deciding}
                onClick={() => void handleAccept()}
                className="button-glass-accent rounded-spacing-1 px-spacing-2 typo-caption font-medium"
              >
                <Check className="mr-0.5 inline h-3 w-3" />
                Accept
              </button>
              <button
                type="button"
                disabled={deciding}
                onClick={() => void handleReject()}
                className="button-glass-secondary rounded-spacing-1 px-spacing-2 typo-caption font-medium"
              >
                <X className="mr-0.5 inline h-3 w-3" />
                Dismiss
              </button>
            </div>
          ) : decided === 'accepted' ? (
            <p className="body-3 mt-0.5 text-green-400">Queued for campaign brain</p>
          ) : decided === 'rejected' ? (
            <p className="body-3 text-muted-foreground mt-0.5">Dismissed</p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
