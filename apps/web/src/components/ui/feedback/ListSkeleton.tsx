'use client'

import { cn } from '@/lib/utils/cn'

/**
 * In-place placeholder for list and page-body fetches. Prefer this over a
 * centered loading orb so chrome stays put and content does not jump.
 */
export function ListSkeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className="space-y-spacing-2" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={cn(
            'bg-secondary h-spacing-7 rounded-spacing-2 animate-pulse',
            index % 3 === 1 && 'w-4/5',
            index % 3 === 2 && 'w-3/5',
          )}
        />
      ))}
    </div>
  )
}
