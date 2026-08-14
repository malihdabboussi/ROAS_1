'use client'

import {
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Columns3,
  Copy,
  Lock,
  Rows3,
  Trash2,
  Unlock,
} from 'lucide-react'

interface WhiteboardSelectionToolbarProps {
  selectedIds: string[]
  allLocked: boolean
  onDuplicate: (ids: string[]) => void
  onDelete: (ids: string[]) => void
  onSetLocked: (ids: string[], locked: boolean) => void
  onAlign: (ids: string[], axis: 'horizontal' | 'vertical') => void
  onDistribute: (ids: string[], axis: 'horizontal' | 'vertical') => void
}

export function WhiteboardSelectionToolbar({
  selectedIds,
  allLocked,
  onDuplicate,
  onDelete,
  onSetLocked,
  onAlign,
  onDistribute,
}: WhiteboardSelectionToolbarProps) {
  if (selectedIds.length === 0) return null
  const LockIcon = allLocked ? Unlock : Lock

  return (
    <div className="surface-card border-border top-spacing-3 gap-spacing-1 rounded-spacing-3 p-spacing-1 absolute left-1/2 z-20 flex -translate-x-1/2 items-center border shadow-lg">
      <span className="body-4 text-muted-foreground px-spacing-2">
        {selectedIds.length} selected
      </span>
      <button
        type="button"
        className="button-glass-neutral flex h-9 w-9 items-center justify-center"
        onClick={() => onDuplicate(selectedIds)}
        title="Duplicate"
        aria-label="Duplicate selection"
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="button-glass-neutral flex h-9 w-9 items-center justify-center"
        onClick={() => onAlign(selectedIds, 'horizontal')}
        title="Align horizontally"
        aria-label="Align selection horizontally"
      >
        <Rows3 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="button-glass-neutral flex h-9 w-9 items-center justify-center"
        onClick={() => onAlign(selectedIds, 'vertical')}
        title="Align vertically"
        aria-label="Align selection vertically"
      >
        <Columns3 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="button-glass-neutral flex h-9 w-9 items-center justify-center"
        onClick={() => onDistribute(selectedIds, 'horizontal')}
        disabled={selectedIds.length < 3}
        title="Distribute horizontally"
        aria-label="Distribute selection horizontally"
      >
        <AlignHorizontalSpaceAround className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="button-glass-neutral flex h-9 w-9 items-center justify-center"
        onClick={() => onDistribute(selectedIds, 'vertical')}
        disabled={selectedIds.length < 3}
        title="Distribute vertically"
        aria-label="Distribute selection vertically"
      >
        <AlignVerticalSpaceAround className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="button-glass-neutral flex h-9 w-9 items-center justify-center"
        onClick={() => onSetLocked(selectedIds, !allLocked)}
        title={allLocked ? 'Unlock' : 'Lock'}
        aria-label={allLocked ? 'Unlock selection' : 'Lock selection'}
      >
        <LockIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="button-glass-neutral text-destructive flex h-9 w-9 items-center justify-center"
        onClick={() => onDelete(selectedIds)}
        title="Delete"
        aria-label="Delete selection"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
