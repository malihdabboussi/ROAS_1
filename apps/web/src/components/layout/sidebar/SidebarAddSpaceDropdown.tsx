'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LayoutGrid, Library } from 'lucide-react'

export interface SidebarAddSpaceDropdownProps {
  open: boolean
  anchorRect: DOMRect | null
  onClose: () => void
  onBlank: () => void
  onBrowse: () => void
}

export function SidebarAddSpaceDropdown({
  open,
  anchorRect,
  onClose,
  onBlank,
  onBrowse,
}: SidebarAddSpaceDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open || !anchorRect) {
      setPos(null)
      return
    }
    setPos({ top: anchorRect.bottom + 6, left: anchorRect.left })
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

  return createPortal(
    <div
      ref={menuRef}
      className="dropdown-menu-solid fixed z-[99999] w-[11.5rem] rounded-xl py-2 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        type="button"
        onClick={() => {
          onBlank()
          onClose()
        }}
        className="gap-spacing-2 body-3 flex w-full items-center px-3 py-2 text-left text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
      >
        <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
        Blank space
      </button>
      <button
        type="button"
        onClick={() => {
          onBrowse()
          onClose()
        }}
        className="gap-spacing-2 body-3 flex w-full items-center px-3 py-2 text-left text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
      >
        <Library className="h-3.5 w-3.5 shrink-0" />
        Browse templates
      </button>
    </div>,
    document.body,
  )
}
