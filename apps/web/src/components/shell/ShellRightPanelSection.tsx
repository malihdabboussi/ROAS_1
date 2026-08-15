'use client'

import { useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * One collapsible band of the work summary.
 *
 * The chevron sits directly beside the label rather than at the far edge, so
 * the disclosure reads as part of the heading and the right edge stays
 * reserved for the section's own action. Dividers run the full card width
 * while content stays inset, which is what makes the stack read as one
 * surface instead of a column of loose lists.
 */
export function ShellRightPanelSection({
  title,
  open,
  onToggle,
  action,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  action?: ReactNode
  children: ReactNode
}) {
  const bodyId = useId()

  return (
    <section
      aria-label={title}
      className="border-border px-spacing-3 py-spacing-2 border-b last:border-b-0"
    >
      <div className="gap-spacing-2 flex items-center">
        {/* Heading wraps the trigger — the accordion pattern that keeps the
            section reachable by heading navigation as well as by tab. */}
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={bodyId}
            className="gap-spacing-1 text-muted-foreground hover:text-foreground flex w-full min-w-0 items-center text-left transition-colors"
          >
            <span className="typo-section-label min-w-0 truncate">{title}</span>
            <ChevronDown
              className={cn('icon-sm shrink-0 transition-transform', !open && '-rotate-90')}
              aria-hidden
            />
          </button>
        </h3>
        {action}
      </div>
      {open ? (
        <div id={bodyId} className="pt-spacing-2">
          {children}
        </div>
      ) : null}
    </section>
  )
}
