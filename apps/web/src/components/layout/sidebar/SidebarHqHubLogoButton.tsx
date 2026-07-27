'use client'

import { useEffect, useRef } from 'react'
import {
  shellMenuDockForClientPoint,
  useShellMenuDock,
} from '@/components/shell/use-shell-menu-dock'
import { ShellMenuDockOverlay } from './ShellMenuDockOverlay'

const HOLD_TO_DOCK_MS = 200

export function SidebarHqHubLogoButton({
  expanded,
}: {
  /** Whether the HQ menu rail is expanded (not compact). */
  expanded: boolean
}) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerActiveRef = useRef(false)
  const draggedRef = useRef(false)
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

  const updateCandidate = (clientX: number, clientY: number) => {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return
    setCandidate(shellMenuDockForClientPoint(clientX, clientY), clientX, clientY)
  }

  return (
    <>
      <button
        type="button"
        draggable={false}
        onDragStart={(event) => {
          event.preventDefault()
        }}
        onPointerDown={(event) => {
          if (event.button > 0) return
          event.preventDefault()
          event.currentTarget.setPointerCapture?.(event.pointerId)
          pointerActiveRef.current = true
          draggedRef.current = false
          clearHoldTimer()
          const { clientX, clientY } = event
          holdTimerRef.current = setTimeout(() => {
            draggedRef.current = true
            startDragging(clientX, clientY)
            updateCandidate(clientX, clientY)
          }, HOLD_TO_DOCK_MS)
        }}
        onPointerMove={(event) => {
          if (!pointerActiveRef.current || !draggedRef.current) return
          updateCandidate(event.clientX, event.clientY)
        }}
        onPointerUp={(event) => {
          if (!pointerActiveRef.current) return
          clearHoldTimer()
          pointerActiveRef.current = false
          event.currentTarget.releasePointerCapture?.(event.pointerId)
          if (draggedRef.current) {
            finishDragging(shellMenuDockForClientPoint(event.clientX, event.clientY))
            draggedRef.current = false
            return
          }
          // Option A: click collapses/expands into the R chip.
          toggleMenuCompact()
        }}
        onPointerCancel={(event) => {
          clearHoldTimer()
          pointerActiveRef.current = false
          draggedRef.current = false
          event.currentTarget.releasePointerCapture?.(event.pointerId)
          cancelDragging()
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
      <ShellMenuDockOverlay />
    </>
  )
}
