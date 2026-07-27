'use client'

import type { ReactNode } from 'react'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { ShellSidebarSlot, ShellSidebarSlotProvider } from './ShellSidebarSlot'
import { ShellTopBar } from './ShellTopBar'
import { useShellMenuDock } from './use-shell-menu-dock'
import { useShellPrefsHydrated } from './use-shell-prefs-hydrated'

export function ShellMenuDockLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode
  children: ReactNode
}) {
  const hydrated = useShellPrefsHydrated()
  const desktop = useMediaQuery('(min-width: 768px)')
  const savedDock = useShellMenuDock((state) => state.dock)
  const workHostAvailable = useShellMenuDock((state) => state.workHostAvailable)
  const dock = hydrated && desktop ? savedDock : 'left'
  // Prefer work-card mount when available; otherwise keep HQ on frame left.
  const resolvedFrameDock = dock === 'work' ? (workHostAvailable ? null : 'left') : dock
  const horizontal = resolvedFrameDock === 'top' || resolvedFrameDock === 'bottom'
  const frameAttr = dock === 'work' && workHostAvailable ? 'work' : (resolvedFrameDock ?? 'left')

  return (
    <ShellSidebarSlotProvider sidebar={sidebar}>
      <div className="shell-menu-dock-frame" data-shell-menu-dock={frameAttr}>
        {resolvedFrameDock === 'top' ? <ShellSidebarSlot /> : null}
        <ShellTopBar />
        <div className="shell-menu-dock-body">
          {resolvedFrameDock === 'left' ? <ShellSidebarSlot /> : null}
          <main className="shell-menu-dock-content">{children}</main>
          {resolvedFrameDock === 'right' ? <ShellSidebarSlot /> : null}
        </div>
        {resolvedFrameDock === 'bottom' ? <ShellSidebarSlot /> : null}
        {horizontal ? <span className="sr-only">Menu docked {resolvedFrameDock}</span> : null}
        {dock === 'work' && workHostAvailable ? (
          <span className="sr-only">Menu docked to work card</span>
        ) : null}
      </div>
    </ShellSidebarSlotProvider>
  )
}
