'use client'

import { cn } from '@/lib/utils/cn'

export function DocSubpagesAddRow({
  docLocked,
  onAdd,
  className,
}: {
  docLocked: boolean
  onAdd: () => void
  className?: string
}) {
  return (
    <div
      className={cn('relative flex min-h-7 items-center justify-end overflow-visible', className)}
    >
      <button
        type="button"
        disabled={docLocked}
        onClick={() => void onAdd()}
        className={cn(
          'pointer-events-none shrink-0 rounded px-1 py-0.5 text-[11px] text-[var(--color-muted-foreground)] transition-[opacity,transform,color] duration-200 ease-out',
          'translate-x-3 opacity-0',
          'group-hover/doc-subpages:pointer-events-auto group-hover/doc-subpages:translate-x-0 group-hover/doc-subpages:opacity-100',
          'group-focus-within/doc-subpages:pointer-events-auto group-focus-within/doc-subpages:translate-x-0 group-focus-within/doc-subpages:opacity-100',
          'hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        + Add Subpage
      </button>
    </div>
  )
}
