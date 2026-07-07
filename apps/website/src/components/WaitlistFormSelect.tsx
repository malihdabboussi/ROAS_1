'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const TRIGGER_STYLE = {
  backgroundColor: 'var(--bg-subtle-hover)',
  border: '1px solid var(--border-strong)',
} as const

type Option = { value: string; label: string }

/**
 * Single-select dropdown aligned with `.docs/guidelines/design/design-guidelines.md` §8
 * (HubTool-style panel: solid surface, border, shadow, body-3 rows, hover-subtle).
 */
export function WaitlistFormSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  options: readonly Option[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectable = options.filter((o) => o.value !== '')
  const selectedLabel = options.find((o) => o.value === value)?.label

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={rootRef} className="relative" data-dropdown>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="body-3 flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-emerald)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]"
        style={TRIGGER_STYLE}
      >
        <span className={value ? 'text-white' : 'text-color-muted min-w-0 truncate'}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-color-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="studio-home-campaign-dropdown z-dropdown absolute left-0 right-0 top-full mt-1 max-h-52 list-none overflow-y-auto py-1"
        >
          {selectable.map((o) => {
            const isSelected = value === o.value
            return (
              <li key={o.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className={`body-3 hover-bg-mock-white-05 flex w-full items-center px-3 py-2.5 text-left transition-colors ${
                    isSelected ? 'bg-mock-white-05 text-white' : 'text-color-muted hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
