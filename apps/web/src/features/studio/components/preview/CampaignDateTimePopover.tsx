'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Calendar } from 'lucide-react'

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
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDisplay(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mon = (MONTHS[d.getMonth()] ?? '').slice(0, 3)
  const day = d.getDate()
  const year = d.getFullYear()
  const h = d.getHours()
  const m = d.getMinutes()
  const am = h < 12
  const h12 = h % 12 || 12
  const min = String(m).padStart(2, '0')
  return `${mon} ${day}, ${year}, ${h12}:${min} ${am ? 'AM' : 'PM'}`
}

function getDaysForMonth(
  year: number,
  month: number,
): { date: Date; isCurrent: boolean; isToday: boolean }[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const daysInMonth = last.getDate()
  const result: { date: Date; isCurrent: boolean; isToday: boolean }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(prevYear, prevMonth, prevLast - i)
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

export interface CampaignDateTimePopoverProps {
  value: string | null
  onChange: (iso: string | null) => void
  label: string
  disabled?: boolean
  placeholder?: string
  /** Timezone label to show below the time (e.g. from Meta ad account). If not set, shows browser timezone. */
  timezoneLabel?: string | null
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES = Array.from({ length: 60 }, (_, i) => i) // 0, 1, 2, ... 59

function getBrowserTimezoneLabel(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz.replace(/_/g, ' ')
  } catch {
    return ''
  }
}

export function CampaignDateTimePopover({
  value,
  onChange,
  label,
  disabled = false,
  placeholder = 'Select date and time',
  timezoneLabel,
}: CampaignDateTimePopoverProps) {
  const [open, setOpen] = useState(false)
  const initial = value ? new Date(value) : new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const hour24 = initial.getHours()
  const [hour12, setHour12] = useState(hour24 % 12 || 12)
  const [minute, setMinute] = useState(initial.getMinutes())
  const [amPm, setAmPm] = useState<'AM' | 'PM'>(hour24 < 12 ? 'AM' : 'PM')
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null)
  const contentRef = useRef<HTMLDivElement>(null)
  const displayTz = timezoneLabel ?? getBrowserTimezoneLabel()

  const syncFromValue = useCallback((iso: string | null) => {
    const now = new Date()
    if (!iso) {
      setViewYear(now.getFullYear())
      setViewMonth(now.getMonth())
      const h = now.getHours()
      setHour12(h % 12 || 12)
      setMinute(now.getMinutes())
      setAmPm(h < 12 ? 'AM' : 'PM')
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      setSelectedDate(today)
      return
    }
    const d = new Date(iso)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    const h = d.getHours()
    setHour12(h % 12 || 12)
    setMinute(d.getMinutes())
    setAmPm(h < 12 ? 'AM' : 'PM')
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    setSelectedDate(day)
  }, [])

  const hour24FromState = amPm === 'AM' ? hour12 % 12 : (hour12 % 12) + 12

  useEffect(() => {
    syncFromValue(value)
  }, [value, syncFromValue])

  useEffect(() => {
    if (open) syncFromValue(value)
  }, [open, syncFromValue, value])

  const handleDayClick = useCallback(
    (d: Date) => {
      setSelectedDate(d)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
      const out = new Date(d)
      out.setHours(hour24FromState, minute, 0, 0)
      onChange(out.toISOString())
    },
    [hour24FromState, minute, onChange],
  )

  const handleApply = useCallback(() => {
    if (selectedDate) {
      const out = new Date(selectedDate)
      out.setHours(hour24FromState, minute, 0, 0)
      onChange(out.toISOString())
    }
    setOpen(false)
  }, [selectedDate, hour24FromState, minute, onChange])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  const days = getDaysForMonth(viewYear, viewMonth)
  const display = value ? formatDisplay(value) : ''

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          className="input-glass body-3 text-foreground flex w-full cursor-pointer items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className={display ? 'text-foreground' : 'text-muted-foreground'}>
            {display || placeholder}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          sideOffset={6}
          align="start"
          className="z-dropdown rounded-spacing-2 border-border bg-card p-spacing-3 w-[280px] border shadow-lg outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="body-3 text-foreground font-medium">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {DOW.map((d) => (
                <span key={d} className="body-3 text-muted-foreground py-1 text-xs">
                  {d}
                </span>
              ))}
              {days.map(({ date, isCurrent, isToday }, i) => {
                const selected =
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear()
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDayClick(date)}
                    className={`body-3 rounded p-1.5 transition-colors ${
                      !isCurrent ? 'text-muted-foreground/60' : ''
                    } ${selected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'} ${
                      isToday && !selected ? 'ring-primary ring-1' : ''
                    }`}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <div className="border-border space-y-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <span className="body-3 text-muted-foreground shrink-0">Time</span>
                <select
                  value={hour12}
                  onChange={(e) => setHour12(Number(e.target.value))}
                  aria-label="Hour"
                  className="input-glass body-3 rounded-spacing-2 w-14 cursor-pointer px-2 py-1.5 text-center"
                >
                  {HOURS_12.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">:</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  aria-label="Minute"
                  className="input-glass body-3 rounded-spacing-2 w-16 cursor-pointer px-2 py-1.5 text-center"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  value={amPm}
                  onChange={(e) => setAmPm(e.target.value as 'AM' | 'PM')}
                  aria-label="AM/PM"
                  className="input-glass body-3 rounded-spacing-2 w-14 cursor-pointer px-2 py-1.5 text-center"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
                <button
                  type="button"
                  onClick={handleApply}
                  className="button-glass-primary body-3 rounded-spacing-2 ml-auto px-3 py-1.5 font-medium"
                >
                  Apply
                </button>
              </div>
              {displayTz && (
                <p className="typo-caption text-muted-foreground">
                  {timezoneLabel ? `Ad account: ${timezoneLabel}` : `Times in ${displayTz}`}
                </p>
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
