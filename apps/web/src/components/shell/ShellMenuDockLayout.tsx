'use client'

import type { ReactNode } from 'react'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { ShellMenuDockDragController } from './ShellMenuDockDragController'
import { ShellSidebarSlot, ShellSidebarSlotProvider } from './ShellSidebarSlot'
import { ShellTopBar } from './ShellTopBar'
import {
  isWorkAttachedDock,
  resolveShellMenuDockForLayout,
  useActiveShellMenuDock,
  useShellMenuDock,
} from './use-shell-menu-dock'
import { useShellPrefsHydrated } from './use-shell-prefs-hydrated'
import { useShellStore } from './use-shell-store'

export function ShellMenuDockLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode
  children: ReactNode
}) {
  const hydrated = useShellPrefsHydrated()
  const desktop = useMediaQuery('(min-width: 768px)')
  const activeDock = useActiveShellMenuDock()
  const dragging = useShellMenuDock((state) => state.dragging)
  const menuStyle = useShellMenuDock((state) => state.menuStyle)
  const workCardHostAvailable = useShellMenuDock((state) => state.workCardHostAvailable)
  const workCollapsedHostAvailable = useShellMenuDock((state) => state.workCollapsedHostAvailable)
  const chatOpen = useShellStore((state) => state.chatDrawer.open)
  const rawDock = hydrated && desktop ? activeDock : 'left'
  const workHostAvailable = workCardHostAvailable || workCollapsedHostAvailable
  // Remap frame-left onto the work card only when chat is closed and the work card can host.
  const dock =
    menuStyle === 'simple'
      ? 'left'
      : resolveShellMenuDockForLayout(rawDock, {
          chatOpen,
          workHostAvailable: workCardHostAvailable,
        })
  const workAttached = isWorkAttachedDock(dock)
  const hostedOnWork = workAttached && workHostAvailable
  // Frame only hosts far-left (or fallback when work cannot host).
  const resolvedFrameDock = !desktop
    ? null
    : !hydrated
      ? 'left'
      : dock === 'left'
        ? 'left'
        : workAttached && !hostedOnWork
          ? 'left'
          : null
  const frameAttr = hostedOnWork ? dock : (resolvedFrameDock ?? 'left')

  return (
    <ShellSidebarSlotProvider sidebar={sidebar}>
      <ShellMenuDockDragController />
      <div
        className="shell-menu-dock-frame"
        data-shell-menu-dock={frameAttr}
        data-shell-menu-dock-dragging={dragging ? 'true' : undefined}
      >
        {menuStyle === 'simple' && resolvedFrameDock === 'left' ? (
          <div className="shell-menu-dock-body">
            <ShellSidebarSlot />
            <main className="shell-menu-dock-content">{children}</main>
          </div>
        ) : (
          <>
            {menuStyle !== 'simple' ? <ShellTopBar /> : null}
            <div className="shell-menu-dock-body">
              {resolvedFrameDock === 'left' ? <ShellSidebarSlot /> : null}
              <main className="shell-menu-dock-content">{children}</main>
            </div>
          </>
        )}
        {dock === 'left' ? <span className="sr-only">Menu docked left of chat</span> : null}
        {hostedOnWork ? <span className="sr-only">Menu docked on work card</span> : null}
      </div>
    </ShellSidebarSlotProvider>
  )
}
