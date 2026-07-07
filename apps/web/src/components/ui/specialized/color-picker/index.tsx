'use client'

import { useEffect, useRef, useState } from 'react'
import type { ColorPickerPanelMode } from './ColorPickerPanel'
import { ColorPickerPanel } from './ColorPickerPanel'

const MIXED_SWATCH_BACKGROUND = 'repeating-linear-gradient(135deg, #9ca3af 0 6px, #e5e7eb 6px 12px)'

export interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  description?: string
  allowGradient?: boolean
  /** When true, shows a mixed placeholder until the user picks a solid color. */
  isMixed?: boolean
}

type ColorMode = ColorPickerPanelMode

/**
 * Professional Color Picker Component
 * Ported from legacy Vibey app.
 *
 * Features:
 * - Solid/Gradient mode tabs
 * - 180x180px 2D saturation/lightness picker
 * - Hue slider with live preview
 * - Format switcher: HEX / RGB / HSL
 * - Eyedropper tool (Chrome/Edge/Safari)
 * - Up to 5 gradient stops with draggable bar
 * - Gradient angle selector
 */
export function ColorPicker({
  value,
  onChange,
  label,
  description,
  allowGradient = false,
  isMixed = false,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<ColorMode>('solid')
  const [hexInput, setHexInput] = useState(value)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.startsWith('linear-gradient')) {
      setMode('gradient')
    } else {
      setMode('solid')
    }
  }, [value])

  useEffect(() => {
    if (!allowGradient && mode === 'gradient') {
      setMode('solid')
    }
  }, [allowGradient, mode])

  useEffect(() => {
    if (
      mode === 'gradient' &&
      !value.startsWith('linear-gradient') &&
      /^#[0-9A-Fa-f]{6}$/.test(value)
    ) {
      onChange(`linear-gradient(135deg, ${value} 0%, #000000 100%)`)
    }
  }, [mode])

  useEffect(() => {
    if (!value.startsWith('linear-gradient') && !isMixed) {
      setHexInput(value)
    }
  }, [value, isMixed])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen])

  const handleHexInputChange = (newHex: string) => {
    setHexInput(newHex)
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      onChange(newHex)
    }
  }

  const getGradientDisplayText = (gradientValue: string): string => {
    const stopMatches = gradientValue.match(/#[0-9A-Fa-f]{6}\s+\d+%/g)
    if (stopMatches && stopMatches.length > 0) {
      return stopMatches.map((s) => s.toUpperCase()).join(', ')
    }
    return 'GRADIENT'
  }

  return (
    <div>
      {label && <label className="body-3 text-foreground mb-spacing-2 block">{label}</label>}

      <div className="relative" ref={pickerRef}>
        <div className="gap-spacing-2 flex w-full items-center">
          <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex-shrink-0">
            <div
              className="w-spacing-10 h-spacing-10 rounded-spacing-2 cursor-pointer border border-[var(--color-border)] transition-opacity hover:opacity-80"
              style={{
                background: isMixed ? MIXED_SWATCH_BACKGROUND : value,
              }}
            />
          </button>

          <input
            type="text"
            value={
              isMixed
                ? 'MIXED'
                : mode === 'solid'
                  ? hexInput.toUpperCase()
                  : getGradientDisplayText(value)
            }
            onChange={(e) => handleHexInputChange(e.target.value)}
            readOnly={mode === 'gradient' || isMixed}
            pattern="^#[0-9A-Fa-f]{6}$"
            placeholder={isMixed ? 'Mixed' : '#000000'}
            className="input-glass h-spacing-10 px-spacing-3 body-3 flex-1 font-mono uppercase focus:outline-none"
          />
        </div>

        {isOpen && (
          <div className="z-dropdown mt-spacing-2 absolute left-0 top-full">
            <ColorPickerPanel
              value={value}
              onChange={onChange}
              mode={mode}
              onModeChange={setMode}
              allowGradient={allowGradient}
            />
          </div>
        )}
      </div>

      {description && (
        <p className="typo-caption text-muted-foreground mt-spacing-1">{description}</p>
      )}
    </div>
  )
}

export { ColorPicker as default }
export {
  ColorPickerPanel,
  ColorPickerPanelStandalone,
  type ColorPickerPanelProps,
  type ColorPickerPanelStandaloneProps,
  type ColorPickerPanelMode,
} from './ColorPickerPanel'
