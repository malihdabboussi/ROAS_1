'use client'

import type { ReactNode } from 'react'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
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
  const dock = hydrated && desktop ? savedDock : 'left'
  const horizontal = dock === 'top' || dock === 'bottom'

  return (
    <div className="shell-menu-dock-frame" data-shell-menu-dock={dock}>
      {dock === 'top' ? sidebar : null}
      <ShellTopBar />
      <div className="shell-menu-dock-body">
        {dock === 'left' ? sidebar : null}
        <main className="shell-menu-dock-content">{children}</main>
        {dock === 'right' ? sidebar : null}
      </div>
      {dock === 'bottom' ? sidebar : null}
      {horizontal ? <span className="sr-only">Menu docked {dock}</span> : null}
    </div>
  )
}
