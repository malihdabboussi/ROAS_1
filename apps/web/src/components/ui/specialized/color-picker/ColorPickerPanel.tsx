'use client'

import { useEffect, useState } from 'react'
import { Blend, Droplet } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ColorPickerGradient } from './ColorPickerGradient'
import { ColorPickerSolid } from './ColorPickerSolid'

export type ColorPickerPanelMode = 'solid' | 'gradient'

export interface ColorPickerPanelProps {
  value: string
  onChange: (color: string) => void
  mode: ColorPickerPanelMode
  onModeChange: (mode: ColorPickerPanelMode) => void
  allowGradient?: boolean
  className?: string
}

/**
 * Inner surface-card used by theme ColorPicker (dropdown) and tag color + popover.
 * Same Solid / Gradient tabs + pickers as when you open the theme color field.
 */
export function ColorPickerPanel({
  value,
  onChange,
  mode,
  onModeChange,
  allowGradient = false,
  className,
}: ColorPickerPanelProps) {
  return (
    <div
      className={cn(
        'surface-card rounded-spacing-2 p-spacing-4 w-80 border border-[var(--color-border)] shadow-lg',
        className,
      )}
    >
      {allowGradient && (
        <div className="mb-spacing-4 gap-spacing-2 flex items-center">
          <button
            type="button"
            onClick={() => onModeChange('solid')}
            className={`body-3 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex flex-1 items-center justify-center transition-all ${
              mode === 'solid'
                ? 'button-glass-accent'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
            }`}
          >
            <Droplet className="h-4 w-4" />
            <span>Solid</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('gradient')}
            className={`body-3 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex flex-1 items-center justify-center transition-all ${
              mode === 'gradient'
                ? 'button-glass-accent'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
            }`}
          >
            <Blend className="h-4 w-4" />
            <span>Gradient</span>
          </button>
        </div>
      )}

      {mode === 'solid' ? (
        <ColorPickerSolid value={value} onChange={onChange} />
      ) : (
        <ColorPickerGradient value={value} onChange={onChange} />
      )}
    </div>
  )
}

export interface ColorPickerPanelStandaloneProps {
  value: string
  onChange: (color: string) => void
  allowGradient?: boolean
  className?: string
}

/**
 * Theme dropdown content only (Solid / Gradient + pickers) with internal mode state
 * and the same value/mode/gradient side-effects as the main ColorPicker field.
 */
export function ColorPickerPanelStandalone({
  value,
  onChange,
  allowGradient = false,
  className,
}: ColorPickerPanelStandaloneProps) {
  const [mode, setMode] = useState<ColorPickerPanelMode>(() =>
    value.startsWith('linear-gradient') ? 'gradient' : 'solid',
  )

  useEffect(() => {
    if (value.startsWith('linear-gradient')) setMode('gradient')
    else setMode('solid')
  }, [value])

  useEffect(() => {
    if (!allowGradient && mode === 'gradient') setMode('solid')
  }, [allowGradient, mode])

  useEffect(() => {
    if (
      mode === 'gradient' &&
      !value.startsWith('linear-gradient') &&
      /^#[0-9A-Fa-f]{6}$/.test(value)
    ) {
      onChange(`linear-gradient(135deg, ${value} 0%, #000000 100%)`)
    }
  }, [mode, value, onChange])

  return (
    <ColorPickerPanel
      value={value}
      onChange={onChange}
      mode={mode}
      onModeChange={setMode}
      allowGradient={allowGradient}
      className={className}
    />
  )
}
