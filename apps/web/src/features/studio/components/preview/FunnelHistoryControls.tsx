'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { History, Loader2, Redo2, Undo2 } from 'lucide-react'
import { FUNNEL_HISTORY_MESSAGES } from '@/features/studio/config/funnel-history.messages.config'
import type { FunnelHistoryEntry } from '@/features/studio/services/funnel-history.service'
import { FunnelHistoryMenu } from './FunnelHistoryMenu'

type Direction = 'undo' | 'redo'

interface FunnelHistoryControlsProps {
  canUndo: boolean
  canRedo: boolean
  isLoading: boolean
  pendingAction?: Direction | null
  entries: FunnelHistoryEntry[]
  historyLoading: boolean
  currentChangeSetId: string | null
  restoringChangeSetId: string | null
  onUndo: () => void
  onRedo: () => void
  onHistoryOpen: () => void
  onRestore: (changeSetId: string) => void
  onBookmark: (changeSetId: string, bookmarked: boolean) => void
}

function HistoryIconButton({
  label,
  disabled,
  loading,
  children,
  onClick,
}: {
  label: string
  disabled: boolean
  loading: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      data-side="bottom"
      disabled={disabled}
      onClick={onClick}
      className="tooltip text-muted-foreground hover:text-foreground h-spacing-7 w-spacing-7 rounded-spacing-2 hover:bg-hover-subtle flex shrink-0 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40"
    >
      {loading ? <Loader2 className="icon-sm animate-spin" /> : children}
    </button>
  )
}

export function FunnelHistoryControls({
  canUndo,
  canRedo,
  isLoading,
  pendingAction = null,
  entries,
  historyLoading,
  currentChangeSetId,
  restoringChangeSetId,
  onUndo,
  onRedo,
  onHistoryOpen,
  onRestore,
  onBookmark,
}: FunnelHistoryControlsProps) {
  const historyTriggerRef = useRef<HTMLButtonElement>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyPosition, setHistoryPosition] = useState<{ top: number; left: number } | null>(null)

  const closeHistory = useCallback(() => setHistoryOpen(false), [])
  const toggleHistory = useCallback(() => {
    if (historyOpen) {
      closeHistory()
      return
    }
    const rect = historyTriggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHistoryPosition({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - 320, window.innerWidth - 328)),
    })
    setHistoryOpen(true)
    onHistoryOpen()
  }, [closeHistory, historyOpen, onHistoryOpen])

  return (
    <>
      <div className="flex shrink-0 items-center gap-1" data-funnel-history-controls>
        <HistoryIconButton
          label={FUNNEL_HISTORY_MESSAGES.TOOLTIP_UNDO}
          disabled={isLoading || !canUndo}
          loading={pendingAction === 'undo'}
          onClick={onUndo}
        >
          <Undo2 className="icon-sm" />
        </HistoryIconButton>
        <HistoryIconButton
          label={FUNNEL_HISTORY_MESSAGES.TOOLTIP_REDO}
          disabled={isLoading || !canRedo}
          loading={pendingAction === 'redo'}
          onClick={onRedo}
        >
          <Redo2 className="icon-sm" />
        </HistoryIconButton>
        <button
          ref={historyTriggerRef}
          type="button"
          aria-label={FUNNEL_HISTORY_MESSAGES.TITLE}
          aria-expanded={historyOpen}
          data-tooltip={FUNNEL_HISTORY_MESSAGES.TOOLTIP_HISTORY}
          data-side="bottom"
          onClick={toggleHistory}
          className="tooltip text-muted-foreground hover:text-foreground h-spacing-7 w-spacing-7 rounded-spacing-2 hover:bg-hover-subtle flex shrink-0 items-center justify-center transition-colors"
        >
          <History className="icon-sm" />
        </button>
      </div>
      <FunnelHistoryMenu
        open={historyOpen}
        position={historyPosition}
        triggerRef={historyTriggerRef}
        entries={entries}
        loading={historyLoading}
        currentChangeSetId={currentChangeSetId}
        restoringChangeSetId={restoringChangeSetId}
        onClose={closeHistory}
        onRestore={onRestore}
        onBookmark={onBookmark}
      />
    </>
  )
}
