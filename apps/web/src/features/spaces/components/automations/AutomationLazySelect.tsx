'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react'

export interface AutomationLazyOption {
  value: string
  label: string
  description?: string | null
  leading?: ReactNode
}

interface LoadOptionsResult {
  options: AutomationLazyOption[]
  hasMore: boolean
}

interface AutomationLazySelectProps {
  value: string
  onChange: (value: string, option: AutomationLazyOption | null) => void
  loadOptions: (input: {
    search: string
    offset: number
    limit: number
  }) => Promise<LoadOptionsResult>
  placeholder: string
  searchPlaceholder?: string
  emptyLabel?: string
  pageSize?: number
  className?: string
  disabled?: boolean
  allowClear?: boolean
}

export function AutomationLazySelect({
  value,
  onChange,
  loadOptions,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No matches',
  pageSize = 25,
  className = '',
  disabled = false,
  allowClear = true,
}: AutomationLazySelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<AutomationLazyOption[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestSeq = useRef(0)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const selected = options.find((o) => o.value === value) ?? null

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 300),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function loadPage(nextOffset: number, mode: 'replace' | 'append') {
    const seq = ++requestSeq.current
    setLoading(true)
    try {
      const result = await loadOptions({
        search: query.trim(),
        offset: nextOffset,
        limit: pageSize,
      })
      if (seq !== requestSeq.current) return
      setOptions((prev) => (mode === 'append' ? [...prev, ...result.options] : result.options))
      setHasMore(result.hasMore)
      setLoadedOnce(true)
    } finally {
      if (seq === requestSeq.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(
      () => {
        void loadPage(0, 'replace')
      },
      query ? 180 : 0,
    )
    return () => window.clearTimeout(id)
  }, [open, query, loadOptions, pageSize])

  const displayLabel = selected?.label ?? (value ? value : placeholder)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`body-3 text-muted-foreground hover:text-foreground h-spacing-10 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-3 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        data-dropdown=""
      >
        <span className="text-foreground min-w-0 flex-1 truncate">{displayLabel}</span>
        <ChevronDown className="icon-sm shrink-0 opacity-60" />
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="z-dropdown fixed"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            data-dropdown=""
          >
            <div className="dropdown-menu-solid flex max-h-96 flex-col overflow-hidden">
              <div className="gap-spacing-2 border-border px-spacing-4 py-spacing-3 flex items-center border-b">
                <Search className="icon-sm text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="body-3 placeholder:text-muted-foreground/60 text-foreground min-w-0 flex-1 bg-transparent outline-none"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="icon-sm" />
                  </button>
                ) : null}
              </div>
              <div className="px-spacing-4 py-spacing-3 max-h-80 overflow-y-auto">
                {allowClear ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('', null)
                      setOpen(false)
                    }}
                    className="gap-spacing-2 rounded-spacing-1 body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors"
                  >
                    <span className="min-w-0 flex-1 truncate">{placeholder}</span>
                    {!value && <Check className="icon-sm shrink-0" />}
                  </button>
                ) : null}
                {options.map((option) => {
                  const isSelected = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value, option)
                        setOpen(false)
                      }}
                      className={`gap-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors ${
                        isSelected
                          ? 'bg-hover-subtle text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {option.leading}
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {option.description ? (
                        <span className="typo-caption text-muted-foreground hidden shrink-0 truncate sm:block">
                          {option.description}
                        </span>
                      ) : null}
                      {isSelected && <Check className="icon-sm shrink-0" />}
                    </button>
                  )
                })}
                {!loading && loadedOnce && options.length === 0 ? (
                  <div className="body-3 text-muted-foreground py-spacing-2 text-center">
                    {emptyLabel}
                  </div>
                ) : null}
                {loading ? (
                  <div className="body-3 text-muted-foreground gap-spacing-2 py-spacing-2 flex items-center justify-center">
                    <Loader2 className="icon-sm animate-spin" />
                    Loading
                  </div>
                ) : hasMore ? (
                  <button
                    type="button"
                    onClick={() => void loadPage(options.length, 'append')}
                    className="body-3 text-primary hover:bg-hover-subtle rounded-spacing-1 px-spacing-2 py-spacing-1 w-full text-center transition-colors"
                  >
                    Load more
                  </button>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
