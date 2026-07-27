'use client'

import type { ReactNode } from 'react'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { ShellSidebarSlot, ShellSidebarSlotProvider } from './ShellSidebarSlot'
import { ShellTopBar } from './ShellTopBar'
import { isWorkAttachedDock, useShellMenuDock } from './use-shell-menu-dock'
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
  const workCardHostAvailable = useShellMenuDock((state) => state.workCardHostAvailable)
  const workCollapsedHostAvailable = useShellMenuDock((state) => state.workCollapsedHostAvailable)
  const dock = hydrated && desktop ? savedDock : 'left'
  const workAttached = isWorkAttachedDock(dock)
  const hostedOnWork = workAttached && (workCardHostAvailable || workCollapsedHostAvailable)
  // Frame only hosts far-left (or fallback when work cannot host).
  const resolvedFrameDock =
    !desktop || !hydrated
      ? 'left'
      : dock === 'left'
        ? 'left'
        : workAttached && !hostedOnWork
          ? 'left'
          : null
  const frameAttr = hostedOnWork ? dock : (resolvedFrameDock ?? 'left')

  return (
    <ShellSidebarSlotProvider sidebar={sidebar}>
      <div className="shell-menu-dock-frame" data-shell-menu-dock={frameAttr}>
        <ShellTopBar />
        <div className="shell-menu-dock-body">
          {resolvedFrameDock === 'left' ? <ShellSidebarSlot /> : null}
          <main className="shell-menu-dock-content">{children}</main>
        </div>
        {dock === 'left' ? <span className="sr-only">Menu docked left of chat</span> : null}
        {hostedOnWork ? <span className="sr-only">Menu docked on work card</span> : null}
      </div>
    </ShellSidebarSlotProvider>
  )
}
