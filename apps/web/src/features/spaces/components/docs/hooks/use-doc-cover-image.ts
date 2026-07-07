'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpaceItem } from '../../../types'

type UseDocCoverImageParams = {
  itemCustomData: Record<string, unknown> | null | undefined
  docCoverUrl: string | null
  handleUpdateField: (patch: Partial<SpaceItem>) => void | Promise<void>
}

export function useDocCoverImage({
  itemCustomData,
  docCoverUrl,
  handleUpdateField,
}: UseDocCoverImageParams) {
  const [coverRepositioning, setCoverRepositioning] = useState(false)
  const [coverFocalY, setCoverFocalY] = useState<number>(50)
  const coverContainerRef = useRef<HTMLDivElement>(null)
  const coverDragStartY = useRef<number>(0)
  const coverDragStartFocal = useRef<number>(50)
  const coverDraggingRef = useRef(false)
  const coverFocalYLiveRef = useRef(50)

  useEffect(() => {
    const stored = (itemCustomData as Record<string, unknown> | undefined)?._doc_cover_focal_y
    setCoverFocalY(typeof stored === 'number' ? stored : 50)
    setCoverRepositioning(false)
    coverDraggingRef.current = false
  }, [itemCustomData, docCoverUrl])

  useEffect(() => {
    coverFocalYLiveRef.current = coverFocalY
  }, [coverFocalY])

  const handleCoverDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!coverRepositioning) return
      e.preventDefault()
      coverDraggingRef.current = true
      coverDragStartY.current = e.clientY
      coverDragStartFocal.current = coverFocalYLiveRef.current
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [coverRepositioning],
  )

  const handleCoverDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!coverRepositioning || !coverDraggingRef.current) return
      const container = coverContainerRef.current
      if (!container) return
      const delta = e.clientY - coverDragStartY.current
      const containerH = container.getBoundingClientRect().height
      const pctDelta = (delta / containerH) * -100
      const next = Math.min(100, Math.max(0, coverDragStartFocal.current + pctDelta))
      coverFocalYLiveRef.current = next
      setCoverFocalY(next)
    },
    [coverRepositioning],
  )

  const handleCoverDragEnd = useCallback(() => {
    if (!coverDraggingRef.current) return
    coverDraggingRef.current = false
    setCoverRepositioning(false)
    // Single-key patch: custom_data merges shallowly (server + store), so
    // spreading possibly-stale panel state would clobber concurrent edits.
    void handleUpdateField({
      custom_data: { _doc_cover_focal_y: Math.round(coverFocalYLiveRef.current) },
    })
  }, [handleUpdateField])

  return {
    coverRepositioning,
    setCoverRepositioning,
    coverFocalY,
    coverContainerRef,
    handleCoverDragStart,
    handleCoverDragMove,
    handleCoverDragEnd,
  }
}
