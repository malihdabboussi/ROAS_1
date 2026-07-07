'use client'

import { forwardRef, useRef } from 'react'
import { Pipette } from 'lucide-react'

interface ColorPickerHueSliderProps {
  hue: number
  currentColor?: string
  onMove: (clientX: number, rect: DOMRect) => void
  onEyeDropper: () => void
  supportsEyeDropper?: boolean
}

export const ColorPickerHueSlider = forwardRef<HTMLDivElement, ColorPickerHueSliderProps>(
  ({ hue, currentColor, onMove, onEyeDropper, supportsEyeDropper = false }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const hueRef = (ref as React.RefObject<HTMLDivElement>) || internalRef

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!hueRef.current) return
      const rect = hueRef.current.getBoundingClientRect()
      onMove(e.clientX, rect)

      const handleMove = (moveE: MouseEvent) => {
        onMove(moveE.clientX, rect)
      }

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
      }

      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
    }

    return (
      <div className="gap-spacing-2 mb-spacing-4 flex items-center">
        <div
          className="rounded-spacing-1 h-8 w-8 flex-shrink-0 border border-[var(--color-border)]"
          style={{ background: currentColor }}
        />

        <div className="relative flex flex-1 cursor-pointer items-center">
          <div
            ref={hueRef}
            className="h-[12px] w-full rounded-full shadow-sm"
            style={{
              background:
                'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            }}
            onMouseDown={handleMouseDown}
          />

          <div
            className="pointer-events-none absolute top-1/2"
            style={{
              left: `${(hue / 360) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="h-6 w-6 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
            />
          </div>
        </div>

        {supportsEyeDropper && (
          <button
            type="button"
            onClick={onEyeDropper}
            className="btn-icon-glass flex-shrink-0"
            aria-label="Pick color from screen"
          >
            <Pipette className="icon-sm" />
          </button>
        )}
      </div>
    )
  },
)

ColorPickerHueSlider.displayName = 'ColorPickerHueSlider'
