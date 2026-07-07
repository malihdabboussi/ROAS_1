'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Image, LayoutGrid, Video } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { MediaAssetTypePick, MediaViewConfig } from '../../types/space-schema'
import { resolveMediaTypeFilters } from '../../types/space-schema'

const TYPE_PICK_ORDER: MediaAssetTypePick[] = ['image', 'video']

function MediaPickIcon({ pick, className }: { pick: MediaAssetTypePick; className?: string }) {
  const c = className ?? 'h-3.5 w-3.5'
  if (pick === 'image') return <Image className={c} />
  return <Video className={c} />
}

function orderedTypePicks(filters: MediaAssetTypePick[]): MediaAssetTypePick[] {
  return TYPE_PICK_ORDER.filter((t) => filters.includes(t))
}

export function MediaTypeFilterControl({
  mergedMediaConfig,
  onPatch,
  menuAlign = 'right',
}: {
  mergedMediaConfig: MediaViewConfig
  onPatch: (patch: Partial<MediaViewConfig>) => void | Promise<void>
  menuAlign?: 'left' | 'right'
}) {
  const typeFilters = useMemo(() => resolveMediaTypeFilters(mergedMediaConfig), [mergedMediaConfig])
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const fn = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [menuOpen])

  const toggleTypePick = useCallback(
    (pick: MediaAssetTypePick) => {
      const has = typeFilters.includes(pick)
      const next = has ? typeFilters.filter((x) => x !== pick) : [...typeFilters, pick]
      void onPatch({ type_filters: next, type_filter: undefined })
    },
    [onPatch, typeFilters],
  )

  const clearTypeFilters = useCallback(() => {
    void onPatch({ type_filters: [], type_filter: undefined })
  }, [onPatch])

  const alignClass = menuAlign === 'right' ? 'right-0' : 'left-0'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Tooltip label="Media types" side="bottom">
        <span className="inline-flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={
              typeFilters.length > 0
                ? 'badge-glass badge-glass-blue rounded-spacing-2 inline-flex shrink-0 cursor-pointer items-center gap-1 border-0 px-2 py-1 shadow-none transition-opacity hover:opacity-90'
                : `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                    menuOpen
                      ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                  }`
            }
            aria-label="Media types"
            aria-expanded={menuOpen}
          >
            {typeFilters.length > 0 ? (
              <>
                <span className="flex -space-x-1.5">
                  {orderedTypePicks(typeFilters).map((pick) => (
                    <span
                      key={pick}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--background)] ring-1 ring-[var(--background)]"
                    >
                      <MediaPickIcon pick={pick} className="h-2.5 w-2.5 text-[var(--foreground)]" />
                    </span>
                  ))}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-80" />
              </>
            ) : (
              <LayoutGrid className="h-3.5 w-3.5" />
            )}
          </button>
        </span>
      </Tooltip>
      {menuOpen ? (
        <div
          className={`dropdown-menu-solid absolute ${alignClass} z-dropdown top-full mt-1 w-48 rounded-xl py-1 shadow-lg`}
        >
          <button
            type="button"
            onClick={() => {
              clearTypeFilters()
            }}
            className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${
              typeFilters.length === 0
                ? 'font-medium text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)]'
            }`}
          >
            <span className="flex items-center gap-2 text-[var(--foreground)]">
              <LayoutGrid className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              All types
            </span>
            {typeFilters.length === 0 ? (
              <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
            ) : null}
          </button>
          {TYPE_PICK_ORDER.map((opt) => {
            const active = typeFilters.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleTypePick(opt)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="flex items-center gap-2 capitalize text-[var(--foreground)]">
                  <span className="text-[var(--color-muted-foreground)]">
                    <MediaPickIcon pick={opt} />
                  </span>
                  {opt}
                </span>
                {active ? <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
