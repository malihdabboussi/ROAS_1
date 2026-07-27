'use client'

import { FloatingPanel } from './FloatingPanel'

export function RemoveFromSpacePanel({
  anchorRef,
  count,
  onConfirm,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  count: number
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose} width={280}>
      <div className="p-3">
        <p className="text-xs text-[var(--foreground)]">
          Remove {count} doc{count > 1 ? 's' : ''} from this space? They will be kept in your
          General workspace.
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
            className="flex-1 rounded bg-[var(--color-hover-subtle)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--color-border)]"
          >
            Remove
          </button>
        </div>
      </div>
    </FloatingPanel>
  )
}
