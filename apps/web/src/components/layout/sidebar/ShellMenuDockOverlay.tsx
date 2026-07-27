'use client'

import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  getShellWorkAreaRect,
  useShellMenuDock,
  type ShellMenuDock,
} from '@/components/shell/use-shell-menu-dock'
import { cn } from '@/lib/utils/cn'

const FRAME_DOCKS = ['left', 'right', 'top', 'bottom'] as const

export function ShellMenuDockOverlay() {
  const dragging = useShellMenuDock((state) => state.dragging)
  const candidate = useShellMenuDock((state) => state.candidate)
  const pointerX = useShellMenuDock((state) => state.pointerX)
  const pointerY = useShellMenuDock((state) => state.pointerY)
  const [workRect, setWorkRect] = useState(() => getShellWorkAreaRect())

  useEffect(() => {
    if (!dragging) return
    const sync = () => setWorkRect(getShellWorkAreaRect())
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [dragging])

  if (!dragging || typeof document === 'undefined') return null

  const overlayStyle = {
    '--shell-menu-dock-x': `${pointerX}px`,
    '--shell-menu-dock-y': `${pointerY}px`,
    ...(workRect
      ? {
          '--shell-menu-dock-work-left': `${workRect.left}px`,
          '--shell-menu-dock-work-top': `${workRect.top}px`,
          '--shell-menu-dock-work-height': `${workRect.height}px`,
          '--shell-menu-dock-work-band': `${Math.min(120, Math.max(48, workRect.width * 0.35))}px`,
        }
      : {}),
  } as CSSProperties

  const docks: ShellMenuDock[] = workRect ? [...FRAME_DOCKS, 'work'] : [...FRAME_DOCKS]

  return createPortal(
    <div className="shell-menu-dock-overlay" aria-hidden style={overlayStyle}>
      {docks.map((dock) => (
        <div
          key={dock}
          className={cn(
            'shell-menu-dock-target',
            `shell-menu-dock-target-${dock}`,
            candidate === dock && 'shell-menu-dock-target-active',
          )}
        />
      ))}
      <div className="shell-menu-dock-lifted-logo">
        <img src="/Logos/roas/icon-black.png" alt="" draggable={false} className="dark:hidden" />
        <img
          src="/Logos/roas/icon-white.png"
          alt=""
          draggable={false}
          className="hidden dark:block"
        />
      </div>
    </div>,
    document.body,
  )
}
