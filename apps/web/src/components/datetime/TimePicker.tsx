'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface TimePickerProps {
  /** "HH:MM" 24h. `null` = no time set. */
  value: string | null
  onChange: (next: string | null) => void
  /** Minutes between options. Default 15. */
  step?: number
  placeholder?: string
  disabled?: boolean
  /** When omitted, a default chip-style trigger is rendered. */
  customTrigger?: ReactNode
  align?: 'start' | 'end'
  /** When true, hide the inline clear (X) button on the trigger. */
  hideClear?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function buildOptions(step: number): string[] {
  const minutes: string[] = []
  for (const hour of HOURS) {
    for (let m = 0; m < 60; m += step) {
      minutes.push(`${pad(hour)}:${pad(m)}`)
    }
  }
  return minutes
}

export function TimePicker({
  value,
  onChange,
  step = 15,
  placeholder = 'Add time',
  disabled = false,
  customTrigger,
  align = 'start',
  hideClear = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
  } | null>(null)

  const options = useMemo(() => buildOptions(step), [step])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownWidth = 132
    const dropdownHeight = 280
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < dropdownHeight + 12
    const maxLeft = window.innerWidth - dropdownWidth - 8
    const baseLeft = align === 'end' ? rect.right - dropdownWidth : rect.left
    const left = Math.max(8, Math.min(baseLeft, maxLeft))
    if (placeAbove) {
      setPos({ top: null, bottom: window.innerHeight - rect.top + 4, left })
    } else {
      setPos({ top: rect.bottom + 4, bottom: null, left })
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (dropdownRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => {
    if (!open || !dropdownRef.current) return
    const target = dropdownRef.current.querySelector<HTMLButtonElement>(
      '[data-time-picker-current="true"]',
    )
    if (target) target.scrollIntoView({ block: 'center' })
  }, [open, value])

  function handlePick(option: string) {
    onChange(option)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
  }

  const triggerLabel = value ?? placeholder
  const triggerHasValue = Boolean(value)

  const triggerNode = customTrigger ?? (
    <span className="flex min-w-0 items-center gap-1.5">
      <Clock
        className={cn(
          'icon-sm shrink-0',
          triggerHasValue ? 'text-foreground' : 'text-muted-foreground',
        )}
        aria-hidden
      />
      <span
        className={cn(
          'body-3 truncate',
          triggerHasValue ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {triggerLabel}
      </span>
      {triggerHasValue && !hideClear ? (
        <span
          role="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground ml-spacing-1 inline-flex items-center justify-center rounded p-0.5 transition-colors"
          aria-label="Clear time"
        >
          <X className="icon-sm" />
        </span>
      ) : null}
    </span>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (disabled) return
          setOpen((prev) => !prev)
        }}
        className={cn(
          'h-spacing-8 px-spacing-2 rounded-spacing-2 surface-bg border-border body-3 inline-flex items-center gap-1.5 border transition-colors',
          'hover:bg-hover-subtle text-foreground',
          disabled && 'opacity-50',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {triggerNode}
      </button>
      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={dropdownRef}
              className="dropdown-menu-solid border-border py-spacing-1 pointer-events-auto fixed flex max-h-[280px] w-[132px] flex-col overflow-y-auto rounded-xl border shadow-lg"
              data-dropdown
              data-time-picker="true"
              style={{
                top: pos.top ?? undefined,
                bottom: pos.bottom ?? undefined,
                left: pos.left,
                zIndex: 100001,
                overscrollBehavior: 'contain',
              }}
              role="listbox"
              onWheel={(event) => {
                event.currentTarget.scrollTop += event.deltaY
                event.stopPropagation()
              }}
              onTouchMove={(event) => {
                event.stopPropagation()
              }}
            >
              {options.map((option) => {
                const isCurrent = option === value
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    data-time-picker-current={isCurrent ? 'true' : undefined}
                    onClick={() => handlePick(option)}
                    className={cn(
                      'px-spacing-3 py-spacing-1 body-3 text-left transition-colors',
                      isCurrent
                        ? 'bg-hover-subtle text-foreground'
                        : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
