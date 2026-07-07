'use client'

import { useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { RecurrenceSpec } from '@/lib/spaces/space-item-types'
import { cn } from '@/lib/utils/cn'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface CalendarCell {
  date: Date
  isCurrentMonth: boolean
}

export interface MonthCalendarProps {
  month: Date
  startDate: Date | null
  endDate: Date | null
  activeField: 'start' | 'due'
  recurrence: RecurrenceSpec | null
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (date: Date) => void
  onJumpToday: () => void
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getMonthGrid(month: Date): CalendarCell[] {
  const start = startOfMonth(month)
  const gridStart = new Date(start)
  gridStart.setDate(1 - start.getDay())
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + i)
    cells.push({
      date,
      isCurrentMonth: date.getMonth() === month.getMonth(),
    })
  }
  return cells
}

function toMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function isSameDay(a: Date | null, b: Date): boolean {
  if (!a) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function addRecurrenceInterval(base: Date, recurrence: RecurrenceSpec): Date {
  const next = new Date(base)
  const rawInterval = Number(recurrence.interval)
  const interval = Number.isFinite(rawInterval) && rawInterval > 0 ? Math.floor(rawInterval) : 1

  if (recurrence.frequency === 'days_after') {
    const rawDaysAfter = Number(recurrence.days_after_count)
    const daysAfter =
      Number.isFinite(rawDaysAfter) && rawDaysAfter > 0 ? Math.floor(rawDaysAfter) : 1
    next.setDate(next.getDate() + daysAfter)
    return next
  }

  if (recurrence.frequency === 'custom') {
    const unit = recurrence.custom_unit ?? 'week'
    switch (unit) {
      case 'day':
        next.setDate(next.getDate() + interval)
        return next
      case 'week':
        next.setDate(next.getDate() + interval * 7)
        return next
      case 'month':
        next.setMonth(next.getMonth() + interval)
        return next
      case 'year':
        next.setFullYear(next.getFullYear() + interval)
        return next
      default:
        return next
    }
  }

  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      return next
    case 'weekly':
      next.setDate(next.getDate() + interval * 7)
      return next
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      return next
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      return next
    default:
      return next
  }
}

function getRecurrenceDayKeys(
  recurrence: RecurrenceSpec | null,
  anchor: Date | null,
  gridStart: Date,
  gridEnd: Date,
): Set<string> {
  const keys = new Set<string>()
  if (!recurrence || !anchor) return keys

  const endTs = gridEnd.getTime()
  let cur = new Date(anchor)
  for (let i = 0; i < 60; i++) {
    cur = addRecurrenceInterval(cur, recurrence)
    if (cur.getTime() > endTs) break
    if (cur.getTime() >= gridStart.getTime()) {
      keys.add(`${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`)
    }
  }
  return keys
}

export function MonthCalendar({
  month,
  startDate,
  endDate,
  activeField,
  recurrence,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onJumpToday,
}: MonthCalendarProps) {
  const cells = getMonthGrid(month)
  const now = new Date()

  const gridStart = cells[0]!.date
  const gridEnd = cells[cells.length - 1]!.date

  const recurrenceAnchor = endDate ?? startDate
  const recurrenceKeys = useMemo(
    () => getRecurrenceDayKeys(recurrence, recurrenceAnchor, gridStart, gridEnd),
    [recurrence, recurrenceAnchor, gridStart, gridEnd],
  )

  const hasRange = startDate != null && endDate != null
  const startTs = startDate ? toMidnight(startDate) : null
  const endTs = endDate ? toMidnight(endDate) : null

  return (
    <div className="p-spacing-2 flex h-full flex-col">
      <div className="mb-spacing-1 px-spacing-1 flex items-center justify-between">
        <div className="body-2 text-foreground font-semibold">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <div className="gap-spacing-1 flex items-center">
          <button
            type="button"
            onClick={onJumpToday}
            className="body-4 text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 px-spacing-1-5 py-0.5 transition-colors"
          >
            Today
          </button>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={onPrevMonth}
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 px-0.5 transition-colors"
              aria-label="Previous month"
            >
              <ChevronUp className="icon-sm" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 px-0.5 transition-colors"
              aria-label="Next month"
            >
              <ChevronDown className="icon-sm" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {DAYS.map((day) => (
          <div
            key={day}
            className="typo-caption text-muted-foreground py-0.5 text-center font-normal"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const cellTs = toMidnight(cell.date)
          const isStart = isSameDay(startDate, cell.date)
          const isEnd = isSameDay(endDate, cell.date)
          const inRange =
            hasRange && startTs != null && endTs != null && cellTs > startTs && cellTs < endTs
          const isActive = activeField === 'start' ? isStart : isEnd
          const isOther = activeField === 'start' ? isEnd : isStart
          const today = isSameDay(now, cell.date)
          const dayKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`
          const isRecurrence = recurrenceKeys.has(dayKey) && !isStart && !isEnd

          const rangeBg = (inRange || isStart || isEnd) && hasRange
          const roundedL = isStart || (!inRange && !isEnd)
          const roundedR = isEnd || (!inRange && !isStart)

          return (
            <div
              key={cell.date.toISOString()}
              className={cn(
                'flex justify-center py-0.5',
                rangeBg && (inRange ? 'bg-primary/20' : 'bg-primary/12'),
                rangeBg && roundedL && 'rounded-l-full',
                rangeBg && roundedR && 'rounded-r-full',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(cell.date)}
                className={cn(
                  'body-4 flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isOther
                      ? 'ring-primary/60 text-foreground ring-1'
                      : isRecurrence
                        ? 'bg-primary/20 text-foreground'
                        : today
                          ? 'text-foreground hover:bg-hover-subtle font-semibold'
                          : cell.isCurrentMonth
                            ? 'text-foreground hover:bg-hover-subtle'
                            : 'text-muted-foreground/40 hover:bg-hover-subtle',
                )}
              >
                {cell.date.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
