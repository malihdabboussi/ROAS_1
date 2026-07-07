'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PenLine, Trash2, Workflow } from 'lucide-react'

export interface AutomationRowActionsMenuProps {
  open: boolean
  anchor: HTMLElement | null
  onClose: () => void
  onRename: () => void
  onEdit: () => void
  onDelete: () => void
}

export function AutomationRowActionsMenu({
  open,
  anchor,
  onClose,
  onRename,
  onEdit,
  onDelete,
}: AutomationRowActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: -9999, left: -9999 })

  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) return
    const menuRect = menuRef.current.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let top = anchorRect.bottom + 4
    if (top + menuRect.height > vh - pad) top = anchorRect.top - menuRect.height - 4
    if (top < pad) top = pad
    let left = anchorRect.right
    if (left > vw - pad) left = vw - pad
    if (left - menuRect.width < pad) left = pad + menuRect.width
    setPos({ top, left })
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    const handleDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      if (anchor?.contains(t)) return
      onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose, anchor])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      data-automation-row-actions-menu
      role="menu"
      className="dropdown-menu-solid z-dropdown py-spacing-1 fixed w-[180px] overflow-hidden rounded-xl shadow-lg"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
    >
      <button
        type="button"
        role="menuitem"
        className="gap-spacing-2 hover:bg-hover-subtle body-3 text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
        onClick={() => {
          onRename()
          onClose()
        }}
      >
        <PenLine className="icon-sm text-muted-foreground shrink-0" />
        <span className="min-w-0 flex-1 truncate">Rename</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className="gap-spacing-2 hover:bg-hover-subtle body-3 text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
        onClick={() => {
          onEdit()
          onClose()
        }}
      >
        <Workflow className="icon-sm text-muted-foreground shrink-0" />
        <span className="min-w-0 flex-1 truncate">Edit</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className="gap-spacing-2 hover:bg-destructive/10 body-3 text-destructive px-spacing-3 py-spacing-2 flex w-full items-center text-left"
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        <Trash2 className="icon-sm shrink-0" />
        <span>Delete</span>
      </button>
    </div>,
    document.body,
  )
}
