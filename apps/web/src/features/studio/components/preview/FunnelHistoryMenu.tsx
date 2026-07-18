'use client'

import { useEffect, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Clock3 } from 'lucide-react'
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
}

function formatRevisionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
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
}: FunnelHistoryMenuProps) {
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
          {entries.map((entry) => {
            const isCurrent = entry.id === currentChangeSetId
            const isRestoring = entry.id === restoringChangeSetId
            const label = entry.label?.trim() || 'Saved edit'
            return (
              <div
                key={entry.id}
                className="border-border px-spacing-4 py-spacing-3 gap-spacing-3 flex items-center border-b last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="body-3 text-foreground truncate font-medium">{label}</p>
                  <div className="gap-spacing-1 body-4 text-muted-foreground mt-spacing-1 flex items-center">
                    <Clock3 className="icon-xs shrink-0" />
                    <span className="truncate">
                      {entry.source === 'agent' ? 'Vibey' : 'Studio'} ·{' '}
                      <time dateTime={entry.created_at}>
                        {formatRevisionTime(entry.created_at)}
                      </time>
                    </span>
                  </div>
                </div>
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
        </div>
      )}
    </div>,
    document.body,
  )
}
