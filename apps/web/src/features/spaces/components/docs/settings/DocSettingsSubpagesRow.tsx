'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, Files } from 'lucide-react'
import type { DocSubpagesDisplayMode } from '../types/doc-editor.types'
import { DOC_SUBPAGES_MODE_OPTIONS } from './doc-settings.constants'

export function DocSettingsSubpagesRow({
  mode,
  onChange,
}: {
  mode: DocSubpagesDisplayMode
  onChange: (next: DocSubpagesDisplayMode) => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const label = DOC_SUBPAGES_MODE_OPTIONS.find((o) => o.id === mode)?.settingsLabel ?? 'Table'

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
      >
        <Files className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
        <span className="flex-1 text-left text-[var(--foreground)]">Subpages</span>
        <span className="shrink-0 text-[var(--color-muted-foreground)]">{label}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="dropdown-menu-solid absolute right-0 top-full z-[50] mt-1 min-w-[10rem] overflow-hidden rounded-xl py-1 shadow-xl"
        >
          {DOC_SUBPAGES_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
            >
              <span className="flex-1">{opt.menuLabel}</span>
              {mode === opt.id && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
