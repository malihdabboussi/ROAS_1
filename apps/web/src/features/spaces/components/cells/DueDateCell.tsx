'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Repeat2, X } from 'lucide-react'
import { toast } from 'sonner'
import { TimePicker } from '@/components/datetime/TimePicker'
import { cn } from '@/lib/utils/cn'
import { SPACES_CELL_TOAST_ERRORS } from '../../config/spaces-toast-errors.config'
import type { RecurrenceSpec } from '../../types'
import type { DateDisplayFormat, FieldDef } from '../../types/space-schema'
import { DUE_DATE_PRESETS, getPresetDate, type DueDatePresetKey } from '../../utils/date-presets'
import { DEFAULT_RECURRENCE_SPEC, describeRecurrence } from '../../utils/recurrence'
import { DatePresetList } from './date-picker/DatePresetList'
import { MonthCalendar } from './date-picker/MonthCalendar'

interface DueDateCellValue {
  start_date: string | null
  due_date: string | null
  recurrence: RecurrenceSpec | null
}

interface DueDateCellPatch {
  start_date?: string | null
  due_date?: string | null
  recurrence?: RecurrenceSpec | null
}

interface Props {
  value: DueDateCellValue
  onChange: (patch: DueDateCellPatch) => void | Promise<void>
  customTrigger?: React.ReactNode
  /** When using `customTrigger`, stretch the trigger to fill the flex row (e.g. automations builder). */
  fullWidthCustomTrigger?: boolean
  initialActiveField?: 'start' | 'due'
  fieldRowVariant?: 'default' | 'kanban'
  statusField?: FieldDef
  onEditStatuses?: () => void
  /** Bulk custom-field sub-panel: open the date popover on mount. */
  openOnMount?: boolean
  bulkInlineEditor?: boolean
  displayFormat?: DateDisplayFormat
  triggerField?: 'start' | 'due' | 'range'
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function formatDueLabel(value: string | null): string {
  if (!value) return 'Set date'
  const due = parseDate(value)
  if (!due) return 'Set date'
  const now = new Date()
  const dueMid = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((dueMid.getTime() - nowMid.getTime()) / 86_400_000)
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `${days}d`
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFieldLabel(value: string | null): string | null {
  const date = parseDate(value)
  if (!date) return null
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateTimeLabel(value: string | null): string | null {
  const date = parseDate(value)
  if (!date) return null
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatTimeLabel(value: string | null): string | null {
  const date = parseDate(value)
  if (!date) return null
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatFieldTime(value: string | null): string | null {
  const date = parseDate(value)
  if (!date) return null
  if (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  ) {
    return null
  }
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatCompactTime(value: string | null): string | null {
  const date = parseDate(value)
  if (!date) return null
  if (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  ) {
    return null
  }
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

function sameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatRangeLabel(startValue: string | null, dueValue: string | null): string | null {
  const start = parseDate(startValue)
  const due = parseDate(dueValue)
  if (!start || !due) return null
  const startLabel = formatFieldLabel(startValue)
  const dueLabel = formatFieldLabel(dueValue)
  if (!startLabel || !dueLabel) return null
  if (sameDate(start, due)) {
    const startTime = formatCompactTime(startValue)
    const dueTime = formatCompactTime(dueValue)
    if (startTime && dueTime) return `${startLabel} (${startTime} → ${dueTime})`
    return startLabel
  }
  return `${startLabel} → ${dueLabel}`
}

function formatDateDisplayLabel(
  value: string | null,
  role: 'start' | 'due',
  displayFormat: DateDisplayFormat,
): string | null {
  if (displayFormat === 'date_time') return formatDateTimeLabel(value)
  if (displayFormat === 'date') return formatFieldLabel(value)
  if (displayFormat === 'time') return formatTimeLabel(value)
  return role === 'due' ? formatDueLabel(value) : formatFieldLabel(value)
}

function formatDisplayRangeLabel(
  startValue: string | null,
  dueValue: string | null,
  displayFormat: DateDisplayFormat,
): string | null {
  const start = parseDate(startValue)
  const due = parseDate(dueValue)
  if (!start || !due) return null
  if (displayFormat === 'relative') return formatRangeLabel(startValue, dueValue)

  const startLabel = formatDateDisplayLabel(startValue, 'start', displayFormat)
  const dueLabel = formatDateDisplayLabel(dueValue, 'due', displayFormat)
  if (!startLabel || !dueLabel) return null
  if (sameDate(start, due) && displayFormat === 'date') return startLabel
  return `${startLabel} → ${dueLabel}`
}

/** Urgency colors only apply to deadline-style relative dates — not historic Call Dates. */
function dueDateTriggerColorClass(
  dueValue: string | null,
  displayFormat: DateDisplayFormat,
): string {
  if (displayFormat !== 'relative') return 'text-muted-foreground'
  const due = parseDate(dueValue)
  if (!due) return 'text-muted-foreground'
  const now = new Date()
  const dueMid = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((dueMid.getTime() - nowMid.getTime()) / 86_400_000)
  if (days < 0) return 'text-destructive'
  if (days === 0) return 'text-warning'
  if (days <= 2) return 'text-warning'
  return 'text-muted-foreground'
}

function formatPresetRightLabel(key: DueDatePresetKey, date: Date): string {
  switch (key) {
    case 'today':
    case 'tomorrow':
    case 'this_weekend':
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    case 'later':
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    case 'next_week':
    case 'next_weekend':
    case 'two_weeks':
    case 'four_weeks':
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function toStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function DueDateCell({
  value,
  onChange,
  customTrigger,
  fullWidthCustomTrigger = false,
  initialActiveField = 'due',
  fieldRowVariant = 'default',
  statusField,
  onEditStatuses,
  openOnMount,
  bulkInlineEditor: _bulkInlineEditor,
  displayFormat = 'relative',
  triggerField = 'range',
}: Props) {
  const [open, setOpen] = useState(!!openOnMount)
  const [activeField, setActiveField] = useState<'start' | 'due'>(initialActiveField)
  const [leftMode, setLeftMode] = useState<'presets' | 'recurrence'>('presets')
  const [month, setMonth] = useState(() => toStartOfMonth(new Date()))
  const triggerRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
  } | null>(null)
  const [recurrenceDraft, setRecurrenceDraft] = useState<RecurrenceSpec | null>(null)

  const recurrenceSummary = useMemo(() => describeRecurrence(value.recurrence), [value.recurrence])

  const presetRows = useMemo(() => {
    return DUE_DATE_PRESETS.map((preset) => {
      const date = getPresetDate(preset.key)
      return { ...preset, rightLabel: formatPresetRightLabel(preset.key, date) }
    })
  }, [])

  const startLabel = formatFieldLabel(value.start_date)
  const dueLabel = formatFieldLabel(value.due_date)
  const hasRange = Boolean(value.start_date && value.due_date)
  const rangeText = hasRange
    ? formatDisplayRangeLabel(value.start_date, value.due_date, displayFormat)
    : null
  const startDisplayLabel = formatDateDisplayLabel(value.start_date, 'start', displayFormat)
  const dueDisplayLabel = formatDateDisplayLabel(value.due_date, 'due', displayFormat)
  const isKanban = fieldRowVariant === 'kanban'
  const hasDateContent = Boolean(value.due_date || value.start_date || value.recurrence)
  const showKanbanClear = isKanban && !customTrigger && hasDateContent

  async function clearAllDates() {
    await onChange({ start_date: null, due_date: null, recurrence: null })
    setOpen(false)
  }

  const triggerText =
    triggerField === 'start'
      ? startDisplayLabel
      : triggerField === 'due'
        ? dueDisplayLabel
        : hasRange
          ? rangeText
          : (dueDisplayLabel ?? startDisplayLabel)

  const dateTriggerTitle = triggerText
    ? `${triggerText}${recurrenceSummary ? ` · ${recurrenceSummary}` : ''}`
    : triggerField === 'start'
      ? 'Start date'
      : triggerField === 'due'
        ? 'Due date'
        : 'Dates'

  const defaultTriggerContent = customTrigger ? null : value.recurrence &&
    triggerField !== 'start' ? (
    <>
      <Repeat2 className="h-3.5 w-3.5 shrink-0 text-violet-300" />
      <span className={cn('truncate text-xs text-violet-300', isKanban && 'max-w-[6.5rem]')}>
        {dueDisplayLabel ?? formatDueLabel(value.due_date)}
      </span>
    </>
  ) : triggerField === 'start' && value.start_date ? (
    <>
      <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
      <span
        className={cn('truncate text-xs text-[var(--foreground)]', isKanban && 'max-w-[6.5rem]')}
      >
        {startDisplayLabel ?? formatFieldLabel(value.start_date)}
      </span>
    </>
  ) : triggerField === 'due' && value.due_date ? (
    (() => {
      const colorClass = dueDateTriggerColorClass(value.due_date, displayFormat)
      return (
        <>
          <Calendar className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
          <span className={cn('truncate text-xs', colorClass, isKanban && 'max-w-[6.5rem]')}>
            {dueDisplayLabel ?? formatDueLabel(value.due_date)}
          </span>
        </>
      )
    })()
  ) : hasRange && rangeText && triggerField === 'range' ? (
    <>
      <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden />
      <span
        className={cn(
          'min-w-0 truncate text-xs text-[var(--foreground)]',
          isKanban && 'max-w-[7rem]',
        )}
      >
        {rangeText}
      </span>
    </>
  ) : triggerField === 'start' || triggerField === 'due' ? (
    <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden />
  ) : value.due_date ? (
    (() => {
      const colorClass = dueDateTriggerColorClass(value.due_date, displayFormat)
      return (
        <>
          <Calendar className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
          <span className={cn('truncate text-xs', colorClass, isKanban && 'max-w-[6.5rem]')}>
            {dueDisplayLabel ?? formatDueLabel(value.due_date)}
          </span>
        </>
      )
    })()
  ) : value.start_date ? (
    <>
      <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
      <span
        className={cn('truncate text-xs text-[var(--foreground)]', isKanban && 'max-w-[6.5rem]')}
      >
        {startDisplayLabel ?? formatFieldLabel(value.start_date)}
      </span>
    </>
  ) : (
    <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden />
  )

  const triggerBody = customTrigger ?? defaultTriggerContent

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownWidth = 540
    const minSpaceBelow = 320
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < minSpaceBelow + 12
    const maxLeft = window.innerWidth - dropdownWidth - 8
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
    const seed = parseDate(activeField === 'due' ? value.due_date : value.start_date) ?? new Date()
    setMonth(toStartOfMonth(seed))
  }, [activeField, open, value.due_date, value.start_date])

  useEffect(() => {
    if (open) {
      setLeftMode('presets')
      setRecurrenceDraft(null)
    }
  }, [open])

  async function applyPatch(patch: DueDateCellPatch, closeAfter = true) {
    await onChange(patch)
    if (closeAfter) setOpen(false)
  }

  async function handlePresetSelect(key: DueDatePresetKey) {
    const next = getPresetDate(key).toISOString()
    if (activeField === 'due') {
      await applyPatch({ due_date: next })
    } else {
      await applyPatch({ start_date: next })
    }
  }

  async function handleTimeChange(field: 'start' | 'due', next: string | null) {
    const current = parseDate(field === 'due' ? value.due_date : value.start_date)
    if (!current) return
    const out = new Date(current)
    if (next) {
      const [hRaw, mRaw] = next.split(':')
      const h = Number(hRaw)
      const m = Number(mRaw ?? '0')
      if (Number.isNaN(h) || Number.isNaN(m)) return
      out.setHours(h, m, 0, 0)
    } else {
      out.setHours(0, 0, 0, 0)
    }
    if (field === 'due') {
      await applyPatch({ due_date: out.toISOString() }, false)
    } else {
      await applyPatch({ start_date: out.toISOString() }, false)
    }
  }

  async function handleDateSelect(day: Date) {
    const previous = activeField === 'due' ? parseDate(value.due_date) : parseDate(value.start_date)
    const out = new Date(day)
    if (previous) {
      out.setHours(previous.getHours(), previous.getMinutes(), 0, 0)
    } else {
      out.setHours(activeField === 'due' ? 17 : 9, 0, 0, 0)
    }
    if (activeField === 'due') {
      await applyPatch({ due_date: out.toISOString() }, false)
    } else {
      await applyPatch({ start_date: out.toISOString() }, false)
    }
  }

  async function handleSaveRecurrence(recurrence: RecurrenceSpec) {
    if (!value.due_date) {
      toast.error(SPACES_CELL_TOAST_ERRORS.RECURRING_REQUIRES_DUE_DATE.userMessage)
      return
    }
    await applyPatch({ recurrence }, false)
    setLeftMode('presets')
    setOpen(false)
  }

  return (
    <>
      {showKanbanClear ? (
        <div
          ref={triggerRef as Ref<HTMLDivElement>}
          className="group/datecell flex min-w-0 max-w-full items-center gap-0.5"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setActiveField(initialActiveField)
              setOpen((prev) => !prev)
            }}
            className="flex min-h-0 min-w-0 flex-1 items-center gap-1.5 text-left transition-colors"
            title={dateTriggerTitle}
          >
            {triggerBody}
          </button>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--foreground)] group-hover/datecell:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              void clearAllDates()
            }}
            title="Clear dates"
            aria-label="Clear dates"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          ref={triggerRef as Ref<HTMLButtonElement>}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setActiveField(initialActiveField)
            setOpen((prev) => !prev)
          }}
          className={cn(
            'flex min-w-0 items-center gap-1.5 text-left transition-colors',
            customTrigger
              ? fullWidthCustomTrigger
                ? 'w-full min-w-0'
                : 'w-auto shrink-0'
              : 'max-w-full',
          )}
          title={dateTriggerTitle}
        >
          {triggerBody}
        </button>
      )}

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="z-dropdown fixed flex max-h-[calc(100vh-16px)] min-h-0 w-[540px] flex-col overflow-hidden"
            data-dropdown
            style={{
              top: pos.top ?? undefined,
              bottom: pos.bottom ?? undefined,
              left: pos.left,
              maxHeight: 'calc(100vh - 16px)',
            }}
          >
            <div className="dropdown-menu-solid flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 border-b">
                <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
                  <div className="gap-spacing-1 flex min-w-0 items-stretch">
                    <div
                      className={cn(
                        'body-3 h-spacing-8 rounded-spacing-2 surface-bg flex min-w-0 flex-1 items-stretch gap-0.5 border transition-colors',
                        activeField === 'start' ? 'due-date-field-active' : 'border-border',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveField('start')}
                        className={cn(
                          'gap-spacing-2 px-spacing-2 flex min-w-0 flex-1 items-center truncate text-left',
                          startLabel ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <Calendar className="icon-sm shrink-0" aria-hidden />
                        <span className="truncate">{startLabel ?? 'Start date'}</span>
                      </button>
                      {value.start_date ? (
                        <button
                          type="button"
                          className="border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-r-spacing-2 px-spacing-1-5 flex shrink-0 items-center justify-center border-l transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            void applyPatch({ start_date: null }, false)
                          }}
                          title="Clear start date"
                          aria-label="Clear start date"
                        >
                          <X className="icon-sm" />
                        </button>
                      ) : null}
                    </div>
                    {value.start_date ? (
                      <TimePicker
                        value={formatFieldTime(value.start_date)}
                        onChange={(next) => void handleTimeChange('start', next)}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
                  <div className="gap-spacing-1 flex min-w-0 items-stretch">
                    <div
                      className={cn(
                        'body-3 h-spacing-8 rounded-spacing-2 surface-bg flex min-w-0 flex-1 items-stretch gap-0.5 border transition-colors',
                        activeField === 'due' ? 'due-date-field-active' : 'border-border',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveField('due')}
                        className={cn(
                          'gap-spacing-2 px-spacing-2 flex min-w-0 flex-1 items-center truncate text-left',
                          dueLabel ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <Calendar className="icon-sm shrink-0" aria-hidden />
                        <span className="truncate">{dueLabel ?? 'Due date'}</span>
                      </button>
                      {value.due_date ? (
                        <button
                          type="button"
                          className="border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-r-spacing-2 px-spacing-1-5 flex shrink-0 items-center justify-center border-l transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            void applyPatch(
                              value.recurrence
                                ? { due_date: null, recurrence: null }
                                : { due_date: null },
                              false,
                            )
                          }}
                          title="Clear end date"
                          aria-label="Clear end date"
                        >
                          <X className="icon-sm" />
                        </button>
                      ) : null}
                    </div>
                    {value.due_date ? (
                      <TimePicker
                        value={formatFieldTime(value.due_date)}
                        onChange={(next) => void handleTimeChange('due', next)}
                        align="end"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid min-h-[290px] flex-1 grid-cols-2 grid-rows-1 overflow-hidden">
                <DatePresetList
                  leftMode={leftMode}
                  presets={presetRows}
                  onPresetSelect={(key) => {
                    void handlePresetSelect(key)
                  }}
                  onOpenRecurring={() => {
                    setLeftMode('recurrence')
                    setRecurrenceDraft(value.recurrence ?? DEFAULT_RECURRENCE_SPEC)
                  }}
                  onBackFromRecurring={() => {
                    setLeftMode('presets')
                    setRecurrenceDraft(null)
                  }}
                  recurrenceInitial={value.recurrence ?? DEFAULT_RECURRENCE_SPEC}
                  onSaveRecurrence={(next) => {
                    void handleSaveRecurrence(next)
                  }}
                  statusField={statusField}
                  onEditStatuses={onEditStatuses}
                  onRecurrenceDraftChange={setRecurrenceDraft}
                />

                <MonthCalendar
                  month={month}
                  startDate={parseDate(value.start_date)}
                  endDate={parseDate(value.due_date)}
                  activeField={activeField}
                  recurrence={
                    leftMode === 'recurrence' && recurrenceDraft
                      ? recurrenceDraft
                      : value.recurrence
                  }
                  onPrevMonth={() =>
                    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                  onNextMonth={() =>
                    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                  onSelectDate={(date) => {
                    void handleDateSelect(date)
                  }}
                  onJumpToday={() => setMonth(toStartOfMonth(new Date()))}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
