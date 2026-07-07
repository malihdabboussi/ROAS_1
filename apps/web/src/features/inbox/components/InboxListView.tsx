'use client'

import { useMemo, useState } from 'react'
import { Calendar, Inbox } from 'lucide-react'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import { groupInboxByDate, itemActivityDate } from '../lib/group-inbox-by-date'
import { applyInboxQuery, type InboxSort } from '../lib/inbox-query'
import { formatInboxStatusLabel } from '../lib/inbox-status-label'
import { InboxHubToolbar, type InboxKindFilter } from './InboxHubToolbar'

function formatShortDate(d: Date, now: Date = new Date()): string {
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(dueAt: string | null, now: Date = new Date()): boolean {
  if (!dueAt) return false
  return new Date(dueAt).getTime() < now.getTime()
}

export interface InboxListViewProps {
  items: YourTurnItem[]
  onOpen: (item: YourTurnItem) => void
  onAccept?: (item: YourTurnItem) => void
  onDismiss?: (item: YourTurnItem) => void
}

export function InboxListView({ items, onOpen, onAccept, onDismiss }: InboxListViewProps) {
  const [searchValue, setSearchValue] = useState('')
  const [kindFilter, setKindFilter] = useState<InboxKindFilter>('all')
  const [currentSort, setCurrentSort] = useState<InboxSort>('activity.desc')

  const processed = useMemo(
    () => applyInboxQuery(items, { kind: kindFilter, search: searchValue, sort: currentSort }),
    [items, kindFilter, searchValue, currentSort],
  )

  const groups = useMemo(() => groupInboxByDate(processed, new Date()), [processed])

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-4 pt-4 md:px-6">
      <div className="mb-spacing-3 shrink-0">
        <InboxHubToolbar
          kindFilter={kindFilter}
          onKindFilterChange={setKindFilter}
          currentSort={currentSort}
          onSortChange={setCurrentSort}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {groups.length === 0 ? (
          items.length === 0 ? (
            <InboxEmpty />
          ) : (
            <div className="body-2 text-muted-foreground px-spacing-6 py-spacing-16 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
              <p>No items match your search or filters.</p>
              <button
                type="button"
                className="text-primary body-3 mt-spacing-2 font-medium hover:underline"
                onClick={() => {
                  setKindFilter('all')
                  setSearchValue('')
                }}
              >
                Clear search and filters
              </button>
            </div>
          )
        ) : (
          <div className="pb-spacing-6 pt-spacing-1">
            {groups.map((g) => (
              <div key={g.id} className="mb-spacing-6 last:mb-0">
                <h2 className="typo-caption text-muted-foreground mb-spacing-2 px-0.5 font-medium tracking-wide">
                  {g.label}
                </h2>
                <ul className="border-border bg-card/40 divide-border rounded-spacing-2 divide-y overflow-hidden border">
                  {g.items.map((item) => (
                    <InboxRow
                      key={`${item.kind}:${item.id}`}
                      item={item}
                      onOpen={onOpen}
                      onAccept={onAccept}
                      onDismiss={onDismiss}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InboxEmpty() {
  return (
    <div className="px-spacing-6 py-spacing-16 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <div className="text-primary/90 mb-spacing-4 rounded-spacing-2 bg-primary/10 flex h-16 w-16 items-center justify-center">
        <Inbox className="h-8 w-8" strokeWidth={1.25} />
      </div>
      <h2 className="title-h6 text-foreground">Inbox zero</h2>
      <p className="body-2 text-muted-foreground mt-spacing-2 max-w-sm">
        Nothing is waiting on you. When a teammate or mission needs your input, it will show up
        here.
      </p>
    </div>
  )
}

function InboxRow({
  item,
  onOpen,
  onAccept,
  onDismiss,
}: {
  item: YourTurnItem
  onOpen: (item: YourTurnItem) => void
  onAccept?: (item: YourTurnItem) => void
  onDismiss?: (item: YourTurnItem) => void
}) {
  const act = itemActivityDate(item)
  const now = new Date()
  const overdue = isOverdue(item.due_at, now)
  const isSuggestion = item.kind === 'suggestion'

  const statusLabel = formatInboxStatusLabel(item.status)
  const dueForDisplay = item.due_at ? formatShortDate(new Date(item.due_at), now) : null

  return (
    <li>
      <div className="hover:bg-hover-subtle py-spacing-4 pl-spacing-3 pr-spacing-2 sm:pl-spacing-4 flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            if (!isSuggestion) onOpen(item)
          }}
          className={
            isSuggestion
              ? 'body-2 flex min-w-0 flex-1 cursor-default items-center gap-1.5 text-left sm:gap-2'
              : 'body-2 text-foreground/90 hover:text-foreground focus-visible:ring-ring flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 sm:gap-2'
          }
        >
          <span
            className="border-border h-2.5 w-2.5 shrink-0 self-center rounded-full border-2"
            aria-hidden
          />
          <span className="text-foreground min-w-0 max-w-[38%] flex-[1.1] basis-0 truncate font-medium sm:max-w-none sm:flex-[1.2] sm:basis-0">
            {item.title}
          </span>
          <span className="body-3 flex min-w-0 max-w-[34%] flex-1 basis-0 items-center justify-end gap-1.5 pl-0.5 sm:max-w-none sm:justify-start sm:pl-1 md:pl-2">
            {item.due_at && dueForDisplay ? (
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
                <Calendar className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="body-3 min-w-0 truncate">
                  <span className="text-muted-foreground">Due {dueForDisplay}</span>
                  {overdue ? <span className="text-destructive"> · Overdue</span> : null}
                </span>
              </span>
            ) : (
              <span className="badge-glass badge-glass-muted body-3 text-foreground/90 min-w-0 max-w-full shrink truncate font-medium">
                {statusLabel}
              </span>
            )}
          </span>
        </button>
        <div className="text-muted-foreground flex shrink-0 items-center gap-1 sm:gap-1.5">
          <span className="typo-caption text-right tabular-nums sm:min-w-[2.75rem] sm:text-left">
            {formatShortDate(act, now)}
          </span>
          {isSuggestion && onAccept && onDismiss && (
            <div className="ml-0.5 flex items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => onDismiss(item)}
                className="typo-caption rounded-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-1 py-0.5 font-medium"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => onAccept(item)}
                className="typo-caption text-primary rounded-spacing-1 hover:bg-primary/10 px-1 py-0.5 font-medium"
              >
                Accept
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
