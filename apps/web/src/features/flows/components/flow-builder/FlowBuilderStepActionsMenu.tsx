'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Edit2, MoreHorizontal, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type FlowBuilderStepActionsMenuProps = {
  canDelete: boolean
  canClone: boolean
  onRename: () => void
  onDelete: () => void
  onClone: () => void
  triggerClassName?: string
}

export function FlowBuilderStepActionsMenu({
  canDelete,
  canClone,
  onRename,
  onDelete,
  onClone,
  triggerClassName,
}: FlowBuilderStepActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown, true)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown, true)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [open])

  const rect = open && rootRef.current ? rootRef.current.getBoundingClientRect() : null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Step actions"
        aria-expanded={open}
        className={cn('btn-icon-bare shrink-0', triggerClassName)}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <MoreHorizontal className="icon-sm" />
      </button>
      {open && rect && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              className="dropdown-menu-solid z-dropdown fixed min-w-44 overflow-hidden rounded-xl py-spacing-1"
              style={{ top: rect.bottom + 4, left: Math.max(8, rect.right - 176) }}
            >
              <button
                type="button"
                className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left"
                onClick={() => {
                  setOpen(false)
                  onRename()
                }}
              >
                <Edit2 className="icon-xs shrink-0" />
                Rename
              </button>
              {canClone ? (
                <button
                  type="button"
                  className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left"
                  onClick={() => {
                    setOpen(false)
                    onClone()
                  }}
                >
                  <Copy className="icon-xs shrink-0" />
                  Clone…
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className="body-3 text-destructive hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left"
                  onClick={() => {
                    setOpen(false)
                    onDelete()
                  }}
                >
                  <Trash2 className="icon-xs shrink-0" />
                  Delete
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
