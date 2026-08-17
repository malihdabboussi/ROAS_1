'use client'

import { cn } from '@/lib/utils/cn'

/**
 * Inline placeholder for summary-panel fetches. Prefer this over a "Loading…"
 * label so an empty section does not flash copy and then swap to the empty art.
 */
export function ShellRightPanelSkeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className="space-y-spacing-2" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={cn(
            'bg-secondary h-spacing-7 rounded-spacing-2 animate-pulse',
            index === 1 && 'w-4/5',
            index === 2 && 'w-3/5',
          )}
        />
      ))}
    </div>
  )
}
