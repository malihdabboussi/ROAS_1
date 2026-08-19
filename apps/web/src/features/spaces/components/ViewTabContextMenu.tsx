'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Pin, PinOff, Settings2 } from 'lucide-react'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { cn } from '@/lib/utils/cn'
import type { ViewDef } from '../types/space-schema'

const MENU_WIDTH = 200
const ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
const ICON_CLS = 'icon-xs shrink-0'

export type ViewTabContextMenuProps = {
  /** Viewport point where the tab was right-clicked; `null` = closed. */
  position: { x: number; y: number } | null
  view: ViewDef | null
  onClose: () => void
  onTogglePin: (view: ViewDef, pinned: boolean) => void
  onCustomize: (view: ViewDef) => void
}

/**
 * Right-click menu for a view tab: quick pin/unpin, or open the full customize panel
 * (rename, fields, delete-with-confirm live there).
 * Portalled to `document.body` so ancestor transforms don't re-base the fixed position.
 */
export function ViewTabContextMenu({
  position,
  view,
  onClose,
  onTogglePin,
  onCustomize,
}: ViewTabContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!position || !ref.current) {
      setPos(null)
      return
    }
    const rect = ref.current.getBoundingClientRect()
    const pad = 8
    let left = position.x
    let top = position.y
    if (top + rect.height > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - rect.height - pad)
    }
    if (left + rect.width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - rect.width - pad)
    }
    setPos({ top, left })
  }, [position])

  useEffect(() => {
    if (!position) return
    const onDocDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [position, onClose])

  if (!position || !view || typeof document === 'undefined') return null

  const pinned = view.pinned_to_start ?? false
  const row = (icon: ReactNode, label: string, onPick: () => void) => (
    <button
      type="button"
      role="menuitem"
      className={ITEM_CLS}
      onClick={() => {
        onPick()
        onClose()
      }}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
    </button>
  )

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`${view.name} view options`}
      {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}
      className={cn(
        'z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed border shadow-lg',
        'gap-spacing-1 flex flex-col',
      )}
      style={
        pos
          ? { top: pos.top, left: pos.left, width: MENU_WIDTH }
          : { top: -9999, left: -9999, width: MENU_WIDTH, visibility: 'hidden' }
      }
    >
      {row(
        pinned ? <PinOff className={ICON_CLS} /> : <Pin className={ICON_CLS} />,
        pinned ? 'Unpin view' : 'Pin to start',
        () => onTogglePin(view, !pinned),
      )}
      {row(<Settings2 className={ICON_CLS} />, 'Customize view…', () => onCustomize(view))}
    </div>,
    document.body,
  )
}
