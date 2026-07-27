'use client'

import { FloatingPanel } from './FloatingPanel'

export function DeletePanel({
  anchorRef,
  count,
  itemLabel,
  onConfirm,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  count: number
  itemLabel: 'task' | 'doc'
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose} width={220}>
      <div className="p-3">
        <p className="text-xs text-[var(--foreground)]">
          Delete {count} {itemLabel}
          {count > 1 ? 's' : ''}? This cannot be undone.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-destructive/20 text-destructive hover:bg-destructive/30 flex-1 rounded px-2 py-1 text-xs font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </FloatingPanel>
  )
}
