'use client'

import { useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { GradientStop } from '@/lib/hooks/useGradient'

interface GradientBarProps {
  stops: GradientStop[]
  selectedIndex: number
  onSelectStop: (index: number) => void
  onDragStop: (index: number, position: number) => void
  onAddStop: () => void
  onDeleteStop: () => void
  getGradientCSS: () => string
  canDelete: boolean
  canAdd: boolean
}

export function GradientBar({
  stops,
  selectedIndex,
  onSelectStop,
  onDragStop,
  onAddStop,
  onDeleteStop,
  getGradientCSS,
  canDelete,
  canAdd,
}: GradientBarProps) {
  const gradientBarRef = useRef<HTMLDivElement>(null)

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradientBarRef.current) return
    const rect = gradientBarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100))

    const clickedStopIndex = stops.findIndex((stop) => Math.abs(stop.position - position) < 5)

    if (clickedStopIndex !== -1) {
      onSelectStop(clickedStopIndex)
    }
  }

  const handleStopDrag = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!gradientBarRef.current) return

    const rect = gradientBarRef.current.getBoundingClientRect()
    const startX = e.clientX
    const stop = stops[index]
    if (!stop) return
    const startPosition = stop.position

    const handleMove = (moveE: MouseEvent) => {
      const deltaX = moveE.clientX - startX
      const deltaPosition = (deltaX / rect.width) * 100
      const newPosition = Math.max(0, Math.min(100, startPosition + deltaPosition))

      onDragStop(index, newPosition)
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  const handleStopMouseDown = (index: number, e: React.MouseEvent) => {
    onSelectStop(index)
    handleStopDrag(index, e)
  }

  return (
    <div className="mb-spacing-4">
      <div className="gap-spacing-2 mb-spacing-2 flex items-center">
        <div
          ref={gradientBarRef}
          className="relative h-2 flex-1 cursor-pointer rounded-full"
          style={{
            background: getGradientCSS(),
          }}
          onClick={handleBarClick}
        >
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="absolute cursor-grab active:cursor-grabbing"
              style={{
                left: `${stop.position}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              onMouseDown={(e) => handleStopMouseDown(index, e)}
            >
              <div
                className={`h-5 w-5 rounded-full border-2 shadow-lg transition-all ${
                  selectedIndex === index
                    ? 'border-primary scale-110'
                    : 'hover:border-border border-white'
                }`}
                style={{ backgroundColor: stop.color }}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddStop}
          disabled={!canAdd}
          className="btn-icon-glass w-spacing-6 h-spacing-6 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Add gradient stop"
        >
          <Plus className="icon-sm" />
        </button>

        <button
          type="button"
          onClick={onDeleteStop}
          disabled={!canDelete}
          className="btn-icon-glass-destructive w-spacing-6 h-spacing-6 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Delete gradient stop"
        >
          <Trash2 className="icon-sm" />
        </button>
      </div>
    </div>
  )
}
