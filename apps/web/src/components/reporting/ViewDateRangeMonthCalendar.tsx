'use client'

import { useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  CAL_DAYS,
  getMonthGrid,
  isSameDay,
  parseIso,
  TIME_RANGE_PRESETS,
  toMidnight,
  type ReportingTimeRangePreset,
} from './reporting-time-range-selector-utils'

export const REPORTING_DATE_RANGE_PRESETS: ReportingTimeRangePreset[] = TIME_RANGE_PRESETS

export type ViewDateRangeMonthCalendarProps = {
  month: Date
  startDate: string | null
  endDate: string | null
  activeField: 'start' | 'end'
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (date: Date) => void
  onJumpToday: () => void
  /** If set, calendar days after this local calendar date are not selectable. */
  latestSelectableDate?: Date
}

export function ViewDateRangeMonthCalendar({
  month,
  startDate,
  endDate,
  activeField,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onJumpToday,
  latestSelectableDate,
}: ViewDateRangeMonthCalendarProps) {
  const cells = useMemo(() => getMonthGrid(month), [month])
  const now = new Date()
  const sd = parseIso(startDate)
  const ed = parseIso(endDate)
  const hasRange = sd != null && ed != null
  const startTs = sd ? toMidnight(sd) : null
  const endTs = ed ? toMidnight(ed) : null
  const latestTs = latestSelectableDate ? toMidnight(latestSelectableDate) : null
  const latestMonthFirst = latestSelectableDate
    ? new Date(latestSelectableDate.getFullYear(), latestSelectableDate.getMonth(), 1).getTime()
    : null
  const nextMonthFirst = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime()
  const disableNextMonth = latestMonthFirst != null && nextMonthFirst > latestMonthFirst

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
            >
              <ChevronUp className="icon-sm" />
            </button>
            <button
              type="button"
              disabled={disableNextMonth}
              onClick={onNextMonth}
              className={cn(
                'rounded-spacing-1 px-0.5 transition-colors',
                disableNextMonth
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
              )}
            >
              <ChevronDown className="icon-sm" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {CAL_DAYS.map((day) => (
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
          const isStart = isSameDay(sd, cell.date)
          const isEnd = isSameDay(ed, cell.date)
          const inRange =
            hasRange && startTs != null && endTs != null && cellTs > startTs && cellTs < endTs
          const isActive = activeField === 'start' ? isStart : isEnd
          const isOther = activeField === 'start' ? isEnd : isStart
          const today = isSameDay(now, cell.date)
          const rangeBg = (inRange || isStart || isEnd) && hasRange
          const roundedL = isStart || (!inRange && !isEnd)
          const roundedR = isEnd || (!inRange && !isStart)
          const isAfterLatest = latestTs != null && cellTs > latestTs

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
                disabled={isAfterLatest}
                onClick={() => onSelectDate(cell.date)}
                className={cn(
                  'body-4 flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                  isAfterLatest && 'text-muted-foreground/25 cursor-not-allowed',
                  !isAfterLatest &&
                    (isActive
                      ? 'bg-primary text-primary-foreground'
                      : isOther
                        ? 'ring-primary/60 text-foreground ring-1'
                        : today
                          ? 'text-foreground hover:bg-hover-subtle font-semibold'
                          : cell.isCurrentMonth
                            ? 'text-foreground hover:bg-hover-subtle'
                            : 'text-muted-foreground/40 hover:bg-hover-subtle'),
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
