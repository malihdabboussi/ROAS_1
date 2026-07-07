'use client'

import { useState } from 'react'
import { Check, RotateCw, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

export function NotificationFeedRowMeta({
  dateText,
  read,
  onMarkRead,
  onRetry,
  onDelete,
}: {
  dateText: string
  read: boolean
  onMarkRead?: () => void | Promise<void>
  onRetry?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
}) {
  const [retrying, setRetrying] = useState(false)
  const showActions = Boolean(onMarkRead || onRetry || onDelete)

  return (
    <div className="relative flex h-5 shrink-0 items-center">
      <span
        className={`typo-caption text-muted-foreground shrink-0 tabular-nums transition-all duration-200 ease-out ${
          showActions
            ? 'group-hover/feed-row:pointer-events-none group-hover/feed-row:translate-x-1 group-hover/feed-row:opacity-0'
            : ''
        }`}
      >
        {dateText}
      </span>
      {showActions ? (
        <div className="pointer-events-none absolute right-0 flex translate-x-2 items-center gap-0.5 opacity-0 transition-all duration-200 ease-out group-hover/feed-row:pointer-events-auto group-hover/feed-row:translate-x-0 group-hover/feed-row:opacity-100">
          {!read && onMarkRead ? (
            <Tooltip label="Mark read" side="bottom">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void onMarkRead()
                }}
                className="button-glass-secondary rounded-spacing-1 flex h-5 w-5 items-center justify-center"
                aria-label="Mark read"
              >
                <Check className="h-3 w-3" />
              </button>
            </Tooltip>
          ) : null}
          {onRetry ? (
            <Tooltip label="Retry import" side="bottom">
              <button
                type="button"
                disabled={retrying}
                onClick={(e) => {
                  e.stopPropagation()
                  setRetrying(true)
                  void Promise.resolve(onRetry()).finally(() => setRetrying(false))
                }}
                className="button-glass-secondary rounded-spacing-1 flex h-5 w-5 items-center justify-center disabled:opacity-50"
                aria-label="Retry import"
              >
                <RotateCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
              </button>
            </Tooltip>
          ) : null}
          {onDelete ? (
            <Tooltip label="Delete" side="bottom">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void onDelete()
                }}
                className="button-glass-secondary rounded-spacing-1 flex h-5 w-5 items-center justify-center"
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
