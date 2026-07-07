'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

export const OUTLIER_PRESETS = [1, 2, 3, 5, 10] as const
export const OUTLIER_MIN = 1
export const OUTLIER_MAX = 100

export function formatTopicOutlierLabel(value: number): string {
  if (value >= OUTLIER_MAX) return '100x+'
  return `${value}x+`
}

interface TopicOutlierFilterPanelProps {
  value: number
  onChange: (value: number) => void
}

export function TopicOutlierFilterPanel({ value, onChange }: TopicOutlierFilterPanelProps) {
  const clampedValue = Math.min(OUTLIER_MAX, Math.max(OUTLIER_MIN, value))
  const [sliderValue, setSliderValue] = useState(clampedValue)

  useEffect(() => {
    setSliderValue(clampedValue)
  }, [clampedValue])

  const applyValue = (next: number) => {
    const clamped = Math.min(OUTLIER_MAX, Math.max(OUTLIER_MIN, next))
    setSliderValue(clamped)
    onChange(clamped)
  }

  return (
    <>
      <div className="gap-spacing-2 grid grid-cols-5">
        {OUTLIER_PRESETS.map((preset) => {
          const isSelected = clampedValue === preset
          return (
            <button
              key={preset}
              type="button"
              onClick={() => applyValue(preset)}
              className={cn(
                'body-3 rounded-spacing-2 px-spacing-1 py-spacing-1 text-center font-medium transition-colors',
                isSelected
                  ? 'badge-glass badge-glass-blue text-foreground border-0'
                  : 'border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground border',
              )}
            >
              {preset}x
            </button>
          )
        })}
      </div>

      <div className="border-border my-spacing-3 border-t" />

      <div className="gap-spacing-2 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="body-3 text-foreground font-medium">Custom minimum</span>
          <span className="body-3 text-muted-foreground tabular-nums">
            {formatTopicOutlierLabel(sliderValue)}
          </span>
        </div>
        <input
          type="range"
          min={OUTLIER_MIN}
          max={OUTLIER_MAX}
          step={1}
          value={sliderValue}
          onChange={(e) => applyValue(Number(e.target.value))}
          className="slider-opacity w-full"
        />
        <div className="body-4 text-muted-foreground flex items-center justify-between">
          <span>1x</span>
          <span>100x+</span>
        </div>
      </div>
    </>
  )
}
