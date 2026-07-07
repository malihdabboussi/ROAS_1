'use client'

import type { RefObject } from 'react'
import { GitBranch } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

export type SubtasksToolbarTriggerProps = {
  open: boolean
  setOpen: (v: boolean) => void
  anchorRef: RefObject<HTMLButtonElement | null>
}

export function SubtasksToolbarTrigger({ open, setOpen, anchorRef }: SubtasksToolbarTriggerProps) {
  return (
    <div className="relative shrink-0">
      <Tooltip label="Show subtasks" side="bottom">
        <span className="inline-flex items-center">
          <button
            ref={anchorRef}
            type="button"
            onClick={() => setOpen(!open)}
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
              open
                ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
          </button>
        </span>
      </Tooltip>
    </div>
  )
}
