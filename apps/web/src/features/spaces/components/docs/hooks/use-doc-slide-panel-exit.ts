'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useDocSlidePanelExit({
  inline,
  onClose,
  initialItemId,
}: {
  inline: boolean
  onClose: () => void
  initialItemId: string
}) {
  const [panelSlideExiting, setPanelSlideExiting] = useState(false)
  const exitSlidePendingRef = useRef(false)

  useEffect(() => {
    exitSlidePendingRef.current = false
    setPanelSlideExiting(false)
  }, [initialItemId])

  const requestClosePanel = useCallback(() => {
    if (inline) {
      onClose()
      return
    }
    if (exitSlidePendingRef.current) return
    exitSlidePendingRef.current = true
    setPanelSlideExiting(true)
  }, [inline, onClose])

  const onSlideAnimationComplete = useCallback(() => {
    if (!exitSlidePendingRef.current) return
    exitSlidePendingRef.current = false
    onClose()
  }, [onClose])

  return {
    panelSlideExiting,
    requestClosePanel,
    onSlideAnimationComplete,
  }
}
