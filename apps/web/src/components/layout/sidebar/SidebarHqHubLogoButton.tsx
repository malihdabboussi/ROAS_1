'use client'

import { useEffect, useRef } from 'react'
import {
  shellMenuDockForClientPoint,
  useShellMenuDock,
} from '@/components/shell/use-shell-menu-dock'

const HOLD_TO_DOCK_MS = 200

function findMenuShell(from: HTMLElement): HTMLElement | null {
  return from.closest('.hub-sidebar-shell')
}

function clearLiftStyles(shell: HTMLElement) {
  shell.classList.remove('shell-menu-dock-lifting')
  shell.style.left = ''
  shell.style.top = ''
  shell.style.width = ''
  shell.style.height = ''
}

function applyLiftStyles(
  shell: HTMLElement,
  clientX: number,
  clientY: number,
  offsetX: number,
  offsetY: number,
) {
  shell.style.left = `${Math.round(clientX - offsetX)}px`
  shell.style.top = `${Math.round(clientY - offsetY)}px`
}

export function SidebarHqHubLogoButton({
  expanded,
}: {
  /** Whether the HQ menu rail is expanded (not compact). */
  expanded: boolean
}) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerActiveRef = useRef(false)
  const draggedRef = useRef(false)
  const liftShellRef = useRef<HTMLElement | null>(null)
  const liftOffsetRef = useRef({ x: 0, y: 0 })
  const lastCandidateRef = useRef<string | null>(null)
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

  const endLift = () => {
    const shell = liftShellRef.current
    if (shell) clearLiftStyles(shell)
    liftShellRef.current = null
    lastCandidateRef.current = null
  }

  useEffect(
    () => () => {
      clearHoldTimer()
      endLift()
      cancelDragging()
    },
    [cancelDragging],
  )

  const beginLift = (button: HTMLElement, clientX: number, clientY: number) => {
    const shell = findMenuShell(button)
    if (!shell) {
      startDragging()
      return
    }
    const rect = shell.getBoundingClientRect()
    liftOffsetRef.current = { x: clientX - rect.left, y: clientY - rect.top }
    liftShellRef.current = shell
    shell.classList.add('shell-menu-dock-lifting')
    shell.style.width = `${Math.round(rect.width)}px`
    shell.style.height = `${Math.round(rect.height)}px`
    applyLiftStyles(shell, clientX, clientY, liftOffsetRef.current.x, liftOffsetRef.current.y)
    startDragging()
    const next = shellMenuDockForClientPoint(clientX, clientY)
    lastCandidateRef.current = next
    setCandidate(next)
  }

  const updateLift = (clientX: number, clientY: number) => {
    const shell = liftShellRef.current
    if (shell) {
      applyLiftStyles(shell, clientX, clientY, liftOffsetRef.current.x, liftOffsetRef.current.y)
    }
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return
    const next = shellMenuDockForClientPoint(clientX, clientY)
    if (next === lastCandidateRef.current) return
    lastCandidateRef.current = next
    setCandidate(next)
  }

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
        event.currentTarget.setPointerCapture?.(event.pointerId)
        pointerActiveRef.current = true
        draggedRef.current = false
        clearHoldTimer()
        const { clientX, clientY } = event
        const button = event.currentTarget
        holdTimerRef.current = setTimeout(() => {
          draggedRef.current = true
          beginLift(button, clientX, clientY)
        }, HOLD_TO_DOCK_MS)
      }}
      onPointerMove={(event) => {
        if (!pointerActiveRef.current || !draggedRef.current) return
        updateLift(event.clientX, event.clientY)
      }}
      onPointerUp={(event) => {
        if (!pointerActiveRef.current) return
        clearHoldTimer()
        pointerActiveRef.current = false
        event.currentTarget.releasePointerCapture?.(event.pointerId)
        if (draggedRef.current) {
          const dock = shellMenuDockForClientPoint(event.clientX, event.clientY)
          endLift()
          finishDragging(dock)
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
        endLift()
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
  )
}
