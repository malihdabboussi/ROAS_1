'use client'

import type { ReactNode } from 'react'
import { Loader2, Redo2, Undo2 } from 'lucide-react'

type Direction = 'undo' | 'redo'

interface FunnelHistoryControlsProps {
  canUndo: boolean
  canRedo: boolean
  isLoading: boolean
  pendingAction?: Direction | null
  onUndo: () => void
  onRedo: () => void
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
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  )
}

export function FunnelHistoryControls({
  canUndo,
  canRedo,
  isLoading,
  pendingAction = null,
  onUndo,
  onRedo,
}: FunnelHistoryControlsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1" data-funnel-history-controls>
      <HistoryIconButton
        label="Undo"
        disabled={isLoading || !canUndo}
        loading={pendingAction === 'undo'}
        onClick={onUndo}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </HistoryIconButton>
      <HistoryIconButton
        label="Redo"
        disabled={isLoading || !canRedo}
        loading={pendingAction === 'redo'}
        onClick={onRedo}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </HistoryIconButton>
    </div>
  )
}
