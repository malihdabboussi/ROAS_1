'use client'

import type { ReactNode } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuChevronDown, LuSearch, LuX } from 'react-icons/lu'

interface SegmentSearchableMultiSelectProps {
  label: string
  icon: ReactNode
  options: { id: string; label: string }[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  placeholder?: string
  emptyMessage?: string
}

export function SegmentSearchableMultiSelect({
  label,
  icon,
  options,
  selectedIds,
  onSelectionChange,
  placeholder = 'Search...',
  emptyMessage = 'No options available',
}: SegmentSearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
    width: number
  }>({ top: 0, bottom: null, left: 0, width: 0 })

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    return options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [options, searchQuery])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (dropdownRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setIsOpen(false)
      setSearchQuery('')
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownMaxH = 260
    const spaceBelow = window.innerHeight - rect.bottom
    if (spaceBelow < dropdownMaxH + 8) {
      setPos({
        top: null,
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
      })
    } else {
      setPos({ top: rect.bottom + 4, bottom: null, left: rect.left, width: rect.width })
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  const toggleOption = (id: string) => {
    const updated = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id]
    onSelectionChange(updated)
  }

  const selectedCount = selectedIds.length

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-spacing-3 py-spacing-2 input-glass rounded-spacing-2 flex w-full items-center justify-between transition-colors"
      >
        <div className="gap-spacing-2 flex items-center">
          <span className="text-muted-foreground">{icon}</span>
          <span className="body-3 text-foreground">{label}</span>
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground px-spacing-2 rounded-full py-0.5 text-xs">
              {selectedCount}
            </span>
          )}
        </div>
        <LuChevronDown
          className={`icon-sm text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            data-segment-filter-dropdown
            className="dropdown-menu-solid overflow-hidden"
            style={{
              position: 'fixed',
              zIndex: 100000,
              top: pos.top ?? undefined,
              bottom: pos.bottom ?? undefined,
              left: pos.left,
              width: pos.width,
              pointerEvents: 'auto',
            }}
          >
            <div className="border-border border-b">
              <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center">
                <LuSearch className="icon-sm text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="body-3 placeholder:text-muted-foreground preview-input flex-1 bg-transparent focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LuX className="icon-xs" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-spacing-1 max-h-48 overflow-y-auto">
              {options.length === 0 ? (
                <p className="body-3 text-muted-foreground py-spacing-4 text-center">
                  {emptyMessage}
                </p>
              ) : filteredOptions.length === 0 ? (
                <p className="body-3 text-muted-foreground py-spacing-4 text-center">
                  No matches found
                </p>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedIds.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 flex w-full cursor-pointer items-center text-left transition-all ${
                        isSelected
                          ? 'dropdown-option-selected'
                          : 'hover:bg-hover-subtle hover:text-foreground'
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                          isSelected ? 'step-circle-completed' : 'step-circle-default'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            viewBox="0 0 20 20"
                            className="tint-green relative z-30 h-2.5 w-2.5"
                            fill="currentColor"
                            aria-hidden="true"
                            style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))' }}
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`body-3 truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {option.label}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {selectedCount > 0 && (
              <div className="border-border px-spacing-3 py-spacing-2 border-t">
                <button
                  type="button"
                  onClick={() => onSelectionChange([])}
                  className="body-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
