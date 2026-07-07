'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { LABEL_CLASS } from '../constants'

interface FormSelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: FormSelectOption[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  formId?: string
  label?: string
  id?: string
}

export function FormSelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  required = false,
  formId,
  label,
  id,
}: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = Math.min(options.length * 40 + 16, 240)
    const placeAbove = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight + 8
    setPos({
      top: placeAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!dropdownRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder

  return (
    <div>
      {label && (
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      {required && formId && (
        <input type="hidden" value={value} required={required} form={formId} />
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="gap-spacing-1 h-spacing-10 px-spacing-3 input-glass rounded-spacing-2 flex w-full items-center justify-between transition-colors"
      >
        <span className={`body-3 truncate ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          className={`icon-sm text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            data-dropdown
            className="rounded-spacing-2 fixed overflow-hidden"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              minWidth: 140,
              zIndex: 99999,
              pointerEvents: 'auto',
            }}
          >
            <div className="dropdown-menu-solid p-spacing-2 max-h-60 overflow-y-auto">
              {options.map((opt) => {
                const isSelected = value === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'dropdown-option-selected'
                        : 'hover:bg-hover-subtle hover:text-foreground text-muted-foreground'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="icon-sm text-foreground ml-spacing-2 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
