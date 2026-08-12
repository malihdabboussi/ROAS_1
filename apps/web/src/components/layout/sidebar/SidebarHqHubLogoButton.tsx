'use client'

import { useEffect, useRef } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import {
  shellMenuDockHitAtClientPoint,
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
  const startDragging = useShellMenuDock((state) => state.startDragging)
  const clearLift = useShellMenuDock((state) => state.clearLift)
  const toggleMenuCompact = useShellMenuDock((state) => state.toggleMenuCompact)

  const clearHoldTimer = () => {
    if (holdTimerRef.current === null) return
    clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }

  // Never cancelDragging on unmount — soft-lock remounts this button between docks.
  useEffect(() => () => clearHoldTimer(), [])

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
        const shell =
          event.currentTarget instanceof HTMLElement
            ? event.currentTarget.closest('.hub-sidebar-shell')
            : null
        holdTimerRef.current = setTimeout(() => {
          holdStartedRef.current = true
          const rect =
            shell instanceof HTMLElement
              ? shell.getBoundingClientRect()
              : new DOMRect(clientX - 24, clientY - 24, 72, 320)
          startDragging({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            grabX: clientX - rect.left,
            grabY: clientY - rect.top,
          })
          // Soft-lock immediately if the hold starts over a seam.
          if (shellMenuDockHitAtClientPoint(clientX, clientY) !== null) {
            clearLift()
          }
        }, HOLD_TO_DOCK_MS)
      }}
      onPointerUp={() => {
        if (!pointerActiveRef.current) return
        clearHoldTimer()
        // ShellMenuDockDragController owns the drag end once hold-to-dock has started.
        if (holdStartedRef.current || useShellMenuDock.getState().dragging) return
        pointerActiveRef.current = false
        toggleMenuCompact()
      }}
      onPointerCancel={() => {
        clearHoldTimer()
        if (holdStartedRef.current || useShellMenuDock.getState().dragging) return
        pointerActiveRef.current = false
      }}
      className="hub-sidebar-logo-button group cursor-pointer rounded-lg p-1 transition-all hover:opacity-80"
      aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
      aria-expanded={expanded}
    >
      <img
        src="/Logos/roas/icon-white.png"
        alt=""
        draggable={false}
        className={`hidden h-10 w-10 dark:block ${expanded ? '' : 'group-hover:hidden'}`}
      />
      <img
        src="/Logos/roas/icon-black.png"
        alt=""
        draggable={false}
        className={`h-10 w-10 dark:hidden ${expanded ? '' : 'group-hover:hidden'}`}
      />
      {!expanded ? (
        <PanelLeftOpen
          className="text-muted-foreground icon-sm hidden h-10 w-10 group-hover:block"
          aria-hidden
        />
      ) : null}
    </button>
  )
}
