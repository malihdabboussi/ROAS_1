'use client'

import { useEffect, useRef } from 'react'
import { shellMenuDockForPoint, useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { SidebarWordmark } from '../sidebar/SidebarWordmark'
import { ShellMenuDockOverlay } from './ShellMenuDockOverlay'

const HOLD_TO_DOCK_MS = 200

export function SidebarHqHubLogoButton({
  hubOpen,
  onToggle,
}: {
  hubOpen: boolean
  onToggle: () => void
}) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerActiveRef = useRef(false)
  const draggedRef = useRef(false)
  const startDragging = useShellMenuDock((state) => state.startDragging)
  const setCandidate = useShellMenuDock((state) => state.setCandidate)
  const finishDragging = useShellMenuDock((state) => state.finishDragging)
  const cancelDragging = useShellMenuDock((state) => state.cancelDragging)

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
    setCandidate(shellMenuDockForPoint(clientX, clientY, window.innerWidth, window.innerHeight))
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={(event) => {
          if (event.button > 0) return
          event.currentTarget.setPointerCapture?.(event.pointerId)
          pointerActiveRef.current = true
          draggedRef.current = false
          clearHoldTimer()
          holdTimerRef.current = setTimeout(() => {
            draggedRef.current = true
            startDragging()
            updateCandidate(event.clientX, event.clientY)
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
            const dock = shellMenuDockForPoint(
              event.clientX,
              event.clientY,
              window.innerWidth,
              window.innerHeight,
            )
            finishDragging(dock)
            draggedRef.current = false
            return
          }
          onToggle()
        }}
        onPointerCancel={(event) => {
          clearHoldTimer()
          pointerActiveRef.current = false
          draggedRef.current = false
          event.currentTarget.releasePointerCapture?.(event.pointerId)
          cancelDragging()
        }}
        className="hub-sidebar-logo-button cursor-pointer rounded-lg p-1 transition-all hover:opacity-80"
        aria-label={hubOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={hubOpen}
      >
        {hubOpen ? (
          <SidebarWordmark />
        ) : (
          <>
            <img
              src="/Logos/roas/icon-white.png"
              alt="ROAS"
              className="hidden h-10 w-10 dark:block"
            />
            <img src="/Logos/roas/icon-black.png" alt="ROAS" className="h-10 w-10 dark:hidden" />
          </>
        )}
      </button>
      <ShellMenuDockOverlay />
    </>
  )
}
