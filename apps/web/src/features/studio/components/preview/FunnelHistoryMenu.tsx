'use client'

import { useEffect, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Clock3, Star } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { FUNNEL_HISTORY_MESSAGES } from '@/features/studio/config/funnel-history.messages.config'
import type { FunnelHistoryEntry } from '@/features/studio/services/funnel-history.service'

interface FunnelHistoryMenuProps {
  open: boolean
  position: { top: number; left: number } | null
  triggerRef: RefObject<HTMLButtonElement | null>
  entries: FunnelHistoryEntry[]
  loading: boolean
  currentChangeSetId: string | null
  restoringChangeSetId: string | null
  onClose: () => void
  onRestore: (changeSetId: string) => void
  onBookmark: (changeSetId: string, bookmarked: boolean) => void
}

function formatRevisionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

interface FunnelHistoryGroup {
  label: string
  entries: FunnelHistoryEntry[]
}

function historyDateLabel(value: string, now = new Date()): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Earlier'
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDifference = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (24 * 60 * 60 * 1000),
  )
  if (dayDifference === 0) return 'Today'
  if (dayDifference === 1) return 'Yesterday'
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date)
}

export function groupFunnelHistoryEntries(
  entries: FunnelHistoryEntry[],
  now = new Date(),
): FunnelHistoryGroup[] {
  const groups = new Map<string, FunnelHistoryEntry[]>()
  for (const entry of entries) {
    const label = historyDateLabel(entry.created_at, now)
    groups.set(label, [...(groups.get(label) ?? []), entry])
  }
  return Array.from(groups, ([label, groupedEntries]) => ({ label, entries: groupedEntries }))
}

export function FunnelHistoryMenu({
  open,
  position,
  triggerRef,
  entries,
  loading,
  currentChangeSetId,
  restoringChangeSetId,
  onClose,
  onRestore,
  onBookmark,
}: FunnelHistoryMenuProps) {
  const groups = groupFunnelHistoryEntries(entries)
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (triggerRef.current?.contains(target) || target.closest('[data-funnel-history-menu]'))
        return
      onClose()
    }
    const handleViewportChange = () => onClose()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [onClose, open, triggerRef])

  if (!open || !position || typeof document === 'undefined') return null

  return createPortal(
    <div
      data-funnel-history-menu
      role="dialog"
      aria-label={FUNNEL_HISTORY_MESSAGES.TITLE}
      className="dropdown-menu-solid z-dropdown surface-card border-border rounded-spacing-3 w-spacing-80 fixed flex flex-col overflow-hidden border shadow-lg"
      style={position}
    >
      <div className="border-border px-spacing-4 py-spacing-3 border-b">
        <p className="body-2 text-foreground font-medium">{FUNNEL_HISTORY_MESSAGES.TITLE}</p>
        <p className="body-4 text-muted-foreground mt-spacing-1">
          {FUNNEL_HISTORY_MESSAGES.DESCRIPTION}
        </p>
      </div>

      {loading ? (
        <div className="p-spacing-6 flex items-center justify-center">
          <VibeyLoadingOrb size="sm" text={FUNNEL_HISTORY_MESSAGES.LOADING} />
        </div>
      ) : entries.length === 0 ? (
        <p className="body-3 text-muted-foreground p-spacing-4 text-center">
          {FUNNEL_HISTORY_MESSAGES.EMPTY}
        </p>
      ) : (
        <div className="dropdown-list-scroll">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <div className="bg-secondary/60 border-border px-spacing-4 py-spacing-2 sticky top-0 border-b">
                <p className="typo-caption text-muted-foreground font-medium">{group.label}</p>
              </div>
              {group.entries.map((entry) => {
                const isCurrent = entry.id === currentChangeSetId
                const isRestoring = entry.id === restoringChangeSetId
                const label = entry.label?.trim() || 'Saved edit'
                return (
                  <div
                    key={entry.id}
                    className="border-border px-spacing-4 py-spacing-3 gap-spacing-3 flex items-center border-b"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="body-3 text-foreground truncate font-medium">{label}</p>
                      <div className="gap-spacing-1 body-4 text-muted-foreground mt-spacing-1 flex items-center">
                        <Clock3 className="icon-xs shrink-0" />
                        <span className="truncate">
                          {entry.source === 'agent' ? 'Pixel' : 'You'} ·{' '}
                          <time dateTime={entry.created_at}>
                            {formatRevisionTime(entry.created_at)}
                          </time>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={entry.is_bookmarked ? `Unbookmark ${label}` : `Bookmark ${label}`}
                      aria-pressed={entry.is_bookmarked === true}
                      onClick={() => onBookmark(entry.id, !entry.is_bookmarked)}
                      className="text-muted-foreground hover:text-foreground h-spacing-7 w-spacing-7 rounded-spacing-2 hover:bg-hover-subtle flex shrink-0 items-center justify-center transition-colors"
                    >
                      <Star
                        className={entry.is_bookmarked ? 'icon-sm fill-current' : 'icon-sm'}
                        aria-hidden
                      />
                    </button>
                    {isCurrent ? (
                      <span className="badge-glass badge-glass-green typo-caption shrink-0 font-medium">
                        {FUNNEL_HISTORY_MESSAGES.CURRENT}
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Restore ${label}`}
                        disabled={restoringChangeSetId !== null}
                        onClick={() => onRestore(entry.id)}
                        className="button-compact button-glass-neutral shrink-0 disabled:opacity-50"
                      >
                        {isRestoring
                          ? FUNNEL_HISTORY_MESSAGES.RESTORING
                          : FUNNEL_HISTORY_MESSAGES.RESTORE}
                      </button>
                    )}
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
