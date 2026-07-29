'use client'

/**
 * Owns document pointer listeners for HQ menu dock drag.
 * Must mount once outside the remounting sidebar slot — soft-lock remounts
 * the logo button between docks, and listeners/cancel on that unmount were
 * resetting the candidate back to the saved left/work dock.
 */
import { useEffect } from 'react'
import {
  shellMenuDockForClientPoint,
  shellMenuDockHitAtClientPoint,
  useShellMenuDock,
  type ShellMenuDockLift,
} from './use-shell-menu-dock'

function liftFromShell(clientX: number, clientY: number): ShellMenuDockLift {
  const shell = document.querySelector('.hub-sidebar-shell')
  const rect =
    shell instanceof HTMLElement
      ? shell.getBoundingClientRect()
      : new DOMRect(clientX - 24, clientY - 24, 72, 320)
  return {
    left: rect.left,
    top: rect.top,
    width: Math.max(rect.width, 56),
    height: Math.max(rect.height, 56),
    grabX: Math.min(Math.max(clientX - rect.left, 8), Math.max(rect.width, 56) - 8),
    grabY: Math.min(Math.max(clientY - rect.top, 8), Math.max(rect.height, 56) - 8),
  }
}

export function ShellMenuDockDragController() {
  const dragging = useShellMenuDock((state) => state.dragging)
  const setCandidate = useShellMenuDock((state) => state.setCandidate)
  const moveLift = useShellMenuDock((state) => state.moveLift)
  const clearLift = useShellMenuDock((state) => state.clearLift)
  const ensureLift = useShellMenuDock((state) => state.ensureLift)
  const finishDragging = useShellMenuDock((state) => state.finishDragging)
  const cancelDragging = useShellMenuDock((state) => state.cancelDragging)

  useEffect(() => {
    if (!dragging) return

    let lastCandidate = useShellMenuDock.getState().candidate

    const onMove = (event: PointerEvent) => {
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return
      const hit = shellMenuDockHitAtClientPoint(event.clientX, event.clientY)
      const sticky = useShellMenuDock.getState().candidate
      const next = shellMenuDockForClientPoint(event.clientX, event.clientY, sticky)

      if (hit !== null) {
        if (next !== lastCandidate) {
          lastCandidate = next
          setCandidate(next)
        }
        clearLift()
        return
      }

      ensureLift(liftFromShell(event.clientX, event.clientY))
      moveLift(event.clientX, event.clientY)
    }

    const onUp = (event: PointerEvent) => {
      const sticky = useShellMenuDock.getState().candidate
      const dock = shellMenuDockForClientPoint(event.clientX, event.clientY, sticky)
      finishDragging(dock)
    }

    const onCancel = () => {
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
  }, [
    dragging,
    setCandidate,
    moveLift,
    clearLift,
    ensureLift,
    finishDragging,
    cancelDragging,
  ])

  return null
}
