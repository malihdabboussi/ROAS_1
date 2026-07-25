'use client'

import { GripVertical } from 'lucide-react'

interface ResizableDividerProps {
  onMouseDown: (e: React.MouseEvent) => void
  isDragging?: boolean
  /** Show line at 85% height with faded edges instead of full height */
  compact?: boolean
  /** When false, hides the grip icon and uses a narrower hit target (e.g. Spaces chat split). */
  showGrip?: boolean
  ariaLabel?: string
}

export function ResizableDivider({
  onMouseDown,
  isDragging,
  compact,
  showGrip = true,
  ariaLabel = 'Resize panel',
}: ResizableDividerProps) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onMouseDown(e as unknown as React.MouseEvent)
  }
  return (
    <div
      className={`group relative flex flex-shrink-0 cursor-col-resize items-center justify-center ${
        showGrip ? 'w-4' : 'w-2'
      }`}
      onPointerDown={handlePointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {compact ? (
        <div
          className={`resize-divider-line-blue-compact absolute left-1/2 w-px -translate-x-1/2 transition-opacity ${
            isDragging ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div
          className={`resize-divider-line-blue-full absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-opacity ${
            isDragging ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      {showGrip ? (
        <GripVertical
          className={`h-4 w-4 transition-opacity ${isDragging ? 'opacity-0' : 'text-muted-foreground opacity-100'}`}
        />
      ) : null}
    </div>
  )
}
