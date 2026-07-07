'use client'

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  REPORTING_DATE_RANGE_PRESETS,
  ViewDateRangeMonthCalendar,
} from '@/components/reporting'
import {
  resolveReportingDates,
  type ReportingDateRangeInput,
  type ReportingTimeRange,
} from '@/lib/reporting'
import { cn } from '@/lib/utils/cn'

const BRAIN_CREATED_AT_DROPDOWN_WIDTH_PX = 540

function startOfLocalCalendarDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function ymdFromLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function brainDateRangeSummary(config: ReportingDateRangeInput): string {
  if (config.custom_start || config.custom_end) {
    const { startDate, endDate } = resolveReportingDates(config)
    const fmt = (iso?: string) =>
      iso
        ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : '…'
    return `${fmt(startDate)} – ${fmt(endDate)}`
  }
  const tr = config.time_range ?? 'all'
  const preset = REPORTING_DATE_RANGE_PRESETS.find((p) => p.key === tr)
  return preset?.label ?? 'All time'
}

type BrainCreatedAtRangeDropdownProps = {
  value: ReportingDateRangeInput
  onPatch: (patch: Partial<ReportingDateRangeInput>) => void
  customTrigger: ReactNode
  /** When provided, an X appears on hover over the trigger to clear the filter without opening. */
  onClear?: () => void
}

export function BrainCreatedAtRangeDropdown({
  value,
  onPatch,
  customTrigger,
  onClear,
}: BrainCreatedAtRangeDropdownProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
  } | null>(null)

  const [dateActiveField, setDateActiveField] = useState<'start' | 'end'>('start')
  const [calMonth, setCalMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )

  const isCustomRange = Boolean(value.custom_start || value.custom_end)

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

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const minSpaceBelow = 320
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < minSpaceBelow + 12
    const maxLeft = window.innerWidth - BRAIN_CREATED_AT_DROPDOWN_WIDTH_PX - 8
    const left = Math.max(8, Math.min(rect.left - 120, maxLeft))
    if (placeAbove) {
      setPos({
        top: null,
        bottom: window.innerHeight - rect.top + 4,
        left,
      })
    } else {
      setPos({ top: rect.bottom + 4, bottom: null, left })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (dropdownRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return
      }
      if (
        target.closest('[data-recurrence-select]') ||
        target.closest('[data-recurrence-clone-options]') ||
        target.closest('[data-time-picker]') ||
        target.closest('[data-select-cell-portal]')
      ) {
        return
      }
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
    if (!open) return
    const seed = effectiveStart ?? effectiveEnd ?? new Date().toISOString().split('T')[0]
    const d = seed ? new Date(`${seed}T12:00:00`) : new Date()
    if (!Number.isNaN(d.getTime())) {
      setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }, [open, effectiveStart, effectiveEnd])

  function handlePresetSelect(key: ReportingTimeRange) {
    onPatch({ time_range: key, custom_start: undefined, custom_end: undefined })
  }

  function handleCalendarSelect(day: Date) {
    const latest = startOfLocalCalendarDay(new Date())
    let picked = startOfLocalCalendarDay(day)
    if (picked.getTime() > latest.getTime()) {
      picked = latest
    }
    const iso = ymdFromLocalDate(picked)
    if (dateActiveField === 'start') {
      onPatch({ custom_start: iso, time_range: undefined })
    } else {
      onPatch({ custom_end: iso, time_range: undefined })
    }
  }

  return (
    <>
      <span className="group/brain-date-trigger relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((prev) => !prev)
          }}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            'flex min-w-0 items-center gap-1.5 text-left transition-colors',
            'w-auto shrink-0',
          )}
        >
          {customTrigger}
        </button>
        {onClear ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onClear()
            }}
            className="surface-bg border-border hover:bg-hover-subtle text-foreground absolute right-0.5 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover/brain-date-trigger:opacity-100"
            title="Clear filter"
            aria-label="Clear filter"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </span>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="z-dropdown fixed flex max-h-[calc(100vh-16px)] min-h-0 max-w-[calc(100vw-16px)] flex-col overflow-hidden"
            data-dropdown
            style={{
              top: pos.top ?? undefined,
              bottom: pos.bottom ?? undefined,
              left: pos.left,
              maxHeight: 'calc(100vh - 16px)',
              width: 'min(540px, calc(100vw - 16px))',
            }}
          >
            <div className="dropdown-menu-solid flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="grid min-h-[340px] flex-1 grid-cols-[200px_minmax(0,1fr)] grid-rows-1 overflow-hidden">
                <div className="border-border flex min-h-0 flex-col overflow-hidden border-r">
                  <div className="py-spacing-1 min-h-0 flex-1 overflow-y-auto">
                    <div className="gap-spacing-2 flex flex-col">
                      {REPORTING_DATE_RANGE_PRESETS.map((preset) => {
                        const active = !isCustomRange && (value.time_range ?? 'all') === preset.key
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
                            <span
                              className={cn(
                                'font-medium',
                                active ? 'text-inherit' : 'text-foreground',
                              )}
                            >
                              {preset.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
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

                  <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                    <ViewDateRangeMonthCalendar
                      month={calMonth}
                      startDate={effectiveStart ?? null}
                      endDate={effectiveEnd ?? null}
                      activeField={dateActiveField}
                      latestSelectableDate={new Date()}
                      onPrevMonth={() =>
                        setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                      }
                      onNextMonth={() =>
                        setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                      }
                      onSelectDate={handleCalendarSelect}
                      onJumpToday={() =>
                        setCalMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
