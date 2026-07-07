'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UsePanelResizeOptions {
  defaultWidthPercent?: number
  minPercent?: number
  maxPercent?: number
  /** When set, if the actual rendered chat width is below this value the chat is collapsed. */
  minChatPx?: number
}

interface UsePanelResizeReturn {
  chatWidthPercent: number
  rawDragWidthPercent: number
  isDragging: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  chatRef: React.RefObject<HTMLDivElement | null>
  handleMouseDown: (e: React.MouseEvent) => void
  chatCollapsed: boolean
}

export function usePanelResize({
  defaultWidthPercent = 40,
  minPercent = 20,
  maxPercent = 50,
  minChatPx,
}: UsePanelResizeOptions = {}): UsePanelResizeReturn {
  const [chatWidthPercent, setChatWidthPercent] = useState(defaultWidthPercent)
  const [rawDragWidthPercent, setRawDragWidthPercent] = useState(defaultWidthPercent)
  const [isDragging, setIsDragging] = useState(false)
  const [chatActualWidth, setChatActualWidth] = useState(Infinity)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chatRef = useRef<HTMLDivElement | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    const el = chatRef.current
    if (!el || minChatPx === undefined) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setChatActualWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setChatActualWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [minChatPx])

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = (x / rect.width) * 100
      const clamped = Math.min(maxPercent, Math.max(minPercent, percent))
      setRawDragWidthPercent(percent)
      setChatWidthPercent(clamped)
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
  }, [isDragging, minPercent, maxPercent])

  const chatCollapsed = minChatPx !== undefined && chatActualWidth < minChatPx

  return {
    chatWidthPercent,
    rawDragWidthPercent,
    isDragging,
    containerRef,
    chatRef,
    handleMouseDown,
    chatCollapsed,
  }
}
