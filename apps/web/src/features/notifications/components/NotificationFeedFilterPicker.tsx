'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Filter } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  DEFAULT_NOTIFICATION_FEED_FILTERS,
  notificationFeedFilterSummary,
  type NotificationFeedFilters,
  type NotificationFeedStatusFilter,
  type NotificationFeedTypeFilter,
} from '../lib/notification-feed-filters'

export const NOTIFICATION_FEED_HEADER_ICON_BUTTON =
  'button-glass-secondary flex h-6 w-6 shrink-0 items-center justify-center rounded-spacing-1'

const STATUS_OPTIONS: { value: NotificationFeedStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
]

function filtersActive(filters: NotificationFeedFilters): boolean {
  return (
    filters.status !== DEFAULT_NOTIFICATION_FEED_FILTERS.status ||
    filters.type !== DEFAULT_NOTIFICATION_FEED_FILTERS.type
  )
}

function FilterMenuOption({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className={`body-3 hover:bg-hover-subtle flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
        selected ? 'text-foreground font-semibold' : 'text-foreground'
      }`}
    >
      <span>{label}</span>
      {selected ? <Check className="icon-sm shrink-0" /> : null}
    </button>
  )
}

export function NotificationFeedFilterPicker({
  filters,
  typeOptions,
  onChange,
}: {
  filters: NotificationFeedFilters
  typeOptions: { id: NotificationFeedTypeFilter; label: string }[]
  onChange: (patch: Partial<NotificationFeedFilters>) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const summary = notificationFeedFilterSummary(filters)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (rootRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      <Tooltip
        label={`Filter · ${summary}`}
        side="bottom"
        triggerClassName="inline-flex items-center"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`${NOTIFICATION_FEED_HEADER_ICON_BUTTON} ${filtersActive(filters) ? 'btn-icon-glass--active' : ''}`}
          aria-label={`Filter notifications · ${summary}`}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <Filter className="icon-sm" />
        </button>
      </Tooltip>
      {open ? (
        <div
          role="menu"
          className="dropdown-menu-solid absolute right-0 top-full z-20 mt-1 max-h-[min(60vh,320px)] min-w-[180px] overflow-y-auto py-1"
        >
          <p className="typo-caption text-muted-foreground px-3 pb-1 pt-2 font-medium uppercase tracking-wide">
            Status
          </p>
          {STATUS_OPTIONS.map((option) => (
            <FilterMenuOption
              key={option.value}
              label={option.label}
              selected={filters.status === option.value}
              onSelect={() => onChange({ status: option.value })}
            />
          ))}
          <div className="border-border my-1 border-t" />
          <p className="typo-caption text-muted-foreground px-3 pb-1 pt-1 font-medium uppercase tracking-wide">
            Type
          </p>
          <FilterMenuOption
            label="All types"
            selected={filters.type === 'all'}
            onSelect={() => onChange({ type: 'all' })}
          />
          {typeOptions.map((option) => (
            <FilterMenuOption
              key={option.id}
              label={option.label}
              selected={filters.type === option.id}
              onSelect={() => onChange({ type: option.id })}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
