'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

export type ContactsAddMenuProps = {
  open: boolean
  setOpen: (v: boolean) => void
  rootRef: RefObject<HTMLDivElement | null>
  onAddManually: () => void
  onImportCsv: () => void
  onImportGhl: () => void
  onImportAc: () => void
}

export function ContactsAddMenu({
  open,
  setOpen,
  rootRef,
  onAddManually,
  onImportCsv,
  onImportGhl,
  onImportAc,
}: ContactsAddMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.right })
  }, [open, rootRef])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !rootRef.current?.contains(t)) setOpen(false)
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
  }, [open, setOpen, rootRef])

  return (
    <div ref={rootRef} className="relative">
      <Tooltip label="Add or import contacts" side="bottom">
        <span className="inline-flex">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1 px-3 py-2 font-semibold transition-opacity hover:opacity-90"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            Add
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </span>
      </Tooltip>
      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
              className="dropdown-menu-solid fixed z-[99999] min-w-[14rem] rounded-xl py-1 shadow-lg"
              style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                onClick={() => {
                  setOpen(false)
                  onAddManually()
                }}
              >
                Add manually
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                onClick={() => {
                  setOpen(false)
                  onImportCsv()
                }}
              >
                Import from CSV
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                onClick={() => {
                  setOpen(false)
                  onImportGhl()
                }}
              >
                Import from GoHighLevel
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                onClick={() => {
                  setOpen(false)
                  onImportAc()
                }}
              >
                Import from ActiveCampaign
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
