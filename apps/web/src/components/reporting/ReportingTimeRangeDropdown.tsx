'use client'

import type { RefObject } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type {
  ReportingDateRangeInput,
  ReportingTimeRange,
} from '@/lib/reporting/resolve-reporting-dates'
import {
  CAL_DAYS,
  getMonthGrid,
  isSameDay,
  parseIso,
  TIME_RANGE_PRESETS_CALENDAR,
  TIME_RANGE_PRESETS_DURATION,
  toMidnight,
} from './reporting-time-range-selector-utils'

type ReportingDateActiveField = 'start' | 'end'

interface ReportingTimeRangeDropdownProps {
  dropdownRef: RefObject<HTMLDivElement | null>
  position: { top: number | null; bottom: number | null; left: number }
  config: ReportingDateRangeInput
  isCustomRange: boolean
  effectiveStart: string | undefined
  effectiveEnd: string | undefined
  startLabel: string | null
  endLabel: string | null
  dateActiveField: ReportingDateActiveField
  onDateActiveFieldChange: (field: ReportingDateActiveField) => void
  calMonth: Date
  onCalMonthChange: (month: Date | ((prev: Date) => Date)) => void
  onPresetSelect: (key: ReportingTimeRange) => void
  onCalendarSelect: (day: Date) => void
  onConfigPatch: (patch: Partial<ReportingDateRangeInput>) => void
}

function PresetButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'body-4 text-muted-foreground hover:bg-hover-subtle hover:text-foreground mx-spacing-1 rounded-spacing-1 px-spacing-2 py-spacing-1 flex cursor-pointer items-center justify-between text-left transition-colors',
        active && 'bg-primary/10',
      )}
    >
      <span className="text-foreground font-medium">{label}</span>
    </button>
  )
}

