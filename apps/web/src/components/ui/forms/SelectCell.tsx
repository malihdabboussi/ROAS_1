'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Ban, Check, Flag, Pencil, Search } from 'lucide-react'
import { OptionBadge, OptionDot } from '@/components/ui/status/OptionBadge'
import { STATUS_CATEGORIES } from '@/lib/spaces/status-categories'
import type { FieldDef } from '@/lib/spaces/space-schema-types'
import { cn } from '@/lib/utils/cn'

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value
}

const FLAG_COLOR: Record<string, string> = {
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  blue: 'text-blue-600 dark:text-blue-400',
  slate: 'text-slate-600 dark:text-slate-400',
  amber: 'text-amber-600 dark:text-amber-400',
  violet: 'text-violet-600 dark:text-violet-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
}

interface SelectCellProps {
  field: FieldDef
  value: unknown
  onChange: (value: unknown) => void
  readonly?: boolean
  onEditStatuses?: () => void
  onEditCategories?: () => void
  customTrigger?: ReactNode
  /** When set with customTrigger, the trigger is content-sized. */
  triggerInline?: boolean
  fieldRowVariant?: 'default' | 'kanban'
  openOnMount?: boolean
  bulkInlineEditor?: boolean
}

export function SelectCell({
  field,
  value,
  onChange,
  readonly,
  onEditStatuses,
  onEditCategories,
  customTrigger,
  triggerInline,
  fieldRowVariant = 'default',
  openOnMount,
}: SelectCellProps) {
  const options = field.options ?? []
  const selectedId = asString(value)
  const selected = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId],
  )

  const [open, setOpen] = useState(!!openOnMount)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
    maxHeight: number
  } | null>(null)

  const isStatus = field.id === 'status'
  const isCategory = field.id === 'category'
  const isPriority = field.id === 'priority'
  const showSelectToolbar = isStatus || (isCategory && !!onEditCategories)
  const dropdownWidthPx = showSelectToolbar ? 240 : 208

  useEffect(() => {
    if (open && showSelectToolbar && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
    if (!open) setSearch('')
  }, [open, showSelectToolbar])

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter((option) => option.label.toLowerCase().includes(q))
  }, [options, search])

  const groupedOptions = useMemo(() => {
    if (!isStatus) return null
    const groups: { id: string; label: string; items: typeof filteredOptions }[] = []
    for (const cat of STATUS_CATEGORIES) {
      const items = filteredOptions.filter((option) => (option.group ?? 'active') === cat.id)
      if (items.length > 0) groups.push({ id: cat.id, label: cat.label, items })
    }
    return groups
  }, [isStatus, filteredOptions])

  const positionDropdown = useCallback(() => {
    const trigger = triggerRef.current
    const panel = dropdownRef.current
    if (!open || !trigger || !panel) return
    const rect = trigger.getBoundingClientRect()
    const pad = 8
    const measured = panel.offsetHeight
    const menuH = Math.min(measured, window.innerHeight - pad * 2)
    const spaceBelow = window.innerHeight - rect.bottom - pad
    const spaceAbove = rect.top - pad

    let placeAbove = false
    if (menuH <= spaceBelow) placeAbove = false
    else if (menuH <= spaceAbove) placeAbove = true
    else placeAbove = spaceAbove >= spaceBelow

    const slot = placeAbove ? spaceAbove : spaceBelow
    const maxHeight = Math.max(120, Math.min(menuH, slot - 4))

    const maxLeft = window.innerWidth - dropdownWidthPx - 8
    const left = Math.max(8, Math.min(rect.left, maxLeft))

    if (placeAbove) {
      setPos({
        top: null,
        bottom: window.innerHeight - rect.top + 4,
        left,
        maxHeight,
      })
    } else {
      setPos({
        top: rect.bottom + 4,
        bottom: null,
        left,
        maxHeight,
      })
    }
  }, [open, dropdownWidthPx])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    positionDropdown()
    const id = requestAnimationFrame(() => positionDropdown())
    return () => cancelAnimationFrame(id)
  }, [open, positionDropdown, filteredOptions])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!dropdownRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', positionDropdown, true)
    window.addEventListener('resize', positionDropdown)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', positionDropdown, true)
      window.removeEventListener('resize', positionDropdown)
    }
  }, [open, positionDropdown])

  if (readonly) {
    if (!selected) return <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
    if (isStatus) return <OptionDot color={selected.color} />
    if (isPriority)
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <Flag
            className={`h-3.5 w-3.5 shrink-0 ${FLAG_COLOR[selected.color ?? ''] ?? 'text-[var(--color-muted-foreground)]'}`}
            fill="currentColor"
          />
          <span className="min-w-0 truncate text-xs text-[var(--foreground)]">
            {selected.label}
          </span>
        </span>
      )
    return <OptionBadge option={selected} />
  }

  function renderOption(opt: (typeof options)[number]) {
    const active = opt.id === selectedId
    return (
      <button
        key={opt.id}
        type="button"
        onClick={() => {
          onChange(opt.id)
          setOpen(false)
        }}
        className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-hover-subtle)] ${
          active ? 'bg-[var(--color-hover-subtle)]' : ''
        }`}
      >
        {isPriority ? (
          <Flag
            className={`h-3.5 w-3.5 shrink-0 ${FLAG_COLOR[opt.color ?? ''] ?? 'text-[var(--color-muted-foreground)]'}`}
            fill="currentColor"
          />
        ) : (
          <OptionDot color={opt.color} size="sm" />
        )}
        <span
          className={`flex-1 truncate text-left ${active ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--foreground)]'}`}
        >
          {opt.label}
        </span>
        {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />}
      </button>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center text-left',
          customTrigger && (triggerInline ? 'shrink-0' : 'w-full'),
          fieldRowVariant === 'kanban' && 'gap-1.5',
          isPriority && selected && fieldRowVariant !== 'kanban' && 'min-w-0 gap-1.5',
          // Category + generic selects (e.g. Call Kind) show label beside the dot in list cells.
          !isStatus && !isPriority && selected && fieldRowVariant !== 'kanban' && 'min-w-0 gap-1.5',
        )}
        title={selected?.label}
      >
        {customTrigger ??
          (isStatus ? (
            selected ? (
              <OptionDot color={selected.color} />
            ) : (
              <OptionDot />
            )
          ) : isPriority ? (
            selected ? (
              <>
                <Flag
                  className={`h-3.5 w-3.5 shrink-0 ${FLAG_COLOR[selected.color ?? ''] ?? 'text-[var(--color-muted-foreground)]'}`}
                  fill="currentColor"
                />
                <span className="min-w-0 truncate text-xs text-[var(--foreground)]">
                  {selected.label}
                </span>
              </>
            ) : (
              <Flag className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            )
          ) : selected ? (
            <>
              <OptionDot color={selected.color} />
              <span className="min-w-0 truncate text-xs text-[var(--foreground)]">
                {selected.label}
              </span>
            </>
          ) : (
            <OptionDot />
          ))}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            data-select-cell-portal
            className="fixed z-[100001] flex flex-col overflow-hidden"
            style={{
              top: pos?.top ?? undefined,
              bottom: pos?.bottom ?? undefined,
              left: pos?.left ?? 0,
              maxHeight:
                pos?.maxHeight ??
                Math.min(320, typeof window !== 'undefined' ? window.innerHeight - 16 : 320),
              visibility: pos ? 'visible' : 'hidden',
              pointerEvents: pos ? 'auto' : 'none',
            }}
          >
            <div
              className={cn(
                'dropdown-menu-solid overflow-hidden rounded-xl',
                showSelectToolbar ? 'w-60' : 'w-52',
              )}
            >
              {showSelectToolbar && (
                <div className="flex min-w-0 items-center gap-2 border-b border-[var(--color-border)] p-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2 py-1">
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
                  {isStatus && onEditStatuses && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        onEditStatuses()
                      }}
                      className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                      title="Edit statuses"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {isCategory && onEditCategories && (
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
                  )}
                </div>
              )}

              <div className="max-h-[280px] overflow-y-auto py-1">
                {isPriority && (
                  <p className="px-3 pb-0.5 pt-1 text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    Priority
                  </p>
                )}
                {groupedOptions
                  ? groupedOptions.map((group) => (
                      <div key={group.id}>
                        <p className="px-3 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                          {group.label}
                        </p>
                        {group.items.map(renderOption)}
                      </div>
                    ))
                  : filteredOptions.map(renderOption)}
                {isPriority && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2 border-t border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                  >
                    <Ban className="h-3.5 w-3.5 shrink-0" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
