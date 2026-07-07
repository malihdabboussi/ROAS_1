'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import type { ContactsConfig, ViewDef } from '../types/space-schema'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

const SORT_FIELD_OPTIONS: { id: NonNullable<ContactsConfig['sort_by']>; label: string }[] = [
  { id: 'created_at', label: 'Created date' },
  { id: 'email', label: 'Email' },
  { id: 'name', label: 'Name' },
]

function getContactsConfig(view: ViewDef): ContactsConfig {
  return view.contacts_config ?? {}
}

export function ContactsSortToolbarMenu({
  open,
  onClose,
  anchorRef,
  onViewPatch,
  activeView,
}: {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  onViewPatch: (patch: Partial<ViewDef>) => void | Promise<void>
  activeView: ViewDef
}) {
  const cc = getContactsConfig(activeView)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const menuW = 260
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    let left = rect.left
    if (left + menuW > vw - 8) left = Math.max(8, vw - menuW - 8)
    setPos({ top: rect.bottom + 6, left })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const reposition = () => {
      if (!anchorRef.current) return
      const rect = anchorRef.current.getBoundingClientRect()
      const menuW = 260
      const vw = window.innerWidth
      let left = rect.left
      if (left + menuW > vw - 8) left = Math.max(8, vw - menuW - 8)
      setPos({ top: rect.bottom + 6, left })
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
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
  }, [open, onClose, anchorRef])

  if (!open || !pos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
      className="dropdown-menu-solid fixed z-[99999] w-[16.25rem] rounded-xl py-2 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <p className="px-3 pb-1 text-xs font-medium text-[var(--color-muted-foreground)]">Sort by</p>
      {SORT_FIELD_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            void onViewPatch({
              contacts_config: { ...cc, sort_by: opt.id },
            })
          }}
          className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
        >
          <span>{opt.label}</span>
          {(cc.sort_by ?? 'created_at') === opt.id ? (
            <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
          ) : null}
        </button>
      ))}
      <div className="my-1 border-t border-[var(--border)]" />
      <p className="px-3 pb-1 pt-1 text-xs font-medium text-[var(--color-muted-foreground)]">
        Direction
      </p>
      {(['asc', 'desc'] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => {
            void onViewPatch({
              contacts_config: { ...cc, sort_dir: dir },
            })
          }}
          className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
        >
          <span>{dir === 'asc' ? 'Ascending (A-Z)' : 'Descending (Z-A)'}</span>
          {(cc.sort_dir ?? 'desc') === dir ? (
            <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
          ) : null}
        </button>
      ))}
    </div>,
    document.body,
  )
}
