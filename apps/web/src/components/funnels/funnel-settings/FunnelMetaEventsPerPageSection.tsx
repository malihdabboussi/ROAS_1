'use client'

import { ChevronRight, ListChecks } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SettingsDropdown } from '@/components/ui/forms/SettingsDropdown'
import type { Funnel } from '@/lib/artifacts/artifact-types'
import { cn } from '@/lib/utils/cn'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import { FUNNEL_META_EVENTS } from './funnel-pixel-utils'

export function FunnelMetaEventsPerPageSection(props: {
  funnel: Funnel
  onUpdateMetaEvents: (funnelId: string, events: Record<string, string>) => void
}) {
  const { funnel, onUpdateMetaEvents } = props

  const anchorRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const events = useMemo<Record<string, string>>(() => {
    const meta =
      funnel.metadata && typeof funnel.metadata === 'object'
        ? (funnel.metadata as Record<string, unknown>)
        : {}
    return meta.meta_events && typeof meta.meta_events === 'object'
      ? (meta.meta_events as Record<string, string>)
      : {}
  }, [funnel.metadata])

  const eventRows = useMemo(() => {
    const hasOptInPage = funnel.pages?.some((p) => p.page_type === 'opt-in') ?? false
    const hasThankYouPage =
      funnel.pages?.some(
        (p) => p.page_type === 'thank-you' || p.page_type === 'confirmation',
      ) ?? false
    const rows: {
      key: string
      label: string
      eventKey: 'opt-in' | 'thank-you'
      placeholder: string
      defaultLabel: string
    }[] = []
    if (hasOptInPage)
      rows.push({
        key: 'opt-in',
        label: 'Opt-in page',
        eventKey: 'opt-in',
        placeholder: 'View content',
        defaultLabel: 'Default (View content)',
      })
    if (hasThankYouPage)
      rows.push({
        key: 'thank-you',
        label: 'Thank you / Confirmation',
        eventKey: 'thank-you',
        placeholder: 'Lead / Complete registration',
        defaultLabel: 'Default (Lead / Complete registration)',
      })
    return rows
  }, [funnel.pages])

  const summary = `${eventRows.length} page${eventRows.length === 1 ? '' : 's'}`

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (anchorRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      if (t.closest('[data-funnel-meta-nested]')) return
      setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between transition-colors hover:opacity-80"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <span className="body-3 font-semibold text-[var(--foreground)]">Events per page</span>
        </div>
        <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
          <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
            {summary}
          </span>
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
              open && 'rotate-90',
            )}
          />
        </div>
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
            className="dropdown-menu-solid fixed z-[99999] flex max-h-96 flex-col overflow-hidden rounded-xl shadow-lg"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {eventRows.length === 0 ? (
              <div className="px-4 py-3">
                <p className="body-3 text-[var(--color-muted-foreground)]">
                  No opt-in or thank-you pages on this funnel yet.
                </p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
                <div className="flex flex-col gap-3 px-2">
                  {eventRows.map((row, idx) => (
                    <div key={row.key} data-funnel-meta-nested="" className="flex flex-col gap-2">
                      <div className="flex h-8 items-center gap-2 rounded-lg px-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] text-[10px] font-semibold text-[var(--foreground)]">
                          {idx + 1}
                        </div>
                        <span className="body-3 truncate font-medium text-[var(--foreground)]">
                          {row.label}
                        </span>
                      </div>
                      <SettingsDropdown
                      value={
                        row.eventKey === 'opt-in'
                          ? (events['opt-in'] ?? '')
                          : (events['thank-you'] ?? events.confirmation ?? '')
                      }
                      options={[
                        { value: '', label: row.defaultLabel },
                        ...FUNNEL_META_EVENTS,
                      ]}
                      onChange={(v) =>
                        void onUpdateMetaEvents(funnel.id, {
                          ...events,
                          ...(row.eventKey === 'opt-in'
                            ? { 'opt-in': v }
                            : { 'thank-you': v, confirmation: v }),
                        })
                      }
                      placeholder={row.placeholder}
                      compactSearch
                    />
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
