'use client'

import { CalendarDays, X } from 'lucide-react'
import { MEETINGS_TOOLBAR_MESSAGES } from '@/features/spaces/config/meetings-toolbar-messages.config'
import { resolveCallDateWindow } from '@/features/spaces/lib/meetings-call-date-window'
import type { ViewDef } from '@/features/spaces/types/space-schema'

export function MeetingsCallDateWindowChip({
  view,
  onPatch,
}: {
  view: ViewDef | null
  onPatch: (patch: Partial<ViewDef>) => void
}) {
  if (view?.id !== 'all-meetings') return null
  const window = resolveCallDateWindow(view)
  if (window === 'past_through_tomorrow') {
    return (
      <button
        type="button"
        onClick={() => onPatch({ toolbar_call_date_window: 'all' })}
        className="badge-glass badge-glass-blue rounded-spacing-2 gap-spacing-1 px-spacing-2 py-spacing-1 body-4 group inline-flex items-center font-medium"
        aria-label={MEETINGS_TOOLBAR_MESSAGES.CALL_DATE_WINDOW_CLEAR.message}
      >
        <span className="relative flex items-center justify-center">
          <CalendarDays className="icon-xs group-hover:opacity-0" aria-hidden />
          <X className="icon-xs absolute inset-0 opacity-0 group-hover:opacity-100" aria-hidden />
        </span>
        <span>{MEETINGS_TOOLBAR_MESSAGES.CALL_DATE_WINDOW.message}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onPatch({ toolbar_call_date_window: 'past_through_tomorrow' })}
      className="button-compact button-glass-neutral"
      aria-label={MEETINGS_TOOLBAR_MESSAGES.CALL_DATE_WINDOW_RESTORE.message}
    >
      {MEETINGS_TOOLBAR_MESSAGES.CALL_DATE_WINDOW.message}
    </button>
  )
}
