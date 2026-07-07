'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export interface AutomationCategorizedOption {
  value: string
  label: string
  description?: string
  leading?: ReactNode
}

export interface AutomationCategorizedSection {
  heading: string
  options: AutomationCategorizedOption[]
}

interface AutomationCategorizedSelectProps {
  /** Options shown above category sections (e.g. “Any status”) with no section heading. Included in search. */
  leadingOptions?: AutomationCategorizedOption[]
  /** Sections shown when the search input is empty. */
  sections: AutomationCategorizedSection[]
  /** Optional sections searched across when the user types. Falls back to `sections`. */
  crossScopeSections?: AutomationCategorizedSection[]
  value: string
  onChange: (value: string, option: AutomationCategorizedOption) => void
  placeholder: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function AutomationCategorizedSelect({
  leadingOptions,
  sections,
  crossScopeSections,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Search…',
  className = '',
  disabled = false,
}: AutomationCategorizedSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
    width: number
    maxHeight: number
  } | null>(null)

  const allOptions = useMemo(() => {
    const out: AutomationCategorizedOption[] = [...(leadingOptions ?? [])]
    for (const section of sections) out.push(...section.options)
    if (crossScopeSections) {
      for (const section of crossScopeSections) out.push(...section.options)
    }
    return out
  }, [leadingOptions, sections, crossScopeSections])

  const selected = allOptions.find((o) => o.value === value) ?? null

  const visibleLeadingOptions = useMemo(() => {
    const opts = leadingOptions ?? []
    const q = query.trim().toLowerCase()
    if (!q) return opts
    return opts.filter((opt) => {
      const label = opt.label.toLowerCase()
      const desc = opt.description?.toLowerCase() ?? ''
      return label.includes(q) || desc.includes(q)
    })
  }, [leadingOptions, query])

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sections
    const source =
      crossScopeSections && crossScopeSections.length > 0 ? crossScopeSections : sections
    return source
      .map((section) => ({
        heading: section.heading,
        options: section.options.filter((opt) => {
          const label = opt.label.toLowerCase()
          const desc = opt.description?.toLowerCase() ?? ''
          return label.includes(q) || desc.includes(q)
        }),
      }))
      .filter((section) => section.options.length > 0)
  }, [sections, crossScopeSections, query])

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current
    const panel = menuRef.current
    if (!open || !trigger) return
    const rect = trigger.getBoundingClientRect()
    const pad = 8
    // First pass before mount has no panel — fall back to the CSS cap (max-h-96 = 384px).
    const measured = panel?.offsetHeight ?? 384
    const menuH = Math.min(measured, window.innerHeight - pad * 2)
    const spaceBelow = window.innerHeight - rect.bottom - pad
    const spaceAbove = rect.top - pad

    let placeAbove = false
    if (menuH <= spaceBelow) placeAbove = false
    else if (menuH <= spaceAbove) placeAbove = true
    else placeAbove = spaceAbove >= spaceBelow

    const slot = placeAbove ? spaceAbove : spaceBelow
    const maxHeight = Math.max(160, Math.min(menuH, slot - 4))

    const width = Math.max(rect.width, 280)
    const maxLeft = window.innerWidth - width - pad
    const left = Math.max(pad, Math.min(rect.left, maxLeft))

    if (placeAbove) {
      setPos({
        top: null,
        bottom: window.innerHeight - rect.top + 4,
        left,
        width,
        maxHeight,
      })
    } else {
      setPos({
        top: rect.bottom + 4,
        bottom: null,
        left,
        width,
        maxHeight,
      })
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    positionMenu()
    // Re-measure once the portal has mounted so `panel.offsetHeight` is accurate.
    const id = requestAnimationFrame(() => positionMenu())
    return () => cancelAnimationFrame(id)
  }, [open, positionMenu, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
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
    window.addEventListener('scroll', positionMenu, true)
    window.addEventListener('resize', positionMenu)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', positionMenu, true)
      window.removeEventListener('resize', positionMenu)
    }
  }, [open, positionMenu])

  function pick(option: AutomationCategorizedOption) {
    onChange(option.value, option)
    setOpen(false)
    setQuery('')
  }

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
        <span className="gap-spacing-2 flex min-w-0 flex-1 items-center">
          {selected?.leading}
          <span className={`truncate ${selected ? 'text-foreground' : ''}`}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown className="icon-sm shrink-0 opacity-60" />
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="z-dropdown fixed"
            style={{
              top: pos.top ?? undefined,
              bottom: pos.bottom ?? undefined,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
            data-dropdown=""
          >
            <div
              className="dropdown-menu-solid flex flex-col overflow-hidden"
              style={{ maxHeight: pos.maxHeight }}
            >
              <div className="gap-spacing-2 border-border px-spacing-4 py-spacing-3 flex shrink-0 items-center border-b">
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
              <div className="px-spacing-4 py-spacing-3 min-h-0 flex-1 overflow-y-auto">
                {visibleLeadingOptions.length === 0 && visibleSections.length === 0 ? (
                  <div className="body-3 text-muted-foreground py-spacing-2 text-center">
                    No matches
                  </div>
                ) : (
                  <>
                    {visibleLeadingOptions.length > 0 && (
                      <div>
                        {visibleLeadingOptions.map((option) => {
                          const isSel = option.value === value
                          return (
                            <button
                              key={option.value === '' ? '__leading_empty' : option.value}
                              type="button"
                              onClick={() => pick(option)}
                              className={`gap-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors ${
                                isSel
                                  ? 'bg-hover-subtle text-foreground'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {option.leading}
                              <span className="min-w-0 flex-1 truncate">{option.label}</span>
                              {option.description && (
                                <span className="typo-caption text-muted-foreground hidden shrink-0 truncate sm:block">
                                  {option.description}
                                </span>
                              )}
                              {isSel && <Check className="icon-sm shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {visibleSections.map((section, sIdx) => (
                      <div
                        key={`${section.heading}-${sIdx}`}
                        className={
                          sIdx > 0 || visibleLeadingOptions.length > 0
                            ? 'border-border mt-spacing-3 pt-spacing-3 border-t'
                            : ''
                        }
                      >
                        <div className="typo-caption text-muted-foreground mb-spacing-2 font-semibold">
                          {section.heading}
                        </div>
                        {section.options.map((option) => {
                          const isSel = option.value === value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => pick(option)}
                              className={`gap-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors ${
                                isSel
                                  ? 'bg-hover-subtle text-foreground'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {option.leading}
                              <span className="min-w-0 flex-1 truncate">{option.label}</span>
                              {option.description && (
                                <span className="typo-caption text-muted-foreground hidden shrink-0 truncate sm:block">
                                  {option.description}
                                </span>
                              )}
                              {isSel && <Check className="icon-sm shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
