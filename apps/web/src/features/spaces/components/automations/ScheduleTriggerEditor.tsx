'use client'

import { useMemo } from 'react'
import cronstrue from 'cronstrue'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import { TimezoneSelect } from '@/components/datetime/TimezoneSelect'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { cn } from '@/lib/utils/cn'
import type { AutomationSchedule, AutomationSchedulePreset } from '../../types/space-schema'
import { previewNextFires, scheduleToCron } from './schedule-cron'

interface ScheduleTriggerEditorProps {
  schedule: AutomationSchedule
  timezone: string
  onChange: (next: { schedule: AutomationSchedule; timezone: string }) => void
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const PRESET_OPTIONS: AutomationSolidOption[] = [
  { value: 'minutes', label: 'By minutes' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const MONTH_OPTIONS: AutomationSolidOption[] = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

function defaultForPreset(preset: AutomationSchedulePreset): AutomationSchedule {
  switch (preset) {
    case 'minutes':
      return { mode: 'preset', preset: 'minutes', interval: 15 }
    case 'hourly':
      return { mode: 'preset', preset: 'hourly', interval: 1 }
    case 'daily':
      return { mode: 'preset', preset: 'daily', interval: 1, time: '09:00' }
    case 'weekly':
      return { mode: 'preset', preset: 'weekly', weekdays: [1], time: '09:00' }
    case 'monthly':
      return { mode: 'preset', preset: 'monthly', day_of_month: 1, time: '09:00' }
    case 'yearly':
      return { mode: 'preset', preset: 'yearly', month: 1, day_of_month: 1, time: '09:00' }
  }
}

function weekdaysFromWeekly(
  s: Pick<Extract<AutomationSchedule, { mode: 'preset' }>, 'weekdays' | 'day_of_week'>,
): number[] {
  if (s.weekdays?.length) return s.weekdays
  if (s.day_of_week !== undefined) return [s.day_of_week]
  return [1]
}

export function ScheduleTriggerEditor({
  schedule,
  timezone,
  onChange,
}: ScheduleTriggerEditorProps) {
  const legacyCron = schedule.mode === 'custom'
  const presetValue = legacyCron ? '' : schedule.preset
  const interval = schedule.mode === 'preset' ? (schedule.interval ?? 1) : 1
  const time = schedule.mode === 'preset' ? (schedule.time ?? '09:00') : '09:00'

  const cron = useMemo(() => {
    try {
      return scheduleToCron(schedule)
    } catch {
      return null
    }
  }, [schedule])

  const humanLabel = useMemo(() => {
    if (!cron) return null
    try {
      return cronstrue.toString(cron, { use24HourTimeFormat: true })
    } catch {
      return null
    }
  }, [cron])

  const nextFires = useMemo(() => previewNextFires(schedule, timezone, 3), [schedule, timezone])

  const handlePresetChange = (next: string) => {
    if (!next.trim()) return
    onChange({
      schedule: defaultForPreset(next as AutomationSchedulePreset),
      timezone,
    })
  }

  const updatePresetField = (patch: Partial<Extract<AutomationSchedule, { mode: 'preset' }>>) => {
    if (schedule.mode !== 'preset') return
    onChange({ schedule: { ...schedule, ...patch }, timezone })
  }

  const showIntervalRow =
    schedule.mode === 'preset' &&
    (schedule.preset === 'minutes' ||
      schedule.preset === 'hourly' ||
      schedule.preset === 'daily' ||
      schedule.preset === 'monthly')

  return (
    <div className="space-y-3">
      <div className="typo-caption text-muted-foreground font-medium">Repeats</div>

      {legacyCron ? (
        <div className="body-3 text-muted-foreground rounded-spacing-2 border-border bg-muted/10 px-spacing-3 py-spacing-2 border">
          {FLOWS_UI.legacySchedule}
          (save to apply).
        </div>
      ) : null}

      <div className="gap-spacing-2 flex flex-wrap items-center">
        <div className="min-w-[160px] flex-1">
          <AutomationSolidSelect
            options={PRESET_OPTIONS}
            value={presetValue}
            onChange={handlePresetChange}
            placeholder={legacyCron ? 'Choose repeat pattern…' : 'Frequency'}
          />
        </div>

        {showIntervalRow && schedule.mode === 'preset' && (
          <div className="gap-spacing-1 flex items-center">
            <span className="typo-caption text-muted-foreground">every</span>
            <input
              type="number"
              min={1}
              max={
                schedule.preset === 'minutes'
                  ? 59
                  : schedule.preset === 'hourly'
                    ? 23
                    : schedule.preset === 'daily'
                      ? 30
                      : 12
              }
              value={interval}
              onChange={(e) =>
                updatePresetField({
                  interval: clampIntervalForPreset(
                    schedule.preset,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                })
              }
              className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-[72px] border outline-none"
            />
            <span className="typo-caption text-muted-foreground">
              {unitForPreset(schedule.preset, interval)}
            </span>
          </div>
        )}
      </div>

      {schedule.mode === 'preset' && schedule.preset === 'weekly' && (
        <div className="space-y-spacing-2">
          <div className="flex gap-0.5">
            {WEEKDAY_LABELS.map((label, idx) => {
              const selectedDays = weekdaysFromWeekly(schedule)
              const selected = selectedDays.includes(idx)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const next = selected
                      ? selectedDays.filter((d) => d !== idx)
                      : [...selectedDays, idx]
                    updatePresetField({
                      weekdays: next.length > 0 ? next : [1],
                      day_of_week: undefined,
                    })
                  }}
                  className={cn(
                    'rounded-spacing-1 body-3 min-w-[30px] border px-1.5 py-1 text-center transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <input
            type="time"
            value={time}
            onChange={(e) => updatePresetField({ time: e.target.value })}
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground border outline-none"
          />
        </div>
      )}

      {schedule.mode === 'preset' && schedule.preset === 'daily' && (
        <input
          type="time"
          value={time}
          onChange={(e) => updatePresetField({ time: e.target.value })}
          className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground border outline-none"
        />
      )}

      {schedule.mode === 'preset' && schedule.preset === 'monthly' && (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <div className="gap-spacing-1 flex items-center">
            <span className="typo-caption text-muted-foreground">on day</span>
            <input
              type="number"
              min={1}
              max={31}
              value={schedule.day_of_month ?? 1}
              onChange={(e) =>
                updatePresetField({
                  day_of_month: Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                })
              }
              className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-[72px] border outline-none"
            />
          </div>
          <input
            type="time"
            value={time}
            onChange={(e) => updatePresetField({ time: e.target.value })}
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground border outline-none"
          />
        </div>
      )}

      {schedule.mode === 'preset' && schedule.preset === 'yearly' && (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <div className="min-w-[140px] flex-1">
            <AutomationSolidSelect
              options={MONTH_OPTIONS}
              value={String(schedule.month ?? 1)}
              onChange={(v) => updatePresetField({ month: Number(v) })}
              placeholder="Month"
            />
          </div>
          <div className="gap-spacing-1 flex items-center">
            <span className="typo-caption text-muted-foreground">day</span>
            <input
              type="number"
              min={1}
              max={31}
              value={schedule.day_of_month ?? 1}
              onChange={(e) =>
                updatePresetField({
                  day_of_month: Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                })
              }
              className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-[72px] border outline-none"
            />
          </div>
          <input
            type="time"
            value={time}
            onChange={(e) => updatePresetField({ time: e.target.value })}
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground border outline-none"
          />
        </div>
      )}

      <div className="space-y-spacing-1">
        <div className="typo-caption text-muted-foreground font-medium">Timezone</div>
        <TimezoneSelect
          value={timezone}
          onChange={(next) => onChange({ schedule, timezone: next })}
        />
      </div>

      <div className="rounded-spacing-2 bg-muted/20 px-spacing-3 py-spacing-2 space-y-spacing-1 border-border border">
        {humanLabel ? (
          <div className="body-3 text-foreground">{humanLabel}</div>
        ) : (
          <div className="body-3 text-destructive">Schedule is invalid</div>
        )}
        {nextFires && nextFires.length > 0 && (
          <div className="typo-caption text-muted-foreground">
            Next: {nextFires.map((d) => formatPreview(d, timezone)).join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}

function clampIntervalForPreset(preset: AutomationSchedulePreset, v: number): number {
  const n = Math.max(1, Math.floor(v) || 1)
  switch (preset) {
    case 'minutes':
      return Math.min(59, n)
    case 'hourly':
      return Math.min(23, n)
    case 'daily':
      return Math.min(30, n)
    case 'monthly':
      return Math.min(12, n)
    default:
      return n
  }
}

function unitForPreset(preset: AutomationSchedulePreset, interval: number): string {
  const plural = interval !== 1
  switch (preset) {
    case 'minutes':
      return plural ? 'minutes' : 'minute'
    case 'hourly':
      return plural ? 'hours' : 'hour'
    case 'daily':
      return plural ? 'days' : 'day'
    case 'weekly':
      return plural ? 'weeks' : 'week'
    case 'monthly':
      return plural ? 'months' : 'month'
    case 'yearly':
      return plural ? 'years' : 'year'
  }
}

function formatPreview(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone || undefined,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return date.toISOString()
  }
}
