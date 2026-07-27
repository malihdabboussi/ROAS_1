'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Archive, Check, CheckCheck, Inbox, Search } from 'lucide-react'
import { InboxDetailPane } from '@/components/notifications/InboxDetailPane'
import { InboxListRow } from '@/components/notifications/InboxListRow'
import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
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

function navigateToSource(router: ReturnType<typeof useRouter>, url: string) {
  if (/^https?:\/\//i.test(url)) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  router.push(url)
}

export function InboxFeed({
  initialView = 'primary',
  presentation = 'card',
  onOpenDetails,
}: {
  initialView?: InboxView
  presentation?: 'card' | 'page'
  onOpenDetails?: (notification: UserNotification) => void | Promise<void>
}) {
  const router = useRouter()
  const inbox = useInboxTriage(initialView)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const typeOptions = useMemo(() => {
    const types = new Set(inbox.notifications.map((notification) => notification.type))
    if (inbox.type !== 'all') types.add(inbox.type as UserNotification['type'])
    return Array.from(types).sort((a, b) =>
      notificationTypeLabel(a).localeCompare(notificationTypeLabel(b)),
    )
  }, [inbox.notifications, inbox.type])

  const visibleNotifications = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return inbox.notifications
    return inbox.notifications.filter((notification) => {
      const haystack = [
        notification.title,
        notification.body ?? '',
        notificationTypeLabel(notification.type),
      ]
        .join(' ')
        .toLocaleLowerCase()
      return haystack.includes(query)
    })
  }, [inbox.notifications, search])

  const selectedNotification =
    inbox.notifications.find((notification) => notification.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId) return
    if (!inbox.notifications.some((notification) => notification.id === selectedId)) {
      setSelectedId(null)
    }
  }, [inbox.notifications, selectedId])

  const selectNotification = (notification: UserNotification) => {
    setSelectedId(notification.id)
    if (!notification.read_at) void inbox.toggleRead(notification)
  }

  const updateView = (view: Exclude<InboxView, 'all'>) => {
    setSelectedId(null)
    setSearch('')
    inbox.setView(view)
  }

  return (
    <section
      className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${
        presentation === 'card' ? 'section-card card-elevated' : 'bg-background'
      }`}
    >
      <header className="border-border px-spacing-5 py-spacing-4 gap-spacing-3 flex flex-wrap items-center border-b">
        <div className="gap-spacing-2 flex min-w-0 items-center">
          <Inbox className="icon-md text-muted-foreground shrink-0" aria-hidden />
          <div className="min-w-0">
            <h2 className="body-1 text-foreground font-semibold">{INBOX_MESSAGES.TITLE}</h2>
            <p className="typo-caption text-muted-foreground truncate">{INBOX_MESSAGES.SUBTITLE}</p>
          </div>
        </div>

        <div className="gap-spacing-2 ml-auto flex items-center">
          {inbox.counts.primary + inbox.counts.other + inbox.counts.later > 0 ? (
            <Tooltip label={INBOX_MESSAGES.ACTIONS.readAll} side="bottom">
              <button
                type="button"
                className="btn-icon-glass text-muted-foreground hover:text-foreground"
                aria-label={INBOX_MESSAGES.ACTIONS.readAll}
                onClick={() => void inbox.markAllRead()}
              >
                <CheckCheck className="icon-sm" />
              </button>
            </Tooltip>
          ) : null}
          {inbox.view !== 'cleared' && inbox.view !== 'all' && inbox.notifications.length > 0 ? (
            <Tooltip label={INBOX_MESSAGES.ACTIONS.clearView} side="bottom">
              <button
                type="button"
                className="btn-icon-glass text-muted-foreground hover:text-foreground"
                aria-label={INBOX_MESSAGES.ACTIONS.clearView}
                onClick={() => {
                  setSelectedId(null)
                  void inbox.clearCurrentView()
                }}
              >
                <Archive className="icon-sm" />
              </button>
            </Tooltip>
          ) : null}
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
            onChange={(type) => {
              setSelectedId(null)
              inbox.setType(type)
            }}
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
              onClick={() => updateView(option.id)}
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

      <div className="border-border px-spacing-4 py-spacing-2 border-b">
        <div className="relative">
          <Search
            className="icon-left-center icon-sm text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={INBOX_MESSAGES.FILTER.search}
            aria-label={INBOX_MESSAGES.FILTER.search}
            className="input-glass input-leading h-spacing-7 body-4 rounded-spacing-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary w-full border outline-none"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`min-h-0 flex-col overflow-y-auto ${
            selectedNotification
              ? 'border-border hidden w-full border-r md:flex md:w-1/2 lg:w-2/5'
              : 'md:border-border flex w-full md:w-1/2 md:border-r lg:w-2/5'
          }`}
        >
          {inbox.loading ? (
            <div className="flex h-full min-h-0 items-center justify-center">
              <VibeyLoadingOrb size="md" text={INBOX_MESSAGES.LOADING} />
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="gap-spacing-3 px-spacing-6 py-spacing-16 flex h-full min-h-0 flex-col items-center justify-center text-center">
              <Check className="icon-lg text-success" aria-hidden />
              <p className="body-3 text-muted-foreground">
                {search.trim() ? INBOX_MESSAGES.EMPTY.search : INBOX_MESSAGES.EMPTY[inbox.view]}
              </p>
            </div>
          ) : (
            <ul className="min-h-0">
              {visibleNotifications.map((notification) => (
                <InboxListRow
                  key={notification.id}
                  notification={notification}
                  selected={selectedId === notification.id}
                  onSelect={() => selectNotification(notification)}
                  onClear={() => void inbox.clear(notification)}
                  onRestore={() => void inbox.restore(notification)}
                  onSnooze={() => void inbox.snooze(notification)}
                  onUnsnooze={() => void inbox.unsnooze(notification)}
                  onToggleRead={() => void inbox.toggleRead(notification)}
                />
              ))}
            </ul>
          )}
        </div>

        <div
          className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
            selectedNotification ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          }`}
        >
          <InboxDetailPane
            notification={selectedNotification}
            onBack={() => setSelectedId(null)}
            onOpenDetails={() => {
              if (selectedNotification) void onOpenDetails?.(selectedNotification)
            }}
            onViewSource={() => {
              if (selectedNotification?.action_url) {
                navigateToSource(router, selectedNotification.action_url)
              }
            }}
            onClear={() => {
              if (selectedNotification) void inbox.clear(selectedNotification)
            }}
            onRestore={() => {
              if (selectedNotification) void inbox.restore(selectedNotification)
            }}
            onSnooze={() => {
              if (selectedNotification) void inbox.snooze(selectedNotification)
            }}
            onUnsnooze={() => {
              if (selectedNotification) void inbox.unsnooze(selectedNotification)
            }}
            onMove={(bucket) => {
              if (selectedNotification) void inbox.move(selectedNotification, bucket)
            }}
            onToggleRead={() => {
              if (selectedNotification) void inbox.toggleRead(selectedNotification)
            }}
          />
        </div>
      </div>
    </section>
  )
}
