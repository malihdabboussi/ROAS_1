'use client'

import { ChevronRight, Megaphone } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { SettingsDropdown } from '@/components/ui/forms/SettingsDropdown'
import type { Funnel } from '@/lib/artifacts/artifact-types'
import { cn } from '@/lib/utils/cn'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import { getFunnelPixelsFromMetadata, type FunnelPixelEntry } from './funnel-pixel-utils'

export function FunnelMetaPixelSection(props: {
  funnel: Funnel
  allMetaPixelOptions: { value: string; label: string }[]
  funnelPixelSaving: boolean
  funnelManualPixelId: string
  setFunnelManualPixelId: (v: string) => void
  onUpdatePixels: (funnelId: string, pixels: FunnelPixelEntry[]) => void
}) {
  const {
    funnel,
    allMetaPixelOptions,
    funnelPixelSaving,
    funnelManualPixelId,
    setFunnelManualPixelId,
    onUpdatePixels,
  } = props

  const anchorRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const meta =
    funnel.metadata && typeof funnel.metadata === 'object'
      ? (funnel.metadata as Record<string, unknown>)
      : {}
  const currentPixels = getFunnelPixelsFromMetadata(meta)

  const summary = `${currentPixels.length} pixel${currentPixels.length === 1 ? '' : 's'}`

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
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <span className="body-3 font-semibold text-[var(--foreground)]">Pixels</span>
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
            <div className="flex min-h-0 flex-1 flex-col px-2 pb-3 pt-2">
              <div className="flex flex-col gap-2 px-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex shrink-0 justify-start sm:justify-end">
                  {funnelManualPixelId === '__choose__' ||
                  funnelManualPixelId === '__meta__' ||
                  (typeof funnelManualPixelId === 'string' &&
                    funnelManualPixelId.startsWith('__pasting__')) ? (
                    <button
                      type="button"
                      className="body-3 px-3 py-1.5 font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                      onClick={() => setFunnelManualPixelId('')}
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="body-3 rounded-lg border border-[var(--color-border)] px-3 py-1.5 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                      onClick={() => setFunnelManualPixelId('__choose__')}
                    >
                      Add Pixel
                    </button>
                  )}
                </div>
              </div>

              {funnelPixelSaving ? (
                <span className="body-3 px-3 py-2 text-[var(--color-muted-foreground)]">Saving...</span>
              ) : null}

              {currentPixels.length > 0 ? (
                <ul className="mt-2 space-y-0.5">
                  {currentPixels.map((p) => {
                    const resolvedName =
                      p.name || allMetaPixelOptions.find((o) => o.value === p.id)?.label
                    return (
                      <li
                        key={p.id}
                        className="flex min-h-8 items-center justify-between gap-2 rounded-lg px-3 py-1.5 hover:bg-[var(--color-hover-subtle)]"
                      >
                        <div className="min-w-0 flex-1">
                          {resolvedName ? (
                            <span className="body-3 block truncate font-medium text-[var(--foreground)]">
                              {resolvedName}
                            </span>
                          ) : null}
                          <span className="text-[10px] text-[var(--color-muted-foreground)]">{p.id}</span>
                        </div>
                        <button
                          type="button"
                          className="body-3 shrink-0 px-2 py-1 font-medium text-[var(--color-destructive)] transition-colors hover:underline disabled:opacity-50"
                          disabled={funnelPixelSaving}
                          onClick={() => {
                            const next = currentPixels.filter((x) => x.id !== p.id)
                            void onUpdatePixels(funnel.id, next)
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              {(() => {
                const mode = funnelManualPixelId
                if (mode === '__choose__') {
                  return (
                    <div className="mt-2 flex flex-wrap gap-2 px-2">
                      <button
                        type="button"
                        className="body-3 rounded-lg border border-[var(--color-border)] px-3 py-2 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                        onClick={() => setFunnelManualPixelId('__meta__')}
                      >
                        From Meta
                      </button>
                      <button
                        type="button"
                        className="body-3 rounded-lg border border-[var(--color-border)] px-3 py-2 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                        onClick={() => setFunnelManualPixelId('__pasting__')}
                      >
                        Paste Pixel ID
                      </button>
                    </div>
                  )
                }
                if (mode === '__meta__') {
                  const available = allMetaPixelOptions.filter(
                    (o) => !currentPixels.some((cp) => cp.id === o.value),
                  )
                  return (
                    <div data-funnel-meta-nested="" className="space-y-2">
                      <SettingsDropdown
                        value=""
                        options={[
                          { value: '', label: 'Select a pixel...' },
                          ...available.map((o) => ({
                            value: o.value,
                            label: o.label,
                            description: o.value,
                          })),
                        ]}
                        onChange={(value) => {
                          if (!value.trim()) return
                          const opt = allMetaPixelOptions.find((o) => o.value === value)
                          setFunnelManualPixelId('')
                          void onUpdatePixels(funnel.id, [
                            ...currentPixels,
                            {
                              id: value.trim(),
                              name: opt?.label,
                              source: 'integration',
                            },
                          ])
                        }}
                        placeholder="Select a pixel..."
                        searchable
                        compactSearch
                        minWidth={280}
                      />
                    </div>
                  )
                }
                if (typeof mode === 'string' && mode.startsWith('__pasting__')) {
                  return (
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 px-2">
                      <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2.5 py-1.5">
                        <input
                          autoFocus
                          value={mode.replace('__pasting__', '')}
                          onChange={(e) => setFunnelManualPixelId(`__pasting__${e.target.value}`)}
                          placeholder="Enter Pixel ID (e.g. 505546750304736)"
                          className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                        />
                      </div>
                      <button
                        type="button"
                        className="body-3 shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-2 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50"
                        disabled={funnelPixelSaving}
                        onClick={() => {
                          const id = mode.replace('__pasting__', '').trim()
                          if (!id) return
                          if (!/^\d{5,20}$/.test(id)) {
                            toast.error('Pixel ID must be 5–20 digits')
                            return
                          }
                          if (currentPixels.some((x) => x.id === id)) return
                          setFunnelManualPixelId('')
                          void onUpdatePixels(funnel.id, [
                            ...currentPixels,
                            { id, source: 'manual' },
                          ])
                        }}
                      >
                        Add
                      </button>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
