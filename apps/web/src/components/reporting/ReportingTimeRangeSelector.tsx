'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  resolveReportingDates,
  type ReportingDateRangeInput,
  type ReportingTimeRange,
} from '@/lib/reporting/resolve-reporting-dates'
import { ReportingTimeRangeDropdown } from './ReportingTimeRangeDropdown'
import {
  fmtDate,
  formatIsoDate,
  TIME_RANGE_PRESETS,
} from './reporting-time-range-selector-utils'
import {
  ReportingTimeRangeTrigger,
  type ReportingTimeRangeSelectorVariant,
} from './ReportingTimeRangeTrigger'

export interface ReportingTimeRangeSelectorProps {
  config: ReportingDateRangeInput
  onConfigPatch: (patch: Partial<ReportingDateRangeInput>) => void
  variant?: ReportingTimeRangeSelectorVariant
}

export function ReportingTimeRangeSelector({
  config,
  onConfigPatch,
  variant = 'chip',
}: ReportingTimeRangeSelectorProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number | null; bottom: number | null; left: number }>({
    top: 0,
    bottom: null,
    left: 0,
  })
  const [dateActiveField, setDateActiveField] = useState<'start' | 'end'>('start')
  const [calMonth, setCalMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )

  const isCustomRange = Boolean(config.custom_start || config.custom_end)

  const { startDate: effectiveStart, endDate: effectiveEnd } = useMemo(
    () => resolveReportingDates(config),
    [config.custom_start, config.custom_end, config.time_range],
  )

  const startLabel = fmtDate(effectiveStart ?? null)
  const endLabel = fmtDate(effectiveEnd ?? new Date().toISOString().split('T')[0])

  const tooltipLabel = useMemo(() => {
    if (isCustomRange) return `${startLabel ?? '—'} → ${endLabel ?? '—'}`
    return (
      TIME_RANGE_PRESETS.find((p) => p.key === (config.time_range ?? '30d'))?.label ??
      'Last 30 days'
    )
  }, [isCustomRange, startLabel, endLabel, config.time_range])

  const badgeLabel = useMemo(() => {
    if (isCustomRange) return `${startLabel ?? '—'} → ${endLabel ?? '—'}`
    const key = config.time_range ?? '30d'
    const map: Partial<Record<ReportingTimeRange, string>> = {
      '24h': '24h',
      '7d': '7 days',
      '15d': '15 days',
      '30d': '30 days',
      '90d': '90 days',
      this_month: 'This month',
      last_month: 'Last month',
      this_quarter: 'This quarter',
      last_quarter: 'Last quarter',
      this_year: 'This year',
      last_year: 'Last year',
      all: 'All time',
    }
    return map[key] ?? key
  }, [isCustomRange, startLabel, endLabel, config.time_range])

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const dropdownWidth = 460
    const dropdownHeight = 380
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < dropdownHeight + 12
    const maxLeft = window.innerWidth - dropdownWidth - 8
    const left = Math.max(8, Math.min(rect.left - 80, maxLeft))
    if (placeAbove) {
      setPos({ top: null, bottom: window.innerHeight - rect.top + 4, left })
    } else {
      setPos({ top: rect.bottom + 4, bottom: null, left })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (dropdownRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handlePresetSelect(key: ReportingTimeRange) {
    onConfigPatch({ time_range: key, custom_start: undefined, custom_end: undefined })
  }

  function handleCalendarSelect(day: Date) {
    const iso = formatIsoDate(day)
    if (dateActiveField === 'start') {
      onConfigPatch({ custom_start: iso, time_range: undefined })
    } else {
      onConfigPatch({ custom_end: iso, time_range: undefined })
    }
  }

  const isAllTime = !isCustomRange && (config.time_range ?? '30d') === 'all'

  return (
    <>
      <ReportingTimeRangeTrigger
        variant={variant}
        tooltipLabel={tooltipLabel}
        badgeLabel={badgeLabel}
        isAllTime={isAllTime}
        open={open}
        buttonRef={btnRef}
        onToggle={() => setOpen((o) => !o)}
        onClearToAll={() =>
          onConfigPatch({ time_range: 'all', custom_start: undefined, custom_end: undefined })
        }
      />
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <ReportingTimeRangeDropdown
            dropdownRef={dropdownRef}
            position={pos}
            config={config}
            isCustomRange={isCustomRange}
            effectiveStart={effectiveStart}
            effectiveEnd={effectiveEnd}
            startLabel={startLabel}
            endLabel={endLabel}
            dateActiveField={dateActiveField}
            onDateActiveFieldChange={setDateActiveField}
            calMonth={calMonth}
            onCalMonthChange={setCalMonth}
            onPresetSelect={handlePresetSelect}
            onCalendarSelect={handleCalendarSelect}
            onConfigPatch={onConfigPatch}
          />,
          document.body,
        )}
    </>
  )
}
