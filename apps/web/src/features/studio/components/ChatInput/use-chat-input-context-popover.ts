import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

interface UseChatInputContextPopoverOptions {
  enabled: boolean
  composerShellRef: RefObject<HTMLElement | null>
}

export function useChatInputContextPopover({
  enabled,
  composerShellRef,
}: UseChatInputContextPopoverOptions) {
  const contextPopoverAnchorRef = useRef<HTMLSpanElement>(null)
  const contextPopoverTriggerRef = useRef<HTMLButtonElement>(null)
  const contextPopoverPanelRef = useRef<HTMLDivElement>(null)
  const [contextPopoverOpen, setContextPopoverOpen] = useState(false)
  const [contextPopoverPosition, setContextPopoverPosition] = useState<{
    left: number
    bottom: number
    width: number
  } | null>(null)

  const updateContextPopoverPosition = useCallback(() => {
    const shellEl = composerShellRef.current
    const anchorEl = contextPopoverAnchorRef.current
    if (!shellEl || !anchorEl || typeof window === 'undefined') return
    const shellRect = shellEl.getBoundingClientRect()
    const anchorRect = anchorEl.getBoundingClientRect()
    setContextPopoverPosition({
      left: anchorRect.left,
      bottom: window.innerHeight - shellRect.top + anchorRect.height,
      width: anchorRect.width,
    })
  }, [composerShellRef])

  const toggleContextPopover = useCallback(() => {
    setContextPopoverOpen((open) => !open)
  }, [])

  const closeContextPopover = useCallback(() => {
    setContextPopoverOpen(false)
  }, [])

  useLayoutEffect(() => {
    if (!contextPopoverOpen || !enabled) {
      setContextPopoverPosition(null)
      return
    }
    const anchorEl = contextPopoverAnchorRef.current
    const shellEl = composerShellRef.current
    if (!anchorEl || !shellEl || typeof window === 'undefined') return
    updateContextPopoverPosition()
    const resizeObserver = new ResizeObserver(updateContextPopoverPosition)
    resizeObserver.observe(anchorEl)
    resizeObserver.observe(shellEl)
    window.addEventListener('resize', updateContextPopoverPosition)
    window.addEventListener('scroll', updateContextPopoverPosition, true)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateContextPopoverPosition)
      window.removeEventListener('scroll', updateContextPopoverPosition, true)
    }
  }, [composerShellRef, contextPopoverOpen, enabled, updateContextPopoverPosition])

  useEffect(() => {
    if (!enabled) {
      setContextPopoverOpen(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!contextPopoverOpen) return
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextPopoverOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [contextPopoverOpen])

  return {
    contextPopoverAnchorRef,
    contextPopoverTriggerRef,
    contextPopoverPanelRef,
    contextPopoverOpen,
    setContextPopoverOpen,
    contextPopoverPosition,
    updateContextPopoverPosition,
    toggleContextPopover,
    closeContextPopover,
  }
}
