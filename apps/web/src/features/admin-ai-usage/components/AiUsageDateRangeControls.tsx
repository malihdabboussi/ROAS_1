'use client'

import { useEffect, useState } from 'react'
import { ADMIN_AI_USAGE_MESSAGES } from '../config/messages.config'
import type { AiUsageRange } from '../types/admin-ai-usage.types'

type Preset = 1 | 7 | 30

function isValidRange(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return false
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1 <= 366
}

export function AiUsageDateRangeControls({
  value,
  displayedRange,
  onChange,
}: {
  value: AiUsageRange
  displayedRange?: { startDate: string; endDate: string }
  onChange: (range: AiUsageRange) => void
}) {
  const [customOpen, setCustomOpen] = useState(Boolean(value.startDate && value.endDate))
  const [startDate, setStartDate] = useState(value.startDate ?? displayedRange?.startDate ?? '')
  const [endDate, setEndDate] = useState(value.endDate ?? displayedRange?.endDate ?? '')
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (!customOpen || value.startDate) return
    setStartDate(displayedRange?.startDate ?? '')
    setEndDate(displayedRange?.endDate ?? '')
  }, [customOpen, displayedRange, value.startDate])

  const selectPreset = (days: Preset) => {
    setCustomOpen(false)
    setShowError(false)
    onChange({ days })
  }

  const apply = () => {
    if (!isValidRange(startDate, endDate)) {
      setShowError(true)
      return
    }
    setShowError(false)
    onChange({ startDate, endDate })
  }

  return (
    <div className="gap-spacing-2 flex flex-col items-stretch">
      <div className="gap-spacing-2 flex flex-wrap items-center">
        <div className="surface-card rounded-spacing-2 border-border p-spacing-1 flex border">
          {([1, 7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => selectPreset(days)}
              className={
                !customOpen && value.days === days
                  ? 'button-compact button-glass-purple'
                  : 'button-compact text-muted-foreground hover:bg-hover-subtle'
              }
            >
              {days} day{days === 1 ? '' : 's'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCustomOpen(true)
              setStartDate(value.startDate ?? displayedRange?.startDate ?? '')
              setEndDate(value.endDate ?? displayedRange?.endDate ?? '')
            }}
            className={
              customOpen
                ? 'button-compact button-glass-purple'
                : 'button-compact text-muted-foreground hover:bg-hover-subtle'
            }
          >
            Custom
          </button>
        </div>
      </div>
      {customOpen ? (
        <div className="surface-card rounded-spacing-2 border-border p-spacing-3 gap-spacing-3 flex flex-col border sm:flex-row sm:items-end">
          <label className="gap-spacing-1 body-4 text-muted-foreground flex flex-1 flex-col">
            Start date
            <input
              aria-label="Start date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              max={endDate || undefined}
              className="input-glass h-spacing-9 px-spacing-3 body-3 text-foreground w-full"
            />
          </label>
          <label className="gap-spacing-1 body-4 text-muted-foreground flex flex-1 flex-col">
            End date
            <input
              aria-label="End date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              min={startDate || undefined}
              className="input-glass h-spacing-9 px-spacing-3 body-3 text-foreground w-full"
            />
          </label>
          <button
            type="button"
            onClick={apply}
            className="button-default button-glass-primary shrink-0"
          >
            Apply
          </button>
        </div>
      ) : null}
      {showError ? (
        <p role="alert" className="body-4 text-destructive">
          {ADMIN_AI_USAGE_MESSAGES.invalidDateRange}
        </p>
      ) : null}
    </div>
  )
}
