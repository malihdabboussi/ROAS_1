'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { hexToRGB, hslToHex, rgbToHex } from '@/lib/utils/colors/color-utils'

interface ColorPickerFormatInputsProps {
  format: 'hex' | 'rgb' | 'hsl'
  setFormat: (format: 'hex' | 'rgb' | 'hsl') => void
  value: string
  hue: number
  saturation: number
  lightness: number
  onChange: (hex: string) => void
}

export function ColorPickerFormatInputs({
  format,
  setFormat,
  value,
  hue,
  saturation,
  lightness,
  onChange,
}: ColorPickerFormatInputsProps) {
  const [isFormatOpen, setIsFormatOpen] = useState(false)
  const formatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isFormatOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (formatRef.current && !formatRef.current.contains(e.target as Node)) {
        setIsFormatOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isFormatOpen])

  const handleHexChange = (newHex: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      onChange(newHex)
    }
  }

  const formatOptions: Array<{ value: 'hex' | 'rgb' | 'hsl'; label: string }> = [
    { value: 'hex', label: 'HEX' },
    { value: 'rgb', label: 'RGB' },
    { value: 'hsl', label: 'HSL' },
  ]

  return (
    <div className="gap-spacing-2 flex items-center">
      <div ref={formatRef} className="relative flex-shrink-0" data-dropdown>
        <button
          type="button"
          onClick={() => setIsFormatOpen(!isFormatOpen)}
          className="input-glass h-spacing-10 px-spacing-3 body-2 flex w-24 cursor-pointer items-center justify-between"
        >
          <span className="text-foreground">{format.toUpperCase()}</span>
          <ChevronDown
            className={`text-muted-foreground h-4 w-4 transition-transform ${isFormatOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isFormatOpen && (
          <div className="mt-spacing-1 z-dropdown dropdown-menu-solid absolute left-0 top-full w-24">
            <div className="p-spacing-1">
              {formatOptions.map((option) => {
                const isSelected = format === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFormat(option.value)
                      setIsFormatOpen(false)
                    }}
                    className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 flex w-full items-center text-left transition-all ${
                      isSelected
                        ? 'dropdown-option-selected'
                        : 'hover:bg-hover-subtle hover:text-foreground'
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                        isSelected ? 'step-circle-completed' : 'step-circle-default'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          viewBox="0 0 20 20"
                          className="tint-green relative z-30 h-2.5 w-2.5"
                          fill="currentColor"
                          aria-hidden="true"
                          style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))' }}
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`body-3 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {format === 'hex' && (
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          className="input-glass h-spacing-10 px-spacing-3 body-2 min-w-0 flex-1 font-mono uppercase focus:outline-none"
        />
      )}

      {format === 'rgb' && (
        <div className="gap-spacing-2 grid flex-1 grid-cols-3">
          <input
            type="number"
            min="0"
            max="255"
            value={hexToRGB(value).r}
            onChange={(e) => {
              const rgb = hexToRGB(value)
              const newHex = rgbToHex(parseInt(e.target.value) || 0, rgb.g, rgb.b)
              handleHexChange(newHex)
            }}
            placeholder="R"
            className="input-glass h-spacing-10 px-spacing-2 body-2 w-full text-center [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <input
            type="number"
            min="0"
            max="255"
            value={hexToRGB(value).g}
            onChange={(e) => {
              const rgb = hexToRGB(value)
              const newHex = rgbToHex(rgb.r, parseInt(e.target.value) || 0, rgb.b)
              handleHexChange(newHex)
            }}
            placeholder="G"
            className="input-glass h-spacing-10 px-spacing-2 body-2 w-full text-center [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <input
            type="number"
            min="0"
            max="255"
            value={hexToRGB(value).b}
            onChange={(e) => {
              const rgb = hexToRGB(value)
              const newHex = rgbToHex(rgb.r, rgb.g, parseInt(e.target.value) || 0)
              handleHexChange(newHex)
            }}
            placeholder="B"
            className="input-glass h-spacing-10 px-spacing-2 body-2 w-full text-center [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      )}

      {format === 'hsl' && (
        <div className="gap-spacing-2 grid flex-1 grid-cols-3">
          <input
            type="number"
            min="0"
            max="360"
            value={hue}
            onChange={(e) => {
              const newHue = Math.max(0, Math.min(360, parseInt(e.target.value) || 0))
              const hex = hslToHex(newHue, saturation, lightness)
              handleHexChange(hex)
            }}
            placeholder="H"
            className="input-glass h-spacing-10 px-spacing-2 body-2 w-full text-center [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <input
            type="number"
            min="0"
            max="100"
            value={saturation}
            onChange={(e) => {
              const newSat = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
              const hex = hslToHex(hue, newSat, lightness)
              handleHexChange(hex)
            }}
            placeholder="S"
            className="input-glass h-spacing-10 px-spacing-2 body-2 w-full text-center [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <input
            type="number"
            min="0"
            max="100"
            value={lightness}
            onChange={(e) => {
              const newLight = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
              const hex = hslToHex(hue, saturation, newLight)
              handleHexChange(hex)
            }}
            placeholder="L"
            className="input-glass h-spacing-10 px-spacing-2 body-2 w-full text-center [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      )}
    </div>
  )
}