export function ReportingTimeRangeDropdown({
  dropdownRef,
  position,
  config,
  isCustomRange,
  effectiveStart,
  effectiveEnd,
  startLabel,
  endLabel,
  dateActiveField,
  onDateActiveFieldChange,
  calMonth,
  onCalMonthChange,
  onPresetSelect,
  onCalendarSelect,
  onConfigPatch,
}: ReportingTimeRangeDropdownProps) {
  const sd = parseIso(effectiveStart)
  const ed = parseIso(effectiveEnd)
  const cells = getMonthGrid(calMonth)
  const now = new Date()
  const hasRange = sd != null && ed != null
  const startTs = sd ? toMidnight(sd) : null
  const endTs = ed ? toMidnight(ed) : null

  return (
    <div
      ref={dropdownRef}
      data-reporting-time-dropdown
      className="z-dropdown fixed flex max-h-[calc(100vh-16px)] min-h-0 w-[460px] cursor-default flex-col overflow-hidden"
      style={{
        top: position.top ?? undefined,
        bottom: position.bottom ?? undefined,
        left: position.left,
        pointerEvents: 'auto',
      }}
    >
      <div className="dropdown-menu-solid flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 border-b">
          <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
            <span className="typo-caption text-muted-foreground font-medium uppercase tracking-wider">
              Start
            </span>
            <div
              className={cn(
                'body-3 h-spacing-8 rounded-spacing-2 surface-bg flex min-w-0 items-stretch gap-0.5 border transition-colors',
                dateActiveField === 'start' ? 'due-date-field-active' : 'border-border',
              )}
            >
              <button
                type="button"
                onClick={() => onDateActiveFieldChange('start')}
                className={cn(
                  'px-spacing-2 min-w-0 flex-1 cursor-pointer truncate text-left',
                  startLabel ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {startLabel ?? '—'}
              </button>
              {config.custom_start ? (
                <button
                  type="button"
                  className="border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-r-spacing-2 px-spacing-1 flex shrink-0 cursor-pointer items-center justify-center border-l transition-colors"
                  onClick={() => onConfigPatch({ custom_start: undefined })}
                >
                  <X className="icon-sm" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
            <span className="typo-caption text-muted-foreground font-medium uppercase tracking-wider">
              End
            </span>
            <div
              className={cn(
                'body-3 h-spacing-8 rounded-spacing-2 surface-bg flex min-w-0 items-stretch gap-0.5 border transition-colors',
                dateActiveField === 'end' ? 'due-date-field-active' : 'border-border',
              )}
            >
              <button
                type="button"
                onClick={() => onDateActiveFieldChange('end')}
                className={cn(
                  'px-spacing-2 min-w-0 flex-1 cursor-pointer truncate text-left',
                  endLabel ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {endLabel ?? '—'}
              </button>
              {config.custom_end ? (
                <button
                  type="button"
                  className="border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-r-spacing-2 px-spacing-1 flex shrink-0 cursor-pointer items-center justify-center border-l transition-colors"
                  onClick={() => onConfigPatch({ custom_end: undefined })}
                >
                  <X className="icon-sm" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-border grid h-spacing-72 flex-1 grid-cols-2 grid-rows-1 overflow-hidden border-t">
          <div className="border-border flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r">
            <div className="py-spacing-1 min-h-0 flex flex-1 flex-col overflow-y-auto">
              {TIME_RANGE_PRESETS_DURATION.map((preset) => (
                <PresetButton
                  key={preset.key}
                  label={preset.label}
                  active={!isCustomRange && (config.time_range ?? '30d') === preset.key}
                  onClick={() => onPresetSelect(preset.key)}
                />
              ))}
              <div
                className="mx-spacing-2 my-spacing-1 border-border shrink-0 border-t"
                role="separator"
              />
              {TIME_RANGE_PRESETS_CALENDAR.map((preset) => (
                <PresetButton
                  key={preset.key}
                  label={preset.label}
                  active={!isCustomRange && (config.time_range ?? '30d') === preset.key}
                  onClick={() => onPresetSelect(preset.key)}
                />
              ))}
            </div>
          </div>

          <div className="p-spacing-2 flex h-full flex-col">
            <div className="mb-spacing-1 px-spacing-1 flex items-center justify-between">
              <div className="body-2 text-foreground font-semibold">
                {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="gap-spacing-1 flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    onCalMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                  }
                  className="body-4 text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 px-spacing-1 p-spacing-0-5 cursor-pointer transition-colors"
                >
                  Today
                </button>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() =>
                      onCalMonthChange((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                    }
                    className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 p-spacing-0-5 cursor-pointer transition-colors"
                  >
                    <ChevronUp className="icon-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onCalMonthChange((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                    }
                    className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 p-spacing-0-5 cursor-pointer transition-colors"
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
                  className="typo-caption text-muted-foreground p-spacing-0-5 text-center font-normal"
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
                  hasRange &&
                  startTs != null &&
                  endTs != null &&
                  cellTs > startTs &&
                  cellTs < endTs
                const isActive = dateActiveField === 'start' ? isStart : isEnd
                const isOther = dateActiveField === 'start' ? isEnd : isStart
                const today = isSameDay(now, cell.date)
                const rangeBg = (inRange || isStart || isEnd) && hasRange
                const roundedL = isStart || (!inRange && !isEnd)
                const roundedR = isEnd || (!inRange && !isStart)

                return (
                  <div
                    key={cell.date.toISOString()}
                    className={cn(
                      'flex justify-center p-spacing-0-5',
                      rangeBg && (inRange ? 'bg-primary/20' : 'bg-primary/10'),
                      rangeBg && roundedL && 'rounded-l-full',
                      rangeBg && roundedR && 'rounded-r-full',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onCalendarSelect(cell.date)}
                      className={cn(
                        'body-4 flex h-spacing-7 aspect-square cursor-pointer items-center justify-center rounded-full transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isOther
                            ? 'ring-primary/60 text-foreground ring-1'
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
        </div>
      </div>
    </div>
  )
}
