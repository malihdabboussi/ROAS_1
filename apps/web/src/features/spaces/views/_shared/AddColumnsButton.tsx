'use client'

import { Columns3 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { SpaceToolbarContext } from '../types'

/** "Add columns" icon (opens customize panel on the fields tab). */
export function AddColumnsButton({ ctx }: { ctx: SpaceToolbarContext }) {
  return (
    <Tooltip label="Add columns" side="bottom">
      <span className="inline-flex shrink-0 items-center">
        <button
          type="button"
          aria-label="Add columns"
          onClick={() => ctx.openCustomizeFromToolbar('fields')}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <Columns3 className="h-3.5 w-3.5" />
        </button>
      </span>
    </Tooltip>
  )
}
