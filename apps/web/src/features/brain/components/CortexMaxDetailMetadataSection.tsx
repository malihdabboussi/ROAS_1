'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function CortexMaxDetailMetadataSection({
  version,
  updatedAt,
  sourceCount,
}: {
  version: number
  updatedAt: string
  sourceCount: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-border bg-surface-subtle">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-spacing-3 py-spacing-2 group flex w-full items-center justify-between text-left transition-colors hover:bg-hover-subtle"
        aria-expanded={open}
      >
        <span className="typo-caption text-muted-foreground uppercase tracking-wider">
          Metadata
        </span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-3.5 w-3.5 transition-transform',
            open ? 'rotate-180' : 'rotate-0',
          )}
        />
      </button>
      {open ? (
        <div className="body-4 text-muted-foreground space-y-spacing-2 px-spacing-3 py-spacing-3 border-t border-border">
          <p>
            <span className="typo-caption text-muted-foreground uppercase tracking-wider">
              Version
            </span>
            <span className="text-foreground ml-2">v{version}</span>
          </p>
          <p>
            <span className="typo-caption text-muted-foreground uppercase tracking-wider">
              Updated
            </span>
            <span className="text-foreground ml-2">{new Date(updatedAt).toLocaleDateString()}</span>
          </p>
          <p>
            <span className="typo-caption text-muted-foreground uppercase tracking-wider">
              Sources
            </span>
            <span className="text-foreground ml-2">
              {sourceCount} source{sourceCount === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
