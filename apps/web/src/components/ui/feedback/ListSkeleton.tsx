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

/**
 * Full-pane placeholder for page/panel fetches: optional title + toolbar chips above
 * pulsing list rows. Replaces centered loading orbs so the page shape is stable while
 * data loads and content does not jump in.
 */
export function PageSkeleton({
  rows = 8,
  label,
  showHeader = true,
  className,
}: {
  rows?: number
  label: string
  /** Title + toolbar chip placeholders above the rows. */
  showHeader?: boolean
  className?: string
}) {
  return (
    <div className={cn('p-spacing-4 w-full', className)} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      {showHeader ? (
        <div className="mb-spacing-4 space-y-spacing-3" aria-hidden>
          <div className="bg-secondary h-spacing-8 rounded-spacing-2 animate-pulse w-48" />
          <div className="gap-spacing-2 flex">
            <div className="bg-secondary h-spacing-7 rounded-spacing-2 animate-pulse w-24" />
            <div className="bg-secondary h-spacing-7 rounded-spacing-2 animate-pulse w-32" />
            <div className="bg-secondary h-spacing-7 rounded-spacing-2 animate-pulse w-20" />
          </div>
        </div>
      ) : null}
      <div aria-hidden>
        <ListSkeleton rows={rows} label="" />
      </div>
    </div>
  )
}
