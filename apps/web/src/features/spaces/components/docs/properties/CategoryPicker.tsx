'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Pencil, Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { FieldDef } from '../../../types/space-schema'
import { OptionDot } from '../../OptionBadge'

export function CategoryPicker({
  field,
  value,
  onChange,
  onEditCategories,
}: {
  field: FieldDef
  value: string | null
  onChange: (optionId: string) => void
  onEditCategories?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const options = field.options ?? []
  const selected = options.find((o) => o.id === value)

  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  const openDropdown = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  useEffect(() => {
    if (open && onEditCategories && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
    if (!open) setSearch('')
  }, [open, onEditCategories])

  const dropdown =
    open && dropdownPos
      ? createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[200] w-52 overflow-hidden rounded-xl py-1 shadow-xl"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {onEditCategories && (
              <div className="pr-spacing-4 flex items-center gap-1.5 border-b border-[var(--color-border)] p-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2 py-1">
                  <Search className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onEditCategories()
                  }}
                  className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                  title="Edit categories"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="max-h-[280px] overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]',
                  !value
                    ? 'font-medium text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)]',
                )}
              >
                <OptionDot size="sm" />
                None
              </button>
              {filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]',
                    opt.id === value && 'font-medium',
                  )}
                >
                  <OptionDot color={opt.color} size="sm" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={openDropdown}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:border-[var(--border)]"
      >
        {selected?.label ?? 'No category'}
        <ChevronDown
          className={cn(
            'h-3 w-3 text-[var(--color-muted-foreground)] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {dropdown}
    </div>
  )
}
