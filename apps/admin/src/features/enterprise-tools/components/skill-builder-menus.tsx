'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type AppMenuOption = {
  id: string
  label: string
}

type AppSelectMenuProps = {
  ariaLabel: string
  value: string
  options: AppMenuOption[]
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
  align?: 'left' | 'right'
  minWidthClass?: string
}

export function AppSelectMenu({
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select…',
  align = 'left',
  minWidthClass = 'min-w-full',
}: AppSelectMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedLabel = options.find((o) => o.id === value)?.label

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="input-glass body-2 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 hover:bg-hover-subtle flex w-full items-center justify-between text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={`icon-xs text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {isOpen ? (
        <div
          className={`z-dropdown mt-spacing-1 absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} ${minWidthClass}`}
          data-dropdown
        >
          <div className="dropdown-menu-solid p-spacing-2 max-h-64 w-full overflow-y-auto">
            <div className="space-y-spacing-1" role="listbox">
              {options.map((option) => {
                const isSelected = value === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
                      isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => {
                      onChange(option.id)
                      setIsOpen(false)
                    }}
                  >
                    {isSelected ? (
                      <Check className="icon-sm text-primary shrink-0" aria-hidden />
                    ) : (
                      <span className="icon-sm shrink-0" aria-hidden />
                    )}
                    <span className="truncate">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type ClientSearchFieldProps = {
  value: string
  loading: boolean
  open: boolean
  options: AppMenuOption[]
  onQueryChange: (query: string) => void
  onOpenChange: (open: boolean) => void
  onSelect: (id: string) => void
}

export function ClientSearchField({
  value,
  loading,
  open,
  options,
  onQueryChange,
  onOpenChange,
  onSelect,
}: ClientSearchFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onOpenChange])

  const showPanel = open && (loading || options.length > 0 || value.trim().length > 0)

  return (
    <div className="relative w-full" ref={rootRef}>
      <input
        className="input-glass body-2 rounded-spacing-2 px-spacing-3 py-spacing-2 w-full"
        placeholder="Search client by email or name"
        value={value}
        onChange={(e) => {
          onQueryChange(e.target.value)
          onOpenChange(true)
        }}
        onFocus={() => onOpenChange(true)}
      />
      {showPanel ? (
        <div className="z-dropdown mt-spacing-1 absolute left-0 right-0 top-full" data-dropdown>
          <div className="dropdown-menu-solid p-spacing-2 max-h-56 w-full overflow-y-auto">
            {loading ? (
              <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-1">Searching…</p>
            ) : options.length === 0 ? (
              <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-1">No clients found</p>
            ) : (
              <div className="space-y-spacing-1" role="listbox">
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    className="hover:bg-hover-subtle text-foreground px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 w-full text-left"
                    onClick={() => onSelect(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
