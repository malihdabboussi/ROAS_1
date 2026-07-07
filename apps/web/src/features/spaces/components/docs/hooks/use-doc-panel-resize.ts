'use client'

import { useCallback, useEffect, useState } from 'react'

export function useDocPanelResize() {
  const [panelWidth, setPanelWidth] = useState(() =>
    typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.45) : 640,
  )
  const [isResizing, setIsResizing] = useState(false)

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return
    const maxW = window.innerWidth * 0.78
    const minW = 400

    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth - e.clientX
      setPanelWidth(Math.min(maxW, Math.max(minW, w)))
    }
    const onUp = () => setIsResizing(false)

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [isResizing])

  return { panelWidth, isResizing, handleResizePointerDown }
}
