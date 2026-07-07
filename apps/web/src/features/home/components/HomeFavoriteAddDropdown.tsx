'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

const MENU_WIDTH = 280
const MENU_MARGIN = 8

export type HomeFavoriteAddItem = {
  id: string
  label: string
  icon?: ReactNode
}

export function HomeFavoriteAddDropdown({
  tooltip,
  ariaLabel,
  emptyMessage,
  items,
  onPick,
}: {
  tooltip: string
  ariaLabel: string
  emptyMessage: string
  items: HomeFavoriteAddItem[]
  onPick: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (menuRef.current?.contains(t)) return
      if (buttonRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const vw = window.innerWidth
    let left = rect.right - MENU_WIDTH
    if (left + MENU_WIDTH + MENU_MARGIN > vw) left = vw - MENU_WIDTH - MENU_MARGIN
    if (left < MENU_MARGIN) left = MENU_MARGIN
    setPosition({ top: rect.bottom + 4, left })
  }, [open])

  return (
    <>
      <Tooltip label={tooltip} side="bottom">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors hover:bg-[var(--color-hover-subtle)]"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={ariaLabel}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </Tooltip>

      {mounted && open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="dropdown-menu-solid fixed max-h-[min(70vh,520px)] overflow-y-auto py-1"
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                width: MENU_WIDTH,
                visibility: position ? 'visible' : 'hidden',
              }}
            >
              {items.length === 0 ? (
                <div className="body-3 text-muted-foreground/70 px-3 py-2">{emptyMessage}</div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className="body-3 text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
                    onClick={() => {
                      onPick(item.id)
                      setOpen(false)
                    }}
                  >
                    {item.icon ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
