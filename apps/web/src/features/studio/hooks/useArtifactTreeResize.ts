'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseArtifactTreeResizeOptions {
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
}

interface UseArtifactTreeResizeReturn {
  treeWidth: number
  isDragging: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useArtifactTreeResize({
  defaultWidth = 280,
  minWidth = 112,
  maxWidth = 280,
}: UseArtifactTreeResizeOptions = {}): UseArtifactTreeResizeReturn {
  const [treeWidth, setTreeWidth] = useState(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const clamped = Math.min(maxWidth, Math.max(minWidth, x))
      setTreeWidth(clamped)
    }

    const handlePointerUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, minWidth, maxWidth])

  return { treeWidth, isDragging, containerRef, handleMouseDown }
}
