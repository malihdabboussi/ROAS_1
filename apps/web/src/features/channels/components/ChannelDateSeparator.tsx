'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const daysInMonth = last.getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result: { date: Date; isCurrent: boolean; isToday: boolean }[] = []
  const prevLast = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevLast - i)
    d.setHours(0, 0, 0, 0)
    result.push({ date: d, isCurrent: false, isToday: d.getTime() === today.getTime() })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    d.setHours(0, 0, 0, 0)
    result.push({ date: d, isCurrent: true, isToday: d.getTime() === today.getTime() })
  }
  const remaining = 42 - result.length
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day)
    d.setHours(0, 0, 0, 0)
    result.push({ date: d, isCurrent: false, isToday: d.getTime() === today.getTime() })
  }
  return result
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today.getTime() - target.getTime()
  const dayMs = 86_400_000

  if (diff === 0) return 'Today'
  if (diff === dayMs) return 'Yesterday'
  if (diff === -dayMs) return 'Tomorrow'

  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { weekday: 'long', month: 'long', day: 'numeric' }
      : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  return d.toLocaleDateString('en-US', opts)
}

export function groupMessagesByDate<T extends { created_at: string }>(
  messages: T[],
): { dateKey: string; label: string; messages: T[] }[] {
  const groups: { dateKey: string; label: string; messages: T[] }[] = []
  let current: (typeof groups)[number] | null = null

  for (const msg of messages) {
    const dateKey = msg.created_at.slice(0, 10)
    if (!current || current.dateKey !== dateKey) {
      current = { dateKey, label: formatDateLabel(msg.created_at), messages: [] }
      groups.push(current)
    }
    current.messages.push(msg)
  }
  return groups
}

function MiniCalendar({ onPickDate }: { onPickDate: (date: Date) => void }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const days = useMemo(() => getDays(viewYear, viewMonth), [viewYear, viewMonth])

  const prev = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else setViewMonth(viewMonth - 1)
  }
  const next = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else setViewMonth(viewMonth + 1)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={prev}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded p-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-foreground text-xs font-semibold">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={next}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded p-1"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DOW.map((d) => (
          <span key={d} className="text-muted-foreground pb-1 text-center text-[10px] font-medium">
            {d}
          </span>
        ))}
        {days.map(({ date, isCurrent, isToday }, i) => {
          const key = date.toISOString().slice(0, 10)
          const isSelected = selected === key
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelected(key)
                onPickDate(date)
              }}
              className={[
                'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors',
                !isCurrent && 'text-muted-foreground/40',
                isCurrent && !isToday && !isSelected && 'text-foreground hover:bg-hover-subtle',
                isToday && !isSelected && 'text-primary font-semibold',
                isSelected && 'bg-primary text-primary-foreground font-semibold',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ChannelDateSeparator({
  label,
  dateKey,
  onJumpToDate,
}: {
  label: string
  dateKey: string
  onJumpToDate?: (dateKey: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setShowCalendar(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const jumpTo = useCallback(
    (key: string) => {
      onJumpToDate?.(key)
      setOpen(false)
      setShowCalendar(false)
    },
    [onJumpToDate],
  )

  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const lastWeek = new Date(today.getTime() - 7 * 86_400_000).toISOString().slice(0, 10)
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
    .toISOString()
    .slice(0, 10)

  return (
    <div className="relative flex items-center justify-center py-3" data-date-separator={dateKey}>
      <div className="border-border absolute inset-x-0 top-1/2 border-t" />
      <div className="relative z-[1]" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="border-border text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-full border bg-[var(--color-card)] px-3 py-0.5 text-xs font-medium shadow-sm transition-colors"
        >
          {label}
          <ChevronDown className="h-3 w-3" />
        </button>

        {open && (
          <div className="border-border absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-lg border bg-[var(--color-card)] py-1 shadow-xl">
            {!showCalendar ? (
              <>
                <p className="text-muted-foreground px-3 py-1.5 text-[11px] font-medium">
                  Jump to…
                </p>
                <button
                  type="button"
                  onClick={() => jumpTo(todayKey)}
                  className="text-foreground hover:bg-hover-subtle flex w-full items-center px-3 py-2 text-left text-sm transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => jumpTo(lastWeek)}
                  className="text-foreground hover:bg-hover-subtle flex w-full items-center px-3 py-2 text-left text-sm transition-colors"
                >
                  Last week
                </button>
                <button
                  type="button"
                  onClick={() => jumpTo(lastMonth)}
                  className="text-foreground hover:bg-hover-subtle flex w-full items-center px-3 py-2 text-left text-sm transition-colors"
                >
                  Last month
                </button>
                <div className="border-border my-1 border-t" />
                <button
                  type="button"
                  onClick={() => setShowCalendar(true)}
                  className="text-foreground hover:bg-hover-subtle flex w-full items-center px-3 py-2 text-left text-sm transition-colors"
                >
                  Jump to a specific date
                </button>
              </>
            ) : (
              <div className="px-3 py-2">
                <MiniCalendar onPickDate={(d) => jumpTo(d.toISOString().slice(0, 10))} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
