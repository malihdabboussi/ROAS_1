'use client'

import { useCallback, useRef, useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import type { DateRangePreset } from '../types/finances.types'

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: 'Last 24h', value: '1' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 14 days', value: '14' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'Custom range', value: 'custom' },
]

interface DateRangePickerProps {
  activeDays: string
  customFrom?: string
  customTo?: string
  onPresetChange: (days: string) => void
  onCustomChange: (from: string, to: string) => void
}

export function DateRangePicker({
  activeDays,
  customFrom,
  customTo,
  onPresetChange,
  onCustomChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(activeDays === 'custom')
  const [localFrom, setLocalFrom] = useState(customFrom ?? '')
  const [localTo, setLocalTo] = useState(customTo ?? '')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const activeLabel =
    PRESETS.find((p) => p.value === activeDays)?.label ?? `Last ${activeDays} days`

  const handleSelect = useCallback(
    (value: DateRangePreset) => {
      if (value === 'custom') {
        setShowCustom(true)
        return
      }
      setShowCustom(false)
      setOpen(false)
      onPresetChange(value)
    },
    [onPresetChange],
  )

  const handleApplyCustom = useCallback(() => {
    if (!localFrom || !localTo) return
    setOpen(false)
    onCustomChange(localFrom, localTo)
  }, [localFrom, localTo, onCustomChange])

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-border bg-card text-foreground body-3 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center border transition-colors hover:bg-white/5"
      >
        <Calendar className="h-3.5 w-3.5 opacity-60" />
        {activeLabel}
        <ChevronDown className="h-3.5 w-3.5 opacity-40" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="border-border bg-card absolute right-0 z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border shadow-lg">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleSelect(p.value)}
                className={`body-3 w-full px-3.5 py-2 text-left transition-colors hover:bg-white/5 ${
                  activeDays === p.value ? 'text-foreground bg-white/5' : 'text-muted-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}

            {showCustom && (
              <div className="border-border space-y-spacing-2 border-t p-3">
                <label className="body-4 text-muted-foreground block">From</label>
                <input
                  type="date"
                  value={localFrom}
                  onChange={(e) => setLocalFrom(e.target.value)}
                  className="border-border bg-background text-foreground body-3 rounded-spacing-2 w-full border px-2 py-1.5"
                />
                <label className="body-4 text-muted-foreground block">To</label>
                <input
                  type="date"
                  value={localTo}
                  onChange={(e) => setLocalTo(e.target.value)}
                  className="border-border bg-background text-foreground body-3 rounded-spacing-2 w-full border px-2 py-1.5"
                />
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  disabled={!localFrom || !localTo}
                  className="body-3 bg-foreground text-background rounded-spacing-2 w-full py-1.5 font-medium transition-opacity disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
