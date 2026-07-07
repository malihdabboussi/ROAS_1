'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, X } from 'lucide-react'
import {
  REPORTING_DATE_RANGE_PRESETS,
  ViewDateRangeMonthCalendar,
} from '@/components/reporting'
import { resolveReportingDates, type ReportingDateRangeInput } from '@/lib/reporting'
import type { ReportingTimeRange } from '@/lib/reporting'
import { cn } from '@/lib/utils/cn'

export { REPORTING_DATE_RANGE_PRESETS, ViewDateRangeMonthCalendar }

export function ViewDateRangeSubView({
  value,
  onPatch,
  onBack,
  onClose,
}: {
  value: ReportingDateRangeInput
  onPatch: (patch: Partial<ReportingDateRangeInput>) => void
  onBack: () => void
  onClose: () => void
}) {
  const [dateActiveField, setDateActiveField] = useState<'start' | 'end'>('start')
  const [calMonth, setCalMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [customOpen, setCustomOpen] = useState(false)

  const isCustomRange = Boolean(value.custom_start || value.custom_end)
  const showCustomBlock = isCustomRange || customOpen

  const { startDate: effectiveStart, endDate: effectiveEnd } = useMemo(
    () => resolveReportingDates(value),
    [value.custom_start, value.custom_end, value.time_range],
  )

  const fmtD = (v: string | undefined) =>
    v
      ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null
  const startLabel = fmtD(effectiveStart)
  const endLabel = fmtD(effectiveEnd) ?? fmtD(new Date().toISOString().split('T')[0])

  function handlePresetSelect(key: ReportingTimeRange) {
    setCustomOpen(false)
    onPatch({ time_range: key, custom_start: undefined, custom_end: undefined })
  }

  function handleCalendarSelect(day: Date) {
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    if (dateActiveField === 'start') {
      onPatch({ custom_start: iso, time_range: undefined })
    } else {
      onPatch({ custom_end: iso, time_range: undefined })
    }
  }

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-[var(--foreground)]">Data range</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-border flex shrink-0 flex-col border-b">
        <div className="py-spacing-2 max-h-[min(280px,45vh)] min-h-0 overflow-y-auto">
          <div className="gap-spacing-2 flex flex-col">
            {REPORTING_DATE_RANGE_PRESETS.map((preset) => {
              const active =
                !isCustomRange && !customOpen && (value.time_range ?? '30d') === preset.key
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePresetSelect(preset.key)}
                  className={cn(
                    'body-4 mx-spacing-1 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-[calc(100%-var(--spacing-2))] items-center justify-between text-left transition-colors',
                    active
                      ? 'chip-glass-blue font-medium'
                      : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                  )}
                >
                  <span className={cn('font-medium', active ? 'text-inherit' : 'text-foreground')}>
                    {preset.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="border-border py-spacing-2 shrink-0 border-t">
          <button
            type="button"
            onClick={() => {
              if (isCustomRange) return
              setCustomOpen((o) => !o)
            }}
            className={cn(
              'body-4 mx-spacing-1 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-[calc(100%-var(--spacing-2))] items-center justify-between text-left transition-colors',
              customOpen || isCustomRange
                ? 'chip-glass-blue font-medium'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'font-medium',
                customOpen || isCustomRange ? 'text-inherit' : 'text-foreground',
              )}
            >
              Custom
            </span>
          </button>
        </div>
      </div>

      {showCustomBlock ? (
        <>
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
                  onClick={() => setDateActiveField('start')}
                  className={cn(
                    'px-spacing-2 min-w-0 flex-1 truncate text-left',
                    startLabel ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {startLabel ?? '—'}
                </button>
                {value.custom_start ? (
                  <button
                    type="button"
                    className="border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-r-spacing-2 px-spacing-1-5 flex shrink-0 items-center justify-center border-l transition-colors"
                    onClick={() => onPatch({ custom_start: undefined })}
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
                  onClick={() => setDateActiveField('end')}
                  className={cn(
                    'px-spacing-2 min-w-0 flex-1 truncate text-left',
                    endLabel ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {endLabel ?? '—'}
                </button>
                {value.custom_end ? (
                  <button
                    type="button"
                    className="border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-r-spacing-2 px-spacing-1-5 flex shrink-0 items-center justify-center border-l transition-colors"
                    onClick={() => onPatch({ custom_end: undefined })}
                  >
                    <X className="icon-sm" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-border min-h-[min(320px,50vh)] min-w-0 flex-1 overflow-y-auto border-b border-t">
            <ViewDateRangeMonthCalendar
              month={calMonth}
              startDate={effectiveStart ?? null}
              endDate={effectiveEnd ?? null}
              activeField={dateActiveField}
              onPrevMonth={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              onNextMonth={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              onSelectDate={handleCalendarSelect}
              onJumpToday={() =>
                setCalMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
              }
            />
          </div>
        </>
      ) : null}
    </motion.div>
  )
}
