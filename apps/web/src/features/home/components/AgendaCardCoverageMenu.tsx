'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { TeamAgendaCoverage } from '@/lib/services/calendar-api'

function personLabel(row: { display_name: string | null; email: string }): string {
  return row.display_name?.trim() || row.email
}

export function AgendaCardCoverageMenu(props: {
  coverage: TeamAgendaCoverage | null
  visible: boolean
}) {
  const { coverage, visible } = props
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!visible) setOpen(false)
  }, [visible])

  if (!visible || !coverage) return null

  const { totals, included, skipped, errors } = coverage

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="btn-icon-glass text-muted-foreground hover:text-foreground"
        aria-label="Team calendar coverage"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Calendars pulled into Team Agenda"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="dropdown-menu-solid z-dropdown absolute right-0 top-full mt-1 max-h-[min(70vh,420px)] w-[min(92vw,320px)] overflow-y-auto py-2"
        >
          <div className="border-border border-b px-3 pb-2">
            <p className="body-3 text-foreground font-semibold">Team calendars</p>
            <p className="typo-caption text-muted-foreground mt-0.5">
              {totals.pulled} pulled · {totals.failed} failed · {totals.rejected} rejected
              {totals.capped > 0 ? ` · ${totals.capped} capped` : ''}
            </p>
          </div>

          <div className="px-3 py-2">
            <p className="typo-caption text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
              Pulled
            </p>
            {included.length === 0 ? (
              <p className="body-4 text-muted-foreground">No Directory calendars pulled.</p>
            ) : (
              <ul className="gap-spacing-1 flex flex-col">
                {included.map((row) => (
                  <li key={row.identity_id} className="body-4 text-foreground">
                    <span className="font-medium">{personLabel(row)}</span>
                    <span className="text-muted-foreground"> · {row.email}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {row.event_count} event{row.event_count === 1 ? '' : 's'}
                    </span>
                    {row.error ? (
                      <span className="text-destructive block">Failed: {row.error}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {errors.length > 0 ? (
            <div className="border-border border-t px-3 py-2">
              <p className="typo-caption text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
                Failed pulls
              </p>
              <ul className="gap-spacing-1 flex flex-col">
                {errors.map((row) => (
                  <li key={row.identity_id} className="body-4">
                    <span className="text-foreground font-medium">{personLabel(row)}</span>
                    <span className="text-destructive block">{row.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {skipped.length > 0 ? (
            <div className="border-border border-t px-3 py-2">
              <p className="typo-caption text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
                Skipped
              </p>
              <ul className="gap-spacing-1 flex flex-col">
                {skipped.map((row) => (
                  <li key={row.identity_id} className="body-4 text-foreground">
                    <span className="font-medium">{personLabel(row)}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {row.reason === 'rejected' ? 'Rejected' : 'Over people limit'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
