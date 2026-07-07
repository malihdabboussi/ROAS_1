'use client'

import { Trash2 } from 'lucide-react'

interface MediaTabBulkActionBarProps {
  selectedCount: number
  onDelete: () => void
}

export function MediaTabBulkActionBar({ selectedCount, onDelete }: MediaTabBulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="border-border px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-between border-t">
      <span className="body-3 text-muted-foreground">{selectedCount} selected</span>
      <button
        type="button"
        onClick={onDelete}
        className="button-glass-destructive rounded-spacing-2 gap-spacing-1 px-spacing-3 py-spacing-1 flex items-center font-medium"
      >
        <Trash2 className="icon-xs" />
        <span className="body-4">Delete</span>
      </button>
    </div>
  )
}
