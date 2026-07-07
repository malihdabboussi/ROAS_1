'use client'

import { forwardRef, useRef } from 'react'

interface ColorPickerAreaProps {
  hue: number
  saturation: number
  lightness: number
  onMove: (clientX: number, clientY: number, rect: DOMRect) => void
}

export const ColorPickerArea = forwardRef<HTMLDivElement, ColorPickerAreaProps>(
  ({ hue, saturation, lightness, onMove }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const areaRef = (ref as React.RefObject<HTMLDivElement>) || internalRef

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!areaRef.current) return
      const rect = areaRef.current.getBoundingClientRect()
      onMove(e.clientX, e.clientY, rect)

      const handleMove = (moveE: MouseEvent) => {
        onMove(moveE.clientX, moveE.clientY, rect)
      }

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
      }

      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
    }

    return (
      <div
        ref={areaRef}
        className="rounded-spacing-2 mb-spacing-3 relative h-[180px] w-full cursor-crosshair"
        style={{
          background: `
            linear-gradient(to bottom, transparent, #000),
            linear-gradient(to right, #fff, transparent),
            hsl(${hue}, 100%, 50%)
          `,
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white shadow-lg"
          style={{
            left: `${saturation}%`,
            top: `${100 - lightness}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
    )
  },
)

ColorPickerArea.displayName = 'ColorPickerArea'
