'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar } from 'lucide-react'
import type { DateDisplayFormat } from '@/lib/spaces'
import type { BaseCellProps } from './cell-types'
import { MonthCalendar } from './date-picker/MonthCalendar'

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatLabel(value: unknown, displayFormat: DateDisplayFormat = 'date'): string | null {
  const d = parseDate(value)
  if (!d) return null
  if (displayFormat === 'date_time') {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  if (displayFormat === 'time') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function DateCell({
  value,
  onChange,
  readonly,
  openOnMount,
  dateDisplayFormat = 'date',
}: BaseCellProps) {
  const [open, setOpen] = useState(!!openOnMount)
  const [month, setMonth] = useState(() => toStartOfMonth(parseDate(value) ?? new Date()))
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const label = formatLabel(value, dateDisplayFormat)
  const selected = parseDate(value)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 280
    const dropH = 300
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < dropH + 8 && rect.top > dropH + 8
    const maxLeft = window.innerWidth - dropW - 8
    setPos({
      top: placeAbove ? rect.top - dropH - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, maxLeft)),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const seed = parseDate(value) ?? new Date()
    setMonth(toStartOfMonth(seed))
  }, [open, value])

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
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleSelect(day: Date) {
    const prev = parseDate(value)
    const out = new Date(day)
    if (prev) out.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
    else out.setHours(12, 0, 0, 0)
    onChange(out.toISOString())
    setOpen(false)
  }

  if (readonly) {
    return label ? (
      <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        <Calendar className="h-3.5 w-3.5" />
        {label}
      </span>
    ) : (
      <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-left"
        title={label ?? 'Set date'}
      >
        <Calendar
          className={`h-3.5 w-3.5 ${label ? 'text-[var(--foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
        />
        {label && <span className="text-xs text-[var(--foreground)]">{label}</span>}
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[99999] overflow-hidden rounded-xl"
            style={{ top: pos.top, left: pos.left, width: 280 }}
          >
            <MonthCalendar
              month={month}
              startDate={selected}
              endDate={null}
              activeField="due"
              recurrence={null}
              onPrevMonth={() => setMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
              onNextMonth={() => setMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
              onSelectDate={handleSelect}
              onJumpToday={() => setMonth(toStartOfMonth(new Date()))}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
