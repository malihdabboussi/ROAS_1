'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormSettings } from '@/lib/forms/forms-api'

interface UseFormCoverImageParams {
  settings: FormSettings | null | undefined
  coverUrl: string | null
  /** Patch the form (called with `{ settings: nextSettings }`). */
  updateSettings: (next: FormSettings) => void
}

/**
 * Form cover hero state — focal Y + drag handlers — mirrors `useDocCoverImage`
 * but reads/writes `form.settings.cover_focal_y`.
 */
export function useFormCoverImage({ settings, coverUrl, updateSettings }: UseFormCoverImageParams) {
  const [coverRepositioning, setCoverRepositioning] = useState(false)
  const [coverFocalY, setCoverFocalY] = useState<number>(50)
  const coverContainerRef = useRef<HTMLDivElement>(null)
  const coverDragStartY = useRef<number>(0)
  const coverDragStartFocal = useRef<number>(50)
  const coverDraggingRef = useRef(false)
  const coverFocalYLiveRef = useRef(50)

  useEffect(() => {
    const stored = settings?.cover_focal_y
    setCoverFocalY(typeof stored === 'number' ? stored : 50)
    setCoverRepositioning(false)
    coverDraggingRef.current = false
  }, [settings, coverUrl])

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
    updateSettings({
      ...(settings ?? {}),
      cover_focal_y: Math.round(coverFocalYLiveRef.current),
    })
  }, [updateSettings, settings])

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
