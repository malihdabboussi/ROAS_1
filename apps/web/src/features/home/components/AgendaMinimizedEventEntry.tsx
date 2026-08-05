'use client'

import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

const ENTRY_TRANSITION = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const

/**
 * Minimized agenda rows collapse to a thin restoreable line — no title, no strikethrough.
 * Calendar eventColor is intentional (third-party calendar identity), same as expanded rows.
 */
export function AgendaMinimizedEventEntry({
  ev,
  onRestore,
}: {
  ev: CalendarAgendaEvent
  /** Kept for call-site compatibility with expanded agenda rows. */
  accountLabel: string
  /** Kept for call-site compatibility; minimized rows use a token hairline. */
  eventColor: string
  onRestore?: () => void
}) {
  const label = `Restore minimized meeting: ${ev.title}`

  return (
    <motion.div
      layout
      transition={ENTRY_TRANSITION}
      className="gap-spacing-2 px-spacing-2 py-spacing-1 group flex items-center"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onRestore?.()
        }}
        className="hover:bg-hover-subtle rounded-spacing-2 px-spacing-1 flex min-h-4 min-w-0 flex-1 items-center"
        aria-label={label}
        title={label}
      >
        <span
          className="bg-border group-hover:bg-muted-foreground block h-0.5 w-full rounded-full transition-colors"
          aria-hidden
        />
      </button>
      {onRestore ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRestore()
          }}
          className="btn-icon-bare opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={label}
          title="Restore meeting"
        >
          <RotateCcw className="icon-sm" aria-hidden />
        </button>
      ) : null}
    </motion.div>
  )
}
