'use client'

import { cn } from '@/lib/utils/cn'
import type { SpaceItem } from '../../types'
import { FloatingPanel } from './FloatingPanel'

export function ConvertPanel({
  anchorRef,
  selectedItems,
  onConvertToSubtasks,
  onPromoteToTasks,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  selectedItems: SpaceItem[]
  onConvertToSubtasks: () => void
  onPromoteToTasks: () => void
  onClose: () => void
}) {
  const allTopLevel = selectedItems.every((i) => !i.parent_item_id)
  const allSubtasks = selectedItems.every((i) => !!i.parent_item_id)

  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose} width={220}>
      <div className="py-1">
        <button
          type="button"
          disabled={!allTopLevel || selectedItems.length < 2}
          onClick={() => {
            onConvertToSubtasks()
            onClose()
          }}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
            allTopLevel && selectedItems.length >= 2
              ? 'text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]'
              : 'text-[var(--color-muted-foreground)]/50 cursor-not-allowed',
          )}
        >
          Convert to Subtasks
        </button>
        <button
          type="button"
          disabled={!allSubtasks}
          onClick={() => {
            onPromoteToTasks()
            onClose()
          }}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
            allSubtasks
              ? 'text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]'
              : 'text-[var(--color-muted-foreground)]/50 cursor-not-allowed',
          )}
        >
          Promote to Tasks
        </button>
      </div>
    </FloatingPanel>
  )
}
