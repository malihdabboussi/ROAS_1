'use client'

import { Suspense, type ReactNode } from 'react'
import { ShellMenuDockLayout } from '@/components/shell/ShellMenuDockLayout'
import { ShellOpenInProvider } from '@/components/shell/ShellOpenInProvider'

function DashboardFrameInner({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <ShellOpenInProvider>
      <ShellMenuDockLayout sidebar={sidebar}>{children}</ShellMenuDockLayout>
    </ShellOpenInProvider>
  )
}

/**
 * Full-width top bar above sidebar + main (T-junction).
 * Sidebar stretches under the top bar — never overlays it.
 */
export function DashboardFrame({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="shell-menu-dock-frame">
          <div className="shell-topbar" />
          <div className="shell-menu-dock-body">
            {sidebar}
            <main className="shell-menu-dock-content">{children}</main>
          </div>
        </div>
      }
    >
      <DashboardFrameInner sidebar={sidebar}>{children}</DashboardFrameInner>
    </Suspense>
  )
}
