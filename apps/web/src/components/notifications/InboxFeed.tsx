'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Inbox,
  Mail,
  MailOpen,
  RotateCcw,
} from 'lucide-react'
import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  INBOX_MESSAGES,
  notificationTypeLabel,
  useInboxTriage,
  type InboxView,
  type UserNotification,
} from '@/lib/notifications'

const VIEW_OPTIONS: Array<{ id: Exclude<InboxView, 'all'>; label: string }> = [
  { id: 'primary', label: INBOX_MESSAGES.VIEWS.primary },
  { id: 'other', label: INBOX_MESSAGES.VIEWS.other },
  { id: 'later', label: INBOX_MESSAGES.VIEWS.later },
  { id: 'cleared', label: INBOX_MESSAGES.VIEWS.cleared },
]

function InboxAction({
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

function InboxRow({
  notification,
  expanded,
  onToggle,
  onClear,
  onRestore,
  onSnooze,
  onUnsnooze,
  onMove,
  onToggleRead,
  onOpen,
}: {
  notification: UserNotification
  expanded: boolean
  onToggle: () => void
  onClear: () => void
  onRestore: () => void
  onSnooze: () => void
  onUnsnooze: () => void
  onMove: (bucket: 'primary' | 'other') => void
  onToggleRead: () => void
  onOpen: () => void
}) {
  const cleared = notification.cleared_at !== null
  const snoozed =
    notification.snoozed_until !== null &&
    new Date(notification.snoozed_until).getTime() > Date.now()
  const read = notification.read_at !== null

  return (
    <li className="border-border border-b last:border-b-0">
      <div className="group/inbox-row hover:bg-hover-subtle flex min-w-0 items-start transition-colors">
        <button
          type="button"
          onClick={onToggle}
          className="gap-spacing-3 px-spacing-4 py-spacing-3 flex min-w-0 flex-1 items-start text-left"
          aria-expanded={expanded}
        >
          <span
            className={`mt-spacing-2 h-spacing-2 w-spacing-2 shrink-0 rounded-full ${
              read ? 'bg-border' : 'bg-primary'
            }`}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="gap-spacing-2 flex items-center">
              <span className="typo-caption text-muted-foreground uppercase tracking-wide">
                {notificationTypeLabel(notification.type)}
              </span>
              <span className="typo-caption text-muted-foreground w-spacing-12 ml-auto shrink-0 text-right tabular-nums">
                {new Date(notification.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
            <MarkdownRenderer
              compact
              className={`body-3 text-foreground mt-spacing-1 max-w-none ${
                expanded ? '' : 'line-clamp-2'
              }`}
            >
              {notification.title}
            </MarkdownRenderer>
          </span>
          {expanded ? (
            <ChevronUp className="icon-sm text-muted-foreground mt-spacing-1 shrink-0" />
          ) : (
            <ChevronDown className="icon-sm text-muted-foreground mt-spacing-1 shrink-0" />
          )}
        </button>
        <span className="gap-spacing-1 py-spacing-3 pr-spacing-3 hidden shrink-0 items-center opacity-0 transition-opacity group-hover/inbox-row:opacity-100 md:flex">
          <span className="flex items-center">
            {cleared ? (
              <InboxAction label={INBOX_MESSAGES.ACTIONS.restore} onClick={onRestore}>
                <RotateCcw className="icon-sm" />
              </InboxAction>
            ) : (
              <InboxAction label={INBOX_MESSAGES.ACTIONS.clear} onClick={onClear}>
                <Archive className="icon-sm" />
              </InboxAction>
            )}
            {snoozed ? (
              <InboxAction label={INBOX_MESSAGES.ACTIONS.unsnooze} onClick={onUnsnooze}>
                <RotateCcw className="icon-sm" />
              </InboxAction>
            ) : (
              <InboxAction label={INBOX_MESSAGES.ACTIONS.snooze} onClick={onSnooze}>
                <Clock3 className="icon-sm" />
              </InboxAction>
            )}
            <InboxAction
              label={read ? INBOX_MESSAGES.ACTIONS.unread : INBOX_MESSAGES.ACTIONS.read}
              onClick={onToggleRead}
            >
              {read ? <Mail className="icon-sm" /> : <MailOpen className="icon-sm" />}
            </InboxAction>
            {notification.action_url ? (
              <InboxAction label={INBOX_MESSAGES.ACTIONS.open} onClick={onOpen}>
                <ExternalLink className="icon-sm" />
              </InboxAction>
            ) : null}
          </span>
        </span>
      </div>

      {expanded ? (
        <div className="bg-secondary px-spacing-4 py-spacing-3 ml-spacing-7 mr-spacing-4 mb-spacing-3 rounded-spacing-2">
          {notification.body ? (
            <MarkdownRenderer compact muted className="body-3 max-w-none">
              {notification.body}
            </MarkdownRenderer>
          ) : (
            <p className="body-3 text-muted-foreground">{INBOX_MESSAGES.NO_DETAIL}</p>
          )}
          <div className="gap-spacing-2 mt-spacing-3 flex flex-wrap">
            <button
              type="button"
              className="button-compact button-glass-neutral"
              onClick={() => onMove(notification.inbox_bucket === 'primary' ? 'other' : 'primary')}
            >
              {notification.inbox_bucket === 'primary'
                ? INBOX_MESSAGES.ACTIONS.other
                : INBOX_MESSAGES.ACTIONS.primary}
            </button>
            <button
              type="button"
              className="button-compact button-glass-neutral"
              onClick={cleared ? onRestore : onClear}
            >
              {cleared ? INBOX_MESSAGES.ACTIONS.restore : INBOX_MESSAGES.ACTIONS.clear}
            </button>
            <button
              type="button"
              className="button-compact button-glass-neutral"
              onClick={snoozed ? onUnsnooze : onSnooze}
            >
              {snoozed ? INBOX_MESSAGES.ACTIONS.unsnooze : INBOX_MESSAGES.ACTIONS.snooze}
            </button>
            <button
              type="button"
              className="button-compact button-glass-neutral"
              onClick={onToggleRead}
            >
              {read ? INBOX_MESSAGES.ACTIONS.unread : INBOX_MESSAGES.ACTIONS.read}
            </button>
            {notification.action_url ? (
              <button
                type="button"
                className="button-compact button-glass-primary"
                onClick={onOpen}
              >
                {INBOX_MESSAGES.ACTIONS.open}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function InboxFeed({
  initialView = 'primary',
  presentation = 'card',
}: {
  initialView?: InboxView
  presentation?: 'card' | 'page'
}) {
  const router = useRouter()
  const inbox = useInboxTriage(initialView)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const typeOptions = useMemo(() => {
    const types = new Set(inbox.notifications.map((notification) => notification.type))
    if (inbox.type !== 'all') types.add(inbox.type as UserNotification['type'])
    return Array.from(types).sort((a, b) =>
      notificationTypeLabel(a).localeCompare(notificationTypeLabel(b)),
    )
  }, [inbox.notifications, inbox.type])

  return (
    <section
      className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${
        presentation === 'card' ? 'section-card card-elevated' : 'bg-background'
      }`}
    >
      <header className="border-border px-spacing-6 py-spacing-4 gap-spacing-3 flex flex-wrap items-center border-b">
        <div className="gap-spacing-2 flex min-w-0 items-center">
          <Inbox className="icon-md text-muted-foreground shrink-0" aria-hidden />
          <div className="min-w-0">
            <h2 className="body-1 text-foreground font-semibold">{INBOX_MESSAGES.TITLE}</h2>
            <p className="typo-caption text-muted-foreground truncate">{INBOX_MESSAGES.SUBTITLE}</p>
          </div>
        </div>
        <div className="ml-auto">
          <span className="sr-only">{INBOX_MESSAGES.FILTER.label}</span>
          <SettingsSelect
            value={inbox.type}
            options={[
              { value: 'all', label: INBOX_MESSAGES.FILTER.all },
              ...typeOptions.map((type) => ({
                value: type,
                label: notificationTypeLabel(type),
              })),
            ]}
            onChange={inbox.setType}
            wrapperClassName="relative w-spacing-40"
            triggerClassName="input-glass rounded-spacing-2 gap-spacing-2 h-spacing-8 px-spacing-3 flex w-full items-center justify-between"
            menuMinWidth={176}
          />
        </div>
      </header>

      <nav className="border-border px-spacing-3 py-spacing-2 gap-spacing-1 flex overflow-x-auto border-b">
        {VIEW_OPTIONS.map((option) => {
          const active = inbox.view === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => inbox.setView(option.id)}
              className={`button-compact gap-spacing-1 shrink-0 ${
                active
                  ? 'nav-glass-selected-purple text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
              }`}
            >
              {option.label}
              {inbox.counts[option.id] > 0 ? (
                <span className="typo-caption tabular-nums">{inbox.counts[option.id]}</span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {inbox.loading ? (
          <div className="flex h-full items-center justify-center">
            <VibeyLoadingOrb size="md" text={INBOX_MESSAGES.LOADING} />
          </div>
        ) : inbox.notifications.length === 0 ? (
          <div className="gap-spacing-3 px-spacing-6 py-spacing-16 flex h-full flex-col items-center justify-center text-center">
            <Check className="icon-lg text-success" aria-hidden />
            <p className="body-3 text-muted-foreground">{INBOX_MESSAGES.EMPTY[inbox.view]}</p>
          </div>
        ) : (
          <ul>
            {inbox.notifications.map((notification) => (
              <InboxRow
                key={notification.id}
                notification={notification}
                expanded={expandedId === notification.id}
                onToggle={() =>
                  setExpandedId((current) => (current === notification.id ? null : notification.id))
                }
                onClear={() => void inbox.clear(notification)}
                onRestore={() => void inbox.restore(notification)}
                onSnooze={() => void inbox.snooze(notification)}
                onUnsnooze={() => void inbox.unsnooze(notification)}
                onMove={(bucket) => void inbox.move(notification, bucket)}
                onToggleRead={() => void inbox.toggleRead(notification)}
                onOpen={() => {
                  if (notification.action_url) router.push(notification.action_url)
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
