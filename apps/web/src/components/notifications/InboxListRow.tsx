'use client'

import type { ReactNode } from 'react'
import { Archive, ChevronRight, Clock3, Mail, MailOpen, RotateCcw } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Tooltip } from '@/components/ui/tooltip'
import {
  INBOX_MESSAGES,
  notificationDotClass,
  notificationMarkdownSource,
  notificationTypeLabel,
  type UserNotification,
} from '@/lib/notifications'

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        className="btn-icon-bare text-muted-foreground hover:text-foreground"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation()
          onClick()
        }}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export function InboxListRow({
  notification,
  selected,
  onSelect,
  onClear,
  onRestore,
  onSnooze,
  onUnsnooze,
  onToggleRead,
}: {
  notification: UserNotification
  selected: boolean
  onSelect: () => void
  onClear: () => void
  onRestore: () => void
  onSnooze: () => void
  onUnsnooze: () => void
  onToggleRead: () => void
}) {
  const cleared = notification.cleared_at !== null
  const snoozed =
    notification.snoozed_until !== null &&
    new Date(notification.snoozed_until).getTime() > Date.now()
  const read = notification.read_at !== null

  return (
    <li className="border-border shrink-0 border-b last:border-b-0">
      <div
        className={`group/inbox-row flex min-w-0 items-start transition-colors ${
          selected ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle'
        } ${read ? 'opacity-75' : ''}`}
      >
        <button
          type="button"
          onClick={onSelect}
          className="gap-spacing-3 px-spacing-4 py-spacing-3 flex min-w-0 flex-1 items-start text-left"
          aria-current={selected ? 'true' : undefined}
        >
          <span
            className={`mt-spacing-2 h-spacing-2 w-spacing-2 shrink-0 rounded-full ${notificationDotClass(
              notification.type,
            )}`}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="gap-spacing-2 flex items-center">
              <span className="typo-caption text-muted-foreground uppercase tracking-wide">
                {notificationTypeLabel(notification.type)}
              </span>
              <span className="typo-caption text-muted-foreground ml-auto shrink-0 text-right tabular-nums">
                {new Date(notification.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
            <MarkdownRenderer
              compact
              className="body-3 text-foreground mt-spacing-1 line-clamp-2 max-w-none"
            >
              {notificationMarkdownSource(notification.title)}
            </MarkdownRenderer>
            {notification.body ? (
              <MarkdownRenderer
                compact
                muted
                className="body-4 mt-spacing-1 line-clamp-1 max-w-none"
              >
                {notificationMarkdownSource(notification.body)}
              </MarkdownRenderer>
            ) : null}
          </span>
          <ChevronRight className="icon-sm text-muted-foreground mt-spacing-1 shrink-0" />
        </button>

        <span className="gap-spacing-1 py-spacing-3 pr-spacing-3 hidden shrink-0 items-center opacity-0 transition-opacity group-hover/inbox-row:opacity-100 lg:flex">
          {cleared ? (
            <RowAction label={INBOX_MESSAGES.ACTIONS.restore} onClick={onRestore}>
              <RotateCcw className="icon-sm" />
            </RowAction>
          ) : (
            <RowAction label={INBOX_MESSAGES.ACTIONS.clear} onClick={onClear}>
              <Archive className="icon-sm" />
            </RowAction>
          )}
          {snoozed ? (
            <RowAction label={INBOX_MESSAGES.ACTIONS.unsnooze} onClick={onUnsnooze}>
              <RotateCcw className="icon-sm" />
            </RowAction>
          ) : (
            <RowAction label={INBOX_MESSAGES.ACTIONS.snooze} onClick={onSnooze}>
              <Clock3 className="icon-sm" />
            </RowAction>
          )}
          <RowAction
            label={read ? INBOX_MESSAGES.ACTIONS.unread : INBOX_MESSAGES.ACTIONS.read}
            onClick={onToggleRead}
          >
            {read ? <Mail className="icon-sm" /> : <MailOpen className="icon-sm" />}
          </RowAction>
        </span>
      </div>
    </li>
  )
}
