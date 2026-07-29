'use client'

import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

const ENTRY_TRANSITION = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const

export function AgendaMinimizedEventEntry({
  ev,
  accountLabel,
  eventColor,
  onRestore,
}: {
  ev: CalendarAgendaEvent
  accountLabel: string
  eventColor: string
  onRestore?: () => void
}) {
  return (
    <motion.div
      layout
      transition={ENTRY_TRANSITION}
      className="hover:bg-hover-subtle flex items-center gap-2 rounded-lg px-2 py-2 transition-colors"
    >
      <span
        className="h-6 w-1 shrink-0 rounded-full"
        style={{ background: eventColor }}
        aria-hidden
      />
      <span className="typo-caption text-muted-foreground w-14 shrink-0 line-through">
        {ev.all_day
          ? 'All day'
          : new Date(ev.start).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
      </span>
      <div className="min-w-0 flex-1">
        <span className="body-3 text-muted-foreground block truncate font-medium line-through">
          {ev.title}
        </span>
        {accountLabel ? (
          <span className="typo-caption text-muted-foreground block truncate line-through">
            {accountLabel}
          </span>
        ) : null}
      </div>
      <span className="badge-glass badge-glass-muted typo-caption shrink-0">Minimized</span>
      {onRestore ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRestore()
          }}
          className="btn-icon-bare"
          aria-label="Restore meeting"
          title="Restore meeting"
        >
          <RotateCcw className="icon-sm" aria-hidden />
        </button>
      ) : null}
    </motion.div>
  )
}
