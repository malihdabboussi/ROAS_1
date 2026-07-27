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

const ALL_DOCKS: ShellMenuDock[] = ['left', 'work', 'work-top', 'work-bottom', 'work-right']

export function ShellMenuDockOverlay() {
  const dragging = useShellMenuDock((state) => state.dragging)
  const candidate = useShellMenuDock((state) => state.candidate)
  const pointerX = useShellMenuDock((state) => state.pointerX)
  const pointerY = useShellMenuDock((state) => state.pointerY)
  const menuCompact = useShellMenuDock((state) => state.menuCompact)
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
          '--shell-menu-dock-work-right': `${workRect.right}px`,
          '--shell-menu-dock-work-bottom': `${workRect.bottom}px`,
          '--shell-menu-dock-work-width': `${workRect.width}px`,
          '--shell-menu-dock-work-height': `${workRect.height}px`,
          '--shell-menu-dock-work-band-x': `${Math.min(120, Math.max(48, workRect.width * 0.28))}px`,
          '--shell-menu-dock-work-band-y': `${Math.min(120, Math.max(48, workRect.height * 0.28))}px`,
        }
      : {}),
  } as CSSProperties

  const docks: ShellMenuDock[] = workRect
    ? ALL_DOCKS
    : (['left', 'work-right', 'work-top', 'work-bottom'] as ShellMenuDock[])

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
      <div
        className={cn(
          'shell-menu-dock-lifted',
          menuCompact ? 'shell-menu-dock-lifted-logo' : 'shell-menu-dock-lifted-rail',
        )}
      >
        <img src="/Logos/roas/icon-black.png" alt="" draggable={false} className="dark:hidden" />
        <img
          src="/Logos/roas/icon-white.png"
          alt=""
          draggable={false}
          className="hidden dark:block"
        />
        {!menuCompact ? (
          <div className="shell-menu-dock-lifted-rail-dots" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
