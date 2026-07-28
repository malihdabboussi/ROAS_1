'use client'

import { useEffect, useRef } from 'react'
import {
  shellMenuDockForClientPoint,
  useShellMenuDock,
} from '@/components/shell/use-shell-menu-dock'

const HOLD_TO_DOCK_MS = 200

export function SidebarHqHubLogoButton({
  expanded,
}: {
  /** Whether the HQ menu rail is expanded (not compact). */
  expanded: boolean
}) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerActiveRef = useRef(false)
  const holdStartedRef = useRef(false)
  const lastCandidateRef = useRef<string | null>(null)
  const dragging = useShellMenuDock((state) => state.dragging)
  const startDragging = useShellMenuDock((state) => state.startDragging)
  const setCandidate = useShellMenuDock((state) => state.setCandidate)
  const finishDragging = useShellMenuDock((state) => state.finishDragging)
  const cancelDragging = useShellMenuDock((state) => state.cancelDragging)
  const toggleMenuCompact = useShellMenuDock((state) => state.toggleMenuCompact)

  const clearHoldTimer = () => {
    if (holdTimerRef.current === null) return
    clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }

  useEffect(
    () => () => {
      clearHoldTimer()
      cancelDragging()
    },
    [cancelDragging],
  )

  // Document listeners survive sidebar remounts when the candidate dock changes.
  useEffect(() => {
    if (!dragging) return

    const onMove = (event: PointerEvent) => {
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return
      const next = shellMenuDockForClientPoint(event.clientX, event.clientY)
      if (next === lastCandidateRef.current) return
      lastCandidateRef.current = next
      setCandidate(next)
    }

    const onUp = (event: PointerEvent) => {
      holdStartedRef.current = false
      pointerActiveRef.current = false
      const dock = shellMenuDockForClientPoint(event.clientX, event.clientY)
      lastCandidateRef.current = null
      finishDragging(dock)
    }

    const onCancel = () => {
      holdStartedRef.current = false
      pointerActiveRef.current = false
      lastCandidateRef.current = null
      cancelDragging()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
  }, [dragging, setCandidate, finishDragging, cancelDragging])

  return (
    <button
      type="button"
      draggable={false}
      onDragStart={(event) => {
        event.preventDefault()
      }}
      onPointerDown={(event) => {
        if (event.button > 0) return
        event.preventDefault()
        pointerActiveRef.current = true
        holdStartedRef.current = false
        clearHoldTimer()
        const { clientX, clientY } = event
        holdTimerRef.current = setTimeout(() => {
          holdStartedRef.current = true
          const next = shellMenuDockForClientPoint(clientX, clientY)
          lastCandidateRef.current = next
          startDragging()
          setCandidate(next)
        }, HOLD_TO_DOCK_MS)
      }}
      onPointerUp={() => {
        if (!pointerActiveRef.current) return
        clearHoldTimer()
        // Document listeners own the drag end once hold-to-dock has started.
        if (holdStartedRef.current || dragging) return
        pointerActiveRef.current = false
        toggleMenuCompact()
      }}
      onPointerCancel={() => {
        clearHoldTimer()
        if (holdStartedRef.current || dragging) return
        pointerActiveRef.current = false
      }}
      className="hub-sidebar-logo-button cursor-pointer rounded-lg p-1 transition-all hover:opacity-80"
      aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
      aria-expanded={expanded}
    >
      <img
        src="/Logos/roas/icon-white.png"
        alt=""
        draggable={false}
        className="hidden h-10 w-10 dark:block"
      />
      <img
        src="/Logos/roas/icon-black.png"
        alt=""
        draggable={false}
        className="h-10 w-10 dark:hidden"
      />
    </button>
  )
}
