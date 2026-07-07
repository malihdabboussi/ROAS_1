'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Grid3x3, Image as ImageIcon, Rows3 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { MediaPreviewCardSize, MediaViewConfig } from '../../types/space-schema'

const OPTIONS: {
  id: MediaPreviewCardSize
  label: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'preview', label: 'Preview', Icon: ImageIcon },
  { id: 'compact', label: 'Compact', Icon: Rows3 },
  { id: 'small', label: 'Small grid', Icon: Grid3x3 },
]

export function MediaPreviewCardSizeControl({
  mergedMediaConfig,
  onPatch,
  menuAlign = 'right',
}: {
  mergedMediaConfig: MediaViewConfig
  onPatch: (patch: Partial<MediaViewConfig>) => void | Promise<void>
  menuAlign?: 'left' | 'right'
}) {
  const activeSize = mergedMediaConfig.preview_card_size ?? 'preview'
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const active = useMemo(() => OPTIONS.find((o) => o.id === activeSize), [activeSize])
  const ActiveIcon = active?.Icon ?? ImageIcon
  const isNonDefault = activeSize !== 'preview'

  useEffect(() => {
    if (!menuOpen) return
    const fn = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn, true)
    return () => document.removeEventListener('mousedown', fn, true)
  }, [menuOpen])

  const alignClass = menuAlign === 'right' ? 'right-0' : 'left-0'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Tooltip label="Card size" side="bottom">
        <span className="inline-flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={
              isNonDefault
                ? 'badge-glass badge-glass-blue rounded-spacing-2 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-0 p-0 shadow-none transition-opacity hover:opacity-90'
                : `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                    menuOpen
                      ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                  }`
            }
            aria-label="Media card size"
            aria-expanded={menuOpen}
          >
            <ActiveIcon className="h-3.5 w-3.5 shrink-0" />
          </button>
        </span>
      </Tooltip>
      {menuOpen ? (
        <div
          className={`dropdown-menu-solid absolute ${alignClass} z-dropdown top-full mt-1 min-w-[10rem] rounded-xl py-1 shadow-lg`}
        >
          {OPTIONS.map(({ id, label, Icon }) => {
            const selected = activeSize === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  void onPatch({ preview_card_size: id })
                  setMenuOpen(false)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  {label}
                </span>
                {selected ? (
                  <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
