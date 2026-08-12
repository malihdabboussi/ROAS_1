'use client'

import { ChevronDown } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import { SpaceMappingPopover } from './SpaceMappingPopover'

/**
 * Select-style mapping cell for work-item list rows: displays where an item
 * currently lives (space title, tooltip shows the full program · campaign ·
 * space path) and relocates it when a new destination is picked.
 */
export function SpaceMappingCell({
  sourceSpaceId,
  itemId,
  itemTitle,
  label,
  pathLabel,
  onMoved,
  errorMessage,
  className,
}: {
  sourceSpaceId: string
  itemId: string
  itemTitle: string
  /** Compact display, usually the current space title. */
  label: string
  /** Full "Program · Campaign · Space" path, shown in the tooltip. */
  pathLabel?: string
  onMoved: (destination: { id: string; title: string }) => void
  errorMessage?: string
  className?: string
}) {
  return (
    <SpaceMappingPopover
      sourceSpaceId={sourceSpaceId}
      itemId={itemId}
      onMoved={onMoved}
      errorMessage={errorMessage}
      trigger={({ ref, open, toggle }) => (
        <Tooltip label={pathLabel ?? label} side="top">
          <button
            ref={ref}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toggle()
            }}
            className={cn(
              'typo-caption text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
              'border-border rounded-spacing-2 flex min-w-0 max-w-40 items-center gap-1 border',
              'px-1.5 py-0.5 transition-colors',
              className,
            )}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Change mapping for ${itemTitle} — currently in ${label}`}
          >
            <span className="min-w-0 truncate">{label}</span>
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
          </button>
        </Tooltip>
      )}
    />
  )
}
