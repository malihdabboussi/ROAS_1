'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FolderKanban, Layers, LayoutGrid } from 'lucide-react'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'

export type ProgramsCreateAction = 'program' | 'campaign' | 'space'

export function SidebarProgramsCreateMenu({
  open,
  anchorRect,
  onClose,
  onSelect,
}: {
  open: boolean
  anchorRect: DOMRect | null
  onClose: () => void
  onSelect: (action: ProgramsCreateAction) => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open || !anchorRect) {
      setPos(null)
      return
    }
    setPos({ top: anchorRect.bottom + 6, left: Math.max(8, anchorRect.right - 200) })
  }, [open, anchorRect])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open || !pos || typeof document === 'undefined') return null

  const rowCls =
    'gap-spacing-2 body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center rounded-spacing-2 px-spacing-2 py-spacing-1 text-left transition-colors'

  return createPortal(
    <div
      ref={menuRef}
      {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
      data-hub-dock-keep-open
      className="surface-card border-border z-dropdown rounded-spacing-2 p-spacing-2 fixed min-w-56 border shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="gap-spacing-1 px-spacing-1 flex flex-col">
        <button
          type="button"
          className={rowCls}
          onClick={() => {
            onSelect('program')
            onClose()
          }}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
          New Program
        </button>
        <button
          type="button"
          className={rowCls}
          onClick={() => {
            onSelect('campaign')
            onClose()
          }}
        >
          <FolderKanban className="h-3.5 w-3.5 shrink-0" aria-hidden />
          New Campaign
        </button>
        <button
          type="button"
          className={rowCls}
          onClick={() => {
            onSelect('space')
            onClose()
          }}
        >
          <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />
          New Space
        </button>
      </div>
    </div>,
    document.body,
  )
}
