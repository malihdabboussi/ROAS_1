'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'

interface TaskSubtasksHeaderProps {
  collapsed: boolean
  doneCount: number
  total: number
  onToggleCollapsed: () => void
}

export function TaskSubtasksHeader({
  collapsed,
  doneCount,
  total,
  onToggleCollapsed,
}: TaskSubtasksHeaderProps) {
  return (
    <div className="mb-spacing-2 flex items-center gap-3">
      <button type="button" onClick={onToggleCollapsed} className="flex items-center gap-1.5">
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
        )}
        <span className="body-2 font-semibold text-[var(--color-foreground)]">Subtasks</span>
      </button>
      {total > 0 && (
        <>
          <span className="body-3 text-[var(--color-muted-foreground)]">
            {total - doneCount} open
          </span>
          <div className="bg-[var(--color-muted-foreground)]/10 h-1.5 w-16 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(doneCount / total) * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}
