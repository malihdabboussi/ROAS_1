'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const WEBSITE_NAV_STYLE_OPTIONS: { id: 'link' | 'button'; label: string }[] = [
  { id: 'link', label: 'Link' },
  { id: 'button', label: 'Button' },
]

export function WebsiteNavStyleDropdown({
  value,
  onChange,
}: {
  value: 'link' | 'button'
  onChange: (v: 'link' | 'button') => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="relative shrink-0" ref={wrapRef} data-nav-style-dropdown>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-glass body-3 h-spacing-10 px-spacing-3 rounded-spacing-2 flex items-center justify-between gap-1"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{value === 'button' ? 'Button' : 'Link'}</span>
        <ChevronDown className="icon-sm shrink-0 opacity-70" />
      </button>
      {open && (
        <div className="mt-spacing-1 z-dropdown absolute right-0 top-full" data-dropdown>
          <div className="dropdown-menu-solid p-spacing-2 min-w-40">
            <div className="space-y-spacing-0">
              {WEBSITE_NAV_STYLE_OPTIONS.map((opt) => {
                const isSelected = value === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id)
                      setOpen(false)
                    }}
                    className={`rounded-spacing-1 px-spacing-2 py-spacing-2 body-3 flex w-full items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'dropdown-sort-option-selected text-muted-foreground'
                        : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    {isSelected && (
                      <div className="dropdown-sort-check ml-spacing-2">
                        <svg
                          viewBox="0 0 20 20"
                          className="tint-green relative z-30 h-2.5 w-2.5"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
