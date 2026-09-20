'use client'

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  recurringTrainingKindLabel,
  type RecurringTrainingKind,
} from '../../../services/recurring-rules.service'

export type RecurringTabKind = Exclude<RecurringTrainingKind, 'all'>

export const RECURRING_SECTION_KINDS: RecurringTabKind[] = [
  'company_dream',
  'slack',
  'fathom_auto',
  'fireflies_sync',
  'read_ai_auto',
  'zoom_auto',
]

export function RecurringKindSection({
  kind,
  open,
  onToggle,
  children,
}: {
  kind: RecurringTabKind
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="border-border rounded-spacing-3 surface-card overflow-hidden border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="gap-spacing-2 px-spacing-3 py-spacing-3 hover:bg-hover-subtle flex w-full items-center text-left transition-colors"
      >
        <ChevronRight
          className={cn(
            'icon-sm text-muted-foreground shrink-0 transition-transform duration-150',
            open && 'rotate-90',
          )}
        />
        <span className="body-2 text-foreground min-w-0 flex-1 truncate font-semibold">
          {recurringTrainingKindLabel(kind)}
        </span>
      </button>
      {open ? <div className="border-border border-t">{children}</div> : null}
    </div>
  )
}
