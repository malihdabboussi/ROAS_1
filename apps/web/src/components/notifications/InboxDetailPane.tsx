'use client'

import {
  Archive,
  ArrowLeft,
  Clock3,
  ExternalLink,
  Inbox,
  Mail,
  MailOpen,
  Maximize2,
  RotateCcw,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  INBOX_MESSAGES,
  notificationDetailActionLabel,
  notificationInboxView,
  notificationMarkdownSource,
  notificationSourceActionLabel,
  notificationTypeLabel,
  type UserNotification,
} from '@/lib/notifications'

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="gap-spacing-1 flex flex-col">
      <dt className="typo-caption text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="body-3 text-foreground">{value}</dd>
    </div>
  )
}

export function InboxDetailPane({
  notification,
  onBack,
  onOpenDetails,
  onViewSource,
  onClear,
  onRestore,
  onSnooze,
  onUnsnooze,
  onMove,
  onToggleRead,
}: {
  notification: UserNotification | null
  onBack: () => void
  onOpenDetails: () => void
  onViewSource: () => void
  onClear: () => void
  onRestore: () => void
  onSnooze: () => void
  onUnsnooze: () => void
  onMove: (bucket: 'primary' | 'other') => void
  onToggleRead: () => void
}) {
  if (!notification) {
    return (
      <div className="gap-spacing-3 px-spacing-8 flex h-full flex-col items-center justify-center text-center">
        <Inbox className="icon-lg text-muted-foreground" aria-hidden />
        <div>
          <p className="body-2 text-foreground font-medium">{INBOX_MESSAGES.DETAIL.emptyTitle}</p>
          <p className="body-3 text-muted-foreground mt-spacing-1 max-w-sm">
            {INBOX_MESSAGES.DETAIL.emptyBody}
          </p>
        </div>
      </div>
    )
  }

  const cleared = notification.cleared_at !== null
  const snoozed =
    notification.snoozed_until !== null &&
    new Date(notification.snoozed_until).getTime() > Date.now()
  const read = notification.read_at !== null
  const detailLabel = notificationDetailActionLabel(notification)
  const sourceLabel = notificationSourceActionLabel(notification)
  const currentView = notificationInboxView(notification)

  return (
    <article className="flex h-full min-h-0 flex-col">
      <header className="border-border px-spacing-5 py-spacing-3 gap-spacing-3 flex items-center border-b">
        <button
          type="button"
          className="btn-icon-bare md:hidden"
          aria-label={INBOX_MESSAGES.DETAIL.back}
          onClick={onBack}
        >
          <ArrowLeft className="icon-sm" />
        </button>
        <span className="typo-caption text-muted-foreground uppercase tracking-wide">
          {notificationTypeLabel(notification.type)}
        </span>
        <span className="typo-caption text-muted-foreground ml-auto">
          {new Date(notification.created_at).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </header>

      <div className="px-spacing-6 py-spacing-5 min-h-0 flex-1 overflow-y-auto">
        <MarkdownRenderer compact className="title-h6 text-foreground max-w-none">
          {notificationMarkdownSource(notification.title)}
        </MarkdownRenderer>

        <div className="mt-spacing-5">
          {notification.body ? (
            <MarkdownRenderer compact className="body-3 text-foreground max-w-none">
              {notificationMarkdownSource(notification.body)}
            </MarkdownRenderer>
          ) : (
            <p className="body-3 text-muted-foreground">{INBOX_MESSAGES.DETAIL.noBody}</p>
          )}
        </div>

        <section className="border-border mt-spacing-6 pt-spacing-5 border-t">
          <h3 className="body-3 text-foreground font-medium">{INBOX_MESSAGES.DETAIL.context}</h3>
          <dl className="gap-spacing-5 mt-spacing-4 grid grid-cols-2">
            <DetailFact
              label={INBOX_MESSAGES.DETAIL.received}
              value={new Date(notification.created_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
            <DetailFact
              label={INBOX_MESSAGES.DETAIL.status}
              value={INBOX_MESSAGES.VIEWS[currentView]}
            />
            <DetailFact
              label={INBOX_MESSAGES.DETAIL.location}
              value={sourceLabel ?? INBOX_MESSAGES.DETAIL.inboxOnly}
            />
            <DetailFact
              label={INBOX_MESSAGES.DETAIL.readState}
              value={read ? INBOX_MESSAGES.DETAIL.read : INBOX_MESSAGES.DETAIL.unread}
            />
          </dl>
        </section>
      </div>

      <footer className="border-border px-spacing-5 py-spacing-4 gap-spacing-3 flex flex-col border-t">
        {detailLabel || sourceLabel ? (
          <div className="gap-spacing-2 flex flex-wrap">
            {detailLabel ? (
              <button
                type="button"
                className="button-default button-glass-primary gap-spacing-2"
                onClick={onOpenDetails}
              >
                <Maximize2 className="icon-sm" />
                {detailLabel}
              </button>
            ) : null}
            {sourceLabel ? (
              <button
                type="button"
                className="button-default button-glass-neutral gap-spacing-2"
                onClick={onViewSource}
              >
                <ExternalLink className="icon-sm" />
                {sourceLabel}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="gap-spacing-2 flex flex-wrap">
          <button
            type="button"
            className="button-compact button-glass-neutral gap-spacing-1"
            onClick={cleared ? onRestore : onClear}
          >
            {cleared ? <RotateCcw className="icon-sm" /> : <Archive className="icon-sm" />}
            {cleared ? INBOX_MESSAGES.ACTIONS.restore : INBOX_MESSAGES.ACTIONS.clear}
          </button>
          <button
            type="button"
            className="button-compact button-glass-neutral gap-spacing-1"
            onClick={snoozed ? onUnsnooze : onSnooze}
          >
            {snoozed ? <RotateCcw className="icon-sm" /> : <Clock3 className="icon-sm" />}
            {snoozed ? INBOX_MESSAGES.ACTIONS.unsnooze : INBOX_MESSAGES.ACTIONS.snooze}
          </button>
          <button
            type="button"
            className="button-compact button-glass-neutral gap-spacing-1"
            onClick={onToggleRead}
          >
            {read ? <Mail className="icon-sm" /> : <MailOpen className="icon-sm" />}
            {read ? INBOX_MESSAGES.ACTIONS.unread : INBOX_MESSAGES.ACTIONS.read}
          </button>
          {!cleared && !snoozed ? (
            <button
              type="button"
              className="button-compact button-glass-neutral"
              onClick={() => onMove(notification.inbox_bucket === 'primary' ? 'other' : 'primary')}
            >
              {notification.inbox_bucket === 'primary'
                ? INBOX_MESSAGES.ACTIONS.other
                : INBOX_MESSAGES.ACTIONS.primary}
            </button>
          ) : null}
        </div>
      </footer>
    </article>
  )
}
