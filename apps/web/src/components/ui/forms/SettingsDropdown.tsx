'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'

interface SettingsDropdownProps {
  value: string
  options: { value: string; label: string; description?: string }[]
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  disabled?: boolean
  compactSearch?: boolean
  minWidth?: number
  compact?: boolean
  appearance?: 'studio' | 'spaces'
}

export function SettingsDropdown({
  value,
  options,
  onChange,
  placeholder,
  searchable,
  disabled = false,
  compactSearch = false,
  minWidth,
  compact = false,
  appearance = 'studio',
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const offset = 4
    const viewportMargin = 8
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownHeight = dropdownRef.current?.getBoundingClientRect().height ?? 0
    const spaceBelow = window.innerHeight - rect.bottom - offset
    const openUp =
      dropdownHeight > 0 ? spaceBelow < dropdownHeight + offset : spaceBelow < 120
    const top = openUp
      ? Math.max(viewportMargin, rect.top - (dropdownHeight || 0) - offset)
      : rect.bottom + offset
    setPos({ top, left: rect.left, width: rect.width })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return
    updatePosition()
    const raf = requestAnimationFrame(() => updatePosition())
    return () => cancelAnimationFrame(raf)
  }, [isOpen, updatePosition, options.length, search])

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return
    const scrollParents: Element[] = []
    let el: HTMLElement | null = triggerRef.current.parentElement
    while (el) {
      const { overflowY, overflow } = getComputedStyle(el)
      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflow === 'auto' ||
        overflow === 'scroll'
      ) {
        scrollParents.push(el)
      }
      el = el.parentElement
    }
    const handleScroll = () => updatePosition()
    scrollParents.forEach((parent) =>
      parent.addEventListener('scroll', handleScroll, { passive: true }),
    )
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      scrollParents.forEach((parent) => parent.removeEventListener('scroll', handleScroll))
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen, updatePosition])

  useEffect(() => {
    if (isOpen && searchable) {
      const focusId = setTimeout(() => {
        searchRef.current?.focus()
        requestAnimationFrame(() => updatePosition())
      }, 0)
      const positionId = setTimeout(() => updatePosition(), 100)
      return () => {
        clearTimeout(focusId)
        clearTimeout(positionId)
      }
    }
    if (!isOpen) setSearch('')
    return undefined
  }, [isOpen, searchable, updatePosition])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!dropdownRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selected = options.find((option) => option.value === value)
  const filtered =
    searchable && search
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(search.toLowerCase()) ||
            option.value.toLowerCase().includes(search.toLowerCase()),
        )
      : options

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (disabled) return
          setIsOpen((open) => !open)
        }}
        disabled={disabled}
        className={
          appearance === 'spaces'
            ? `border-border bg-background text-foreground hover:bg-hover-subtle body-3 flex w-full items-center justify-between border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'h-spacing-8 rounded-spacing-2 px-spacing-3 py-0' : 'h-spacing-9 rounded-spacing-2 px-spacing-3'}`
            : `input-glass body-3 flex w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'h-spacing-8 rounded-spacing-2 px-spacing-3 py-0' : 'h-spacing-10 rounded-spacing-2 px-spacing-3'}`
        }
      >
        <span
          className={`min-w-0 truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {selected?.label ?? placeholder ?? 'Select...'}
        </span>
        <ChevronDown
          className={`text-muted-foreground h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid z-dropdown p-spacing-2"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              minWidth: Math.max(pos.width, minWidth ?? 0),
              maxWidth: 480,
            }}
          >
            {searchable && (
              <div className="px-spacing-1 pb-spacing-1">
                <div
                  className={`gap-spacing-2 input-glass rounded-spacing-2 px-spacing-2 flex items-center ${
                    compactSearch ? 'h-spacing-8' : ''
                  }`}
                >
                  <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search..."
                    className={`body-3 text-foreground placeholder:text-muted-foreground w-full bg-transparent outline-none ${
                      compactSearch ? 'py-0.5' : 'py-1'
                    }`}
                  />
                </div>
              </div>
            )}
            <div className="space-y-spacing-1 max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                  No results
                </p>
              ) : (
                filtered.map((option) => {
                  const isSelected = value === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setIsOpen(false)
                      }}
                      className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'dropdown-sort-option-selected text-muted-foreground'
                          : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="typo-caption text-muted-foreground">
                            {option.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="icon-sm text-primary shrink-0" aria-hidden />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
