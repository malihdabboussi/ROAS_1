'use client'

export function FunnelDesignSelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="gap-spacing-2 flex flex-col">
      <span className="body-3 text-foreground font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 body-3 text-foreground focus:ring-ring w-full border outline-none focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FunnelDesignSliderRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  onChange: (value: number) => void
}) {
  return (
    <div className="gap-spacing-2 flex flex-col">
      <div className="flex items-center justify-between">
        <span className="body-3 text-foreground font-medium">{label}</span>
        <span className="body-4 text-muted-foreground tabular-nums">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="slider-opacity w-full"
      />
    </div>
  )
}
