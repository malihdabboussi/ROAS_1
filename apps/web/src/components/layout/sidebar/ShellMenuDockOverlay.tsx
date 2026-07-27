'use client'

import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { cn } from '@/lib/utils/cn'

const docks = ['left', 'right', 'top', 'bottom'] as const

export function ShellMenuDockOverlay() {
  const dragging = useShellMenuDock((state) => state.dragging)
  const candidate = useShellMenuDock((state) => state.candidate)
  const pointerX = useShellMenuDock((state) => state.pointerX)
  const pointerY = useShellMenuDock((state) => state.pointerY)

  if (!dragging || typeof document === 'undefined') return null

  const overlayStyle = {
    '--shell-menu-dock-x': `${pointerX}px`,
    '--shell-menu-dock-y': `${pointerY}px`,
  } as CSSProperties

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
